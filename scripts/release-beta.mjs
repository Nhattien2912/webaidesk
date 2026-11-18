#!/usr/bin/env node
// AI DESK — ONE-COMMAND BETA RELEASE PIPELINE V1
//
//   node scripts/release-beta.mjs 0.5.0-beta.3 [--target production|staging]           dry-run (default): NO remote writes
//   node scripts/release-beta.mjs 0.5.0-beta.3 --target <t> --release                   release: typed Owner gate per step
//   node scripts/release-beta.mjs 0.5.0-beta.3 --target <t> --verify-only               re-run POST-RELEASE checks (read-only)
//   node scripts/release-beta.mjs 0.5.0-beta.3 --target <t> --reconcile                 resolve "started" steps from real state
//   node scripts/release-beta.mjs 0.5.0-beta.3 --target <t> --clear-uncertain <step>    Owner-gated: forget an unknown step
//
//          --target            REQUIRED for every mode that can change something. production = webaidesk / aidesk-releases /
//                              server/releaseData.ts / "release-*" keys; staging = webaidesk-staging / aidesk-releases-staging /
//                              server/releaseDataStaging.ts / "staging-*" keys. The app's COMPILED target must match.
// Options: --artifacts <dir>   default C:\Users\clubb\Desktop\AI-Desk-builds\v<version> (Setup.exe, .blockmap, latest.yml)
//          --unpacked <dir>    win-unpacked of the SAME build (default <AI-Desk-builds>\stage-<version>\dist\win-unpacked)
//          --key <pem>         Ed25519 release private key (default C:\Users\clubb\AiDeskKeys\release-2026a.pem; never printed)
//          --key-id <id>       default release-2026a
//          --backend aws|rclone|wrangler   R2 upload tool (default: aws, then rclone if configured, else wrangler)
//          --offline           dry-run without any network read (feed / R2 HEAD)
//
// Stages: PREFLIGHT → BUILD (verify the built artifacts) → VERIFY (hashes, Ed25519, plan) → [gate UPLOAD] UPLOAD →
//         [gate PUBLISH] PUBLISH (components.json, releaseData.ts, npm run check, PREVIEW deploy + endpoint check) →
//         [gate PROMOTE] production deploy → POST-RELEASE verification (PASS/FAIL).
//
// Safety rules (see docs/RELEASE_BETA_PIPELINE.md):
//  * Owner gates are typed phrases bound to version + installer hash, read from an interactive TTY only. There is no
//    --yes / env bypass; piped or worker-provided input is refused.
//  * Never stash / reset / checkout / merge / commit. Release mode refuses a dirty working tree (the deploy builds from it).
//  * Fail closed: wrong version, hash, size, blockmap, missing/unknown key, key ≠ the key compiled into the app, bad
//    signature, duplicate or downgrade version → stop before any remote write.
//  * Immutable R2 keys: never overwrite; identical existing objects are reused; incomplete multipart uploads are only
//    REPORTED (never resumed or aborted).
//  * A checkpoint journal (%LOCALAPPDATA%\aidesk-release\state) makes a rerun reconcile the real remote state first; an
//    operation whose outcome is unknown (deploy started, no result) is never retried automatically.
//  * The private key is only loaded into a KeyObject; its bytes/PEM never reach logs, artifacts or the journal.
import { createHash, createPrivateKey, createPublicKey } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, openSync, readSync, closeSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createInterface } from 'node:readline'
import { addStagedRecord, applyTransition, inspectBuild, parseLatestYml, readReleaseFile, RELEASES_FILE, writeReleaseFile } from './release.mjs'
import { applyComponentTransition, buildPayload, componentRecord, signPayload, verifyEnvelope } from './release-components.mjs'
import { checkCatalog, compareSemver, currentRelease, UPDATE_FEED_POLICY } from '../server/releaseRecords.ts'
import { checkComponents, componentsKey, currentComponents } from '../server/componentRecords.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const DEFAULTS = Object.freeze({
  channel: 'beta',
  buildsRoot: 'C:/Users/clubb/Desktop/AI-Desk-builds',
  expiresDays: 30,
  r2PublicBase: 'https://pub-afeeb98d61ba4ab4b97137b6b1bdf3c0.r2.dev', // production bucket's public base (dry-run peek only)
})
/** Public keys of the PRODUCTION release key(s): a staging signer must never be one of them (and vice versa by prefix). */
export const KNOWN_PRODUCTION_SPKIS = Object.freeze(['MCowBQYDK2VwAyEA1UAIjfSBC+mOrDsBTcNE20C0cuAJcmIEmPDLS2hHhfo='])
/** Everything that differs between the two environments lives here — nothing else in the script names a host or bucket. */
export const TARGETS = Object.freeze({
  production: Object.freeze({
    name: 'production', feedOrigin: 'https://webaidesk.pages.dev', pagesProject: 'webaidesk', productionBranch: 'main', previewHost: 'webaidesk.pages.dev',
    bucket: 'aidesk-releases', releasesFile: RELEASES_FILE, keyIdPrefix: 'release-', defaultKeyId: 'release-2026a', defaultKeyPath: 'C:/Users/clubb/AiDeskKeys/release-2026a.pem',
    r2PublicBase: DEFAULTS.r2PublicBase, checksDownloadPage: true,
  }),
  staging: Object.freeze({
    name: 'staging', feedOrigin: 'https://webaidesk-staging.pages.dev', pagesProject: 'webaidesk-staging', productionBranch: 'main', previewHost: 'webaidesk-staging.pages.dev',
    bucket: 'aidesk-releases-staging', releasesFile: join(ROOT, 'server', 'releaseDataStaging.ts'), keyIdPrefix: 'staging-', defaultKeyId: 'staging-2026a', defaultKeyPath: 'C:/Users/clubb/AiDeskKeys/staging-2026a.pem',
    r2PublicBase: null, checksDownloadPage: false,
  }),
})

/** --target is mandatory whenever something can change; a dry-run without it previews production. Unknown → refused. */
export function resolveTarget(o, mode) {
  const t = o.target
  if (t === undefined || t === true) {
    if (mode !== 'dry-run') throw new ReleaseError('PREFLIGHT', `--target production|staging is required for ${mode} (no default for anything that can change state)`)
    return TARGETS.production
  }
  const target = TARGETS[String(t).toLowerCase()]
  if (!target) throw new ReleaseError('PREFLIGHT', `unknown --target "${String(t).slice(0, 20)}" (production|staging)`)
  return target
}
const BETA_VERSION = /^\d+\.\d+\.\d+-beta\.\d+$/

export class ReleaseError extends Error {
  constructor(stage, problems) {
    const list = Array.isArray(problems) ? problems : [problems]
    super(`${stage} FAILED:\n - ${list.join('\n - ')}`)
    this.stage = stage
    this.problems = list
  }
}
const sha256 = (b) => createHash('sha256').update(b).digest('hex')

// ---------------------------------------------------------------- CLI args

export function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) out[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true
    else out._.push(a)
  }
  return out
}

// ---------------------------------------------------------------- asar (read-only, minimal: Chromium pickle header + JSON index)

/** Reads the named files out of an asar archive and closes it. Returns { [name]: Buffer | null }. */
export function readAsarFiles(file, names) {
  const fd = openSync(file, 'r')
  try {
    const head = Buffer.alloc(16)
    readSync(fd, head, 0, 16, 0)
    const headerSize = head.readUInt32LE(4)
    const jsonLen = head.readUInt32LE(12)
    if (headerSize <= 0 || jsonLen <= 0 || jsonLen > headerSize) throw new Error('not an asar archive')
    const json = Buffer.alloc(jsonLen)
    readSync(fd, json, 0, jsonLen, 16)
    const index = JSON.parse(json.toString('utf8'))
    const base = 8 + headerSize
    const out = {}
    for (const name of names) {
      let node = index
      for (const part of name.split('/')) node = node?.files?.[part]
      if (!node || node.files || node.unpacked || typeof node.size !== 'number') {
        out[name] = null
        continue
      }
      const buf = Buffer.alloc(node.size)
      readSync(fd, buf, 0, node.size, base + Number(node.offset))
      out[name] = buf
    }
    return out
  } finally {
    closeSync(fd)
  }
}

/** What the packaged app really contains: version, compiled release-feed keys, Authenticode publisher expectation. */
export function inspectUnpacked(unpackedDir) {
  const asarPath = join(unpackedDir, 'resources', 'app.asar')
  if (!existsSync(asarPath)) throw new Error(`missing ${asarPath}`)
  const { 'package.json': pkg, 'out/main/index.js': main } = readAsarFiles(asarPath, ['package.json', 'out/main/index.js'])
  if (!pkg || !main) throw new Error('app.asar lacks package.json or out/main/index.js')
  const bundle = main.toString('utf8')
  const feedKeys = [...bundle.matchAll(/([A-Za-z0-9._-]{1,64}):(MCowBQYDK2VwAyEA[A-Za-z0-9+/]{43}=)/g)].map((m) => ({ keyId: m[1], spki: m[2] }))
  const appUpdate = existsSync(join(unpackedDir, 'resources', 'app-update.yml')) ? readFileSync(join(unpackedDir, 'resources', 'app-update.yml'), 'utf8') : ''
  return {
    version: JSON.parse(pkg.toString('utf8')).version,
    feedKeys,
    publisherName: /^publisherName:/m.test(appUpdate) ? 'set' : null,
    bugReportEndpoint: bundle.includes('https://webaidesk.pages.dev/api/bug-report'),
    appTarget: detectAppTarget(bundle),
  }
}

/**
 * Update target COMPILED into the app: the `__UPDATE_TARGET__` define (AI Desk ≥ the staging-target change) or, for older
 * builds (≤ 0.5.0-beta.3), the hard-coded production feed URL. null = cannot tell → refused by verifyBuild.
 */
export function detectAppTarget(bundle) {
  const m = /define_UPDATE_TARGET_default\s*=\s*\{\s*target:\s*"(production|staging)",\s*feedOrigin:\s*"(https:\/\/[^"]+)"/.exec(bundle)
  if (m) return { target: m[1], feedOrigin: m[2], legacy: false }
  if (bundle.includes('https://webaidesk.pages.dev/api/updates')) return { target: 'production', feedOrigin: 'https://webaidesk.pages.dev', legacy: true }
  return null
}

// ---------------------------------------------------------------- signing key (never logged)

export function loadSigningKey({ keyPath, keyId, expectedSpki, target }) {
  if (target && !String(keyId).startsWith(target.keyIdPrefix)) throw new ReleaseError('VERIFY', `key id ${keyId} is not a ${target.name} key ("${target.keyIdPrefix}*") — refusing to sign for the wrong environment`)
  if (!keyPath || !existsSync(keyPath)) throw new ReleaseError('VERIFY', `release signing key not found (${keyPath ? 'path given does not exist' : 'no --key'}); refusing to sign`)
  let privateKey
  try {
    privateKey = createPrivateKey(readFileSync(keyPath))
  } catch {
    throw new ReleaseError('VERIFY', 'release signing key is unreadable or not a private key')
  }
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new ReleaseError('VERIFY', 'release signing key is not Ed25519')
  const spki = createPublicKey(privateKey).export({ type: 'spki', format: 'der' }).toString('base64')
  if (expectedSpki && spki !== expectedSpki) throw new ReleaseError('VERIFY', `signing key ≠ public key ${keyId} compiled into the app (the app would refuse the manifest)`)
  if (target?.name === 'staging' && KNOWN_PRODUCTION_SPKIS.includes(spki)) throw new ReleaseError('VERIFY', 'the staging signer is the PRODUCTION release key — refusing (staging must use its own key)')
  return { privateKey, keyId, spki }
}

// ---------------------------------------------------------------- PREFLIGHT

/** Version policy + repository state. Pure over its inputs (git and feed are injected). */
/**
 * `ownWrite` = server/releaseData.ts is byte-identical to what THIS pipeline wrote for this version in an interrupted run
 * (journal sha256). Only then may a "published" record that is not live yet be resumed; anything else published is a
 * duplicate and refused.
 */
export function preflight({ version, channel, releaseFile, git, liveFeedVersion, mode, ownWrite = false }) {
  const problems = []
  const warnings = []
  if (channel !== 'beta') problems.push(`this pipeline releases the beta channel only (got ${channel})`)
  if (!BETA_VERSION.test(version)) problems.push(`version must look like x.y.z-beta.N (got ${version})`)
  const check = checkCatalog(releaseFile)
  if (check.errors.length) problems.push(...check.errors.map((e) => `releaseData.ts: ${e}`))
  const same = releaseFile.releases.find((r) => r.channel === channel && r.version === version)
  let resume = false
  if (same) {
    if (same.status === 'withdrawn') problems.push(`${channel}/${version} was withdrawn — never re-release a withdrawn version`)
    else if (same.status === 'published' && !(ownWrite && liveFeedVersion !== version)) problems.push(`${channel}/${version} is already published — refusing a duplicate release (bump the version)`)
    else resume = true // written by an interrupted run of this pipeline: reconciled against the journal + artifacts later
  }
  const others = { ...releaseFile, releases: releaseFile.releases.filter((r) => r !== same) }
  const feedCurrent = currentRelease(checkCatalog(others).valid, channel, UPDATE_FEED_POLICY)
  const newest = check.valid.filter((r) => r.channel === channel && r !== same).map((r) => r.version).sort(compareSemver).pop()
  if (BETA_VERSION.test(version)) {
    if (feedCurrent && compareSemver(version, feedCurrent.version) <= 0) problems.push(`downgrade/re-use refused: ${version} is not newer than the feed's current ${feedCurrent.version}`)
    if (newest && compareSemver(version, newest) <= 0) problems.push(`${version} is not newer than the existing record ${newest}`)
  }
  if (liveFeedVersion && feedCurrent && liveFeedVersion !== feedCurrent.version) warnings.push(`live feed serves ${liveFeedVersion} but releaseData.ts says ${feedCurrent.version} (undeployed change?)`)
  if (git.indexLock) problems.push('.git/index.lock exists — another git operation/session is running in this repository')
  const dirty = git.dirty.filter((f) => !(resume && f === 'server/releaseData.ts'))
  if (dirty.length) (mode === 'release' ? problems : warnings).push(`working tree not clean (${dirty.join(', ')}) — the deploy builds from it; commit or move that WIP first`)
  return { problems, warnings, resume, feedCurrent: feedCurrent?.version ?? null, branch: git.branch, head: git.head }
}

export function gitState(cwd = ROOT) {
  const run = (...a) => spawnSync('git', a, { cwd, encoding: 'utf8' })
  const branch = run('branch', '--show-current').stdout.trim()
  const head = run('rev-parse', 'HEAD').stdout.trim()
  const dirty = run('status', '--porcelain', '--untracked-files=no').stdout.split(/\r?\n/).filter(Boolean).map((l) => l.slice(3).trim())
  const gitDir = run('rev-parse', '--git-dir').stdout.trim()
  const worktrees = run('worktree', 'list').stdout.split(/\r?\n/).filter(Boolean)
  return { branch, head, dirty, indexLock: existsSync(resolve(cwd, gitDir, 'index.lock')), worktrees }
}

// ---------------------------------------------------------------- BUILD + VERIFY

/** Verifies the built artifacts and returns the staged record + the plan. Fail-closed. */
export async function verifyBuild({ version, channel, artifactsDir, unpackedDir, releaseFile, keyId, target = TARGETS.production, deps = {} }) {
  const problems = []
  const fileForInspect = { ...releaseFile, releases: releaseFile.releases.filter((r) => !(r.channel === channel && r.version === version)) }
  let built
  try {
    built = await inspectBuild({ dir: artifactsDir, channel, releaseFile: fileForInspect, deps: { hashFile: deps.hashFile, authenticode: deps.authenticode } })
  } catch (e) {
    throw new ReleaseError('BUILD', String(e.message).split('\n'))
  }
  const { record, localFiles } = built
  if (record.version !== version) problems.push(`latest.yml version ${record.version} ≠ requested ${version}`)
  const ymlText = readFileSync(join(artifactsDir, 'latest.yml'), 'utf8')
  const yml = parseLatestYml(ymlText)
  let app = null
  if (!unpackedDir || !existsSync(unpackedDir)) problems.push(`win-unpacked of this build not found (${unpackedDir ?? 'none'}) — cannot prove the app version / compiled release key`)
  else {
    const sibling = join(unpackedDir, '..', 'latest.yml')
    if (!existsSync(sibling) || readFileSync(sibling, 'utf8') !== ymlText) problems.push('win-unpacked does not belong to these artifacts (its dist/latest.yml differs)')
    try {
      app = (deps.inspectUnpacked ?? inspectUnpacked)(unpackedDir)
      if (app.version !== version) problems.push(`app.asar package.json version ${app.version} ≠ ${version}`)
      const key = app.feedKeys.find((k) => k.keyId === keyId)
      if (!key) problems.push(`release-feed key ${keyId} is NOT compiled into the app (it would stay check-only)`)
      if (record.signature !== 'signed' && app.publisherName) problems.push('unsigned installer but the app expects an Authenticode publisher (updates would be rejected)')
      // Wrong-environment guard: the app must have been BUILT for this target and carry only this target's keys.
      if (!app.appTarget) problems.push('cannot tell which update feed the app was built for — refusing')
      else if (app.appTarget.target !== target.name || app.appTarget.feedOrigin !== target.feedOrigin) problems.push(`the app was built for ${app.appTarget.target} (${app.appTarget.feedOrigin}), not for --target ${target.name} (${target.feedOrigin})`)
      const foreign = app.feedKeys.filter((k) => !k.keyId.startsWith(target.keyIdPrefix))
      if (foreign.length) problems.push(`the app carries keys of another environment (${foreign.map((k) => k.keyId).join(', ')}) — refusing`)
    } catch (e) {
      problems.push(`cannot read app.asar: ${e.message}`)
    }
  }
  if (problems.length) throw new ReleaseError('BUILD', problems)
  return { record, localFiles, yml, ymlText, app, expectedSpki: app.feedKeys.find((k) => k.keyId === keyId).spki }
}

/** Builds (in memory) the next releaseData + the signed components manifest; verifies the signature with the app's key. */
export function planPublication({ releaseFile, record, channel, signer, now = Date.now(), expiresDays = DEFAULTS.expiresDays, existingComponents }) {
  const problems = []
  let file = releaseFile.releases.some((r) => r.channel === channel && r.version === record.version) ? structuredClone(releaseFile) : addStagedRecord(releaseFile, record)
  const staged = file.releases.find((r) => r.channel === channel && r.version === record.version)
  if (staged.artifacts.installer.sha512 !== record.artifacts.installer.sha512) throw new ReleaseError('VERIFY', 'a staged record for this version exists with a DIFFERENT installer — refusing (keys are immutable)')
  if (!staged.approved) file = applyTransition(file, 'approve', record.version, channel, { feedOnly: record.signature !== 'signed' }).file
  if (staged.status !== 'published') file = applyTransition(file, 'publish', record.version, channel).file
  const comps = checkComponents(file.components ?? [])
  if (comps.errors.length) problems.push(...comps.errors)
  const mine = existingComponents ?? null // { sequence, text } from the journal of an interrupted run
  const sequence = mine?.sequence ?? Math.max(0, ...(file.components ?? []).filter((c) => c.channel === channel).map((c) => c.sequence)) + 1
  const desktop = { version: record.version, installer: { fileName: record.artifacts.installer.fileName, sha512: record.artifacts.installer.sha512, sizeBytes: record.artifacts.installer.sizeBytes } }
  const text = mine?.text ?? signPayload(buildPayload({ channel, sequence, desktop, expiresDays, now, signingKeyId: signer.keyId }), signer.privateKey, signer.keyId)
  const payload = verifyEnvelope(text, signer.keyId, signer.spki) // throws on a bad signature
  if (payload.channel !== channel || payload.sequence !== sequence) problems.push('signed manifest channel/sequence mismatch')
  if (payload.desktop?.version !== record.version || payload.desktop?.installer?.sha512 !== record.artifacts.installer.sha512) problems.push('signed manifest does not pin this installer (version / SHA-512)')
  if (Date.parse(payload.expiresAt) <= now) problems.push('signed manifest already expired — re-sign')
  const comp = componentRecord({ channel, sequence, manifestBytes: Buffer.from(text), packages: [] })
  const existingComp = (file.components ?? []).find((c) => c.channel === channel && c.sequence === sequence)
  if (existingComp && existingComp.manifest.sha256 !== comp.manifest.sha256) problems.push(`components ${channel}/${sequence} already exists with different bytes`)
  if (!existingComp) file = { ...file, components: [...(file.components ?? []), comp] }
  const after = file.components.find((c) => c.channel === channel && c.sequence === sequence)
  if (!after.approved) file = applyComponentTransition(file, 'approve', sequence, channel)
  if (file.components.find((c) => c.channel === channel && c.sequence === sequence).status !== 'published') file = applyComponentTransition(file, 'publish', sequence, channel)
  const check = checkCatalog(file)
  if (check.errors.length) problems.push(...check.errors)
  const feedAfter = currentRelease(check.valid, channel, UPDATE_FEED_POLICY)?.version
  if (feedAfter !== record.version) problems.push(`after publication the feed would serve ${feedAfter ?? 'nothing'}, not ${record.version}`)
  if (currentComponents(checkComponents(file.components).valid, channel)?.sequence !== sequence) problems.push('the new signed manifest would not be the current one')
  if (problems.length) throw new ReleaseError('VERIFY', problems)
  return { nextFile: file, components: { sequence, text, sha256: sha256(Buffer.from(text)), key: componentsKey(channel, sequence), record: comp, expiresAt: payload.expiresAt } }
}

// ---------------------------------------------------------------- checkpoint journal

export class Journal {
  constructor(path) {
    this.path = path
    this.data = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null
  }
  init(base) {
    this.data ??= { schema: 'aidesk-release-journal/1', ...base, uploads: {}, steps: {} }
    return this
  }
  step(name, value) {
    this.data.steps[name] = { ...value, at: new Date().toISOString() }
    this.save()
  }
  save() {
    mkdirSync(dirname(this.path), { recursive: true })
    const tmp = `${this.path}.tmp`
    writeFileSync(tmp, JSON.stringify(this.data, null, 2))
    renameSync(tmp, this.path)
  }
}
export const journalPath = (target, channel, version) => join(process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? '.', 'AppData', 'Local'), 'aidesk-release', 'state', `${target}-${channel}-${version}.json`)

/** Things an interrupted run left behind that must be checked before anything else happens. */
export function reconcileJournal(journal, { installerSha512 }) {
  const problems = []
  const d = journal.data
  if (!d) return { problems, uncertain: [] }
  if (d.installerSha512 && d.installerSha512 !== installerSha512) problems.push('the artifacts changed since the interrupted run (installer SHA-512 differs) — refusing to mix builds under immutable keys')
  const uncertain = Object.entries(d.steps).filter(([, v]) => v.state === 'started').map(([k]) => k)
  return { problems, uncertain }
}

// ---------------------------------------------------------------- UPLOAD (backends)

function has(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' })
  return r.status === 0
}

export function awsBackend({ accountId, profile = 'r2', bucket }) {
  if (!bucket) throw new ReleaseError('UPLOAD', 'no bucket')
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
  const aws = (args) => spawnSync('aws', args, { encoding: 'utf8' })
  return {
    name: 'aws',
    async head(key) {
      const r = aws(['s3api', 'head-object', '--bucket', bucket, '--key', key, '--endpoint-url', endpoint, '--profile', profile])
      if (r.status !== 0) return /Not Found|404/.test(r.stderr) ? null : Promise.reject(new Error(`head ${key}: ${r.stderr.slice(0, 200)}`))
      const j = JSON.parse(r.stdout)
      return { size: j.ContentLength, sha256: j.Metadata?.sha256 ?? null }
    },
    async put(step) {
      // Same flags as release.mjs uploadCommands(): sha256 metadata + never overwrite an immutable key.
      const r = aws(['s3api', 'put-object', '--bucket', bucket, '--key', step.key, '--body', step.path, '--content-type', step.contentType, '--metadata', `sha256=${step.ref.sha256}`, '--if-none-match', '*', '--endpoint-url', endpoint, '--profile', profile])
      if (r.status !== 0) throw new Error(`upload ${step.key} failed: ${r.stderr.slice(0, 200)}`)
    },
    async listMultipartUploads(prefix) {
      const r = aws(['s3api', 'list-multipart-uploads', '--bucket', bucket, '--prefix', prefix, '--endpoint-url', endpoint, '--profile', profile])
      if (r.status !== 0) return null
      return (JSON.parse(r.stdout || '{}').Uploads ?? []).map((u) => ({ key: u.Key, uploadId: u.UploadId, initiated: u.Initiated }))
    },
  }
}

export function rcloneBackend({ remote = 'r2', bucket }) {
  if (!bucket) throw new ReleaseError('UPLOAD', 'no bucket')
  const rc = (args) => spawnSync('rclone', args, { encoding: 'utf8' })
  const path = (key) => `${remote}:${bucket}/${key}`
  return {
    name: 'rclone',
    async head(key) {
      const r = rc(['lsjson', '--stat', '--metadata', path(key)])
      if (r.status !== 0) return /not found|doesn't exist|directory not found/i.test(r.stderr) ? null : Promise.reject(new Error(`head ${key}: ${r.stderr.slice(0, 200)}`))
      const j = JSON.parse(r.stdout)
      return { size: j.Size, sha256: j.Metadata?.sha256 ?? null }
    },
    async put(step) {
      const r = rc(['copyto', step.path, path(step.key), '--s3-no-check-bucket', '--immutable', '--header-upload', `x-amz-meta-sha256: ${step.ref.sha256}`, '--header-upload', `Content-Type: ${step.contentType}`])
      if (r.status !== 0) throw new Error(`upload ${step.key} failed: ${r.stderr.slice(0, 200)}`)
    },
    async listMultipartUploads(prefix) {
      const r = rc(['backend', 'list-multipart-uploads', `${remote}:${bucket}`])
      if (r.status !== 0) return null
      const all = JSON.parse(r.stdout || '{}')[bucket] ?? []
      return all.filter((u) => String(u.Key).startsWith(prefix)).map((u) => ({ key: u.Key, uploadId: u.UploadId, initiated: u.Initiated }))
    },
  }
}

/** Fallback: R2 binding through wrangler's remote proxy (logged-in wrangler account). Slow; cannot list multipart uploads. */
export async function wranglerBackend({ bucket, partBytes = 10 * 1024 * 1024 } = {}) {
  if (!bucket) throw new ReleaseError('UPLOAD', 'no bucket')
  const { createRequire } = await import('node:module')
  const req = createRequire(join(ROOT, 'package.json'))
  const { getPlatformProxy } = await import(pathToFileURL(req.resolve('wrangler')).href)
  const { mkdtempSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const cfg = join(mkdtempSync(join(tmpdir(), 'aidesk-release-')), 'wrangler.json')
  writeFileSync(cfg, JSON.stringify({ name: 'aidesk-release-beta', compatibility_date: '2026-10-19', r2_buckets: [{ binding: 'R', bucket_name: bucket, remote: true }] }))
  let proxy = null
  const env = async () => (proxy ??= await getPlatformProxy({ configPath: cfg, remoteBindings: true, persist: false })).env
  return {
    name: 'wrangler',
    async head(key) {
      const o = await (await env()).R.head(key)
      return o ? { size: o.size, sha256: o.customMetadata?.sha256 ?? null } : null
    },
    async put(step) {
      const R = (await env()).R
      const bytes = readFileSync(step.path)
      const meta = { httpMetadata: { contentType: step.contentType }, customMetadata: { sha256: step.ref.sha256 } }
      if (bytes.length <= partBytes) {
        if (!(await R.put(step.key, bytes, { ...meta, onlyIf: { etagDoesNotMatch: '*' } }))) throw new Error(`precondition failed (key appeared concurrently): ${step.key}`)
        return
      }
      const mpu = await R.createMultipartUpload(step.key, meta)
      try {
        const parts = []
        for (let off = 0, n = 1; off < bytes.length; off += partBytes, n++) {
          let part = null
          for (let attempt = 1; attempt <= 4 && !part; attempt++) {
            try {
              part = await mpu.uploadPart(n, bytes.subarray(off, Math.min(off + partBytes, bytes.length)))
            } catch (e) {
              if (attempt === 4) throw e
              await new Promise((r) => setTimeout(r, 5000 * attempt))
            }
          }
          parts.push(part)
          process.stdout.write(`    part ${n}/${Math.ceil(bytes.length / partBytes)} ok\n`)
        }
        await mpu.complete(parts)
      } catch (e) {
        await mpu.abort().catch(() => undefined) // our own just-created upload only
        throw e
      }
    },
    async listMultipartUploads() {
      return null // not possible through the binding
    },
    async dispose() {
      await proxy?.dispose()
    },
  }
}

export async function chooseBackend(o, target, env = process.env, probe = has) {
  const bucket = target.bucket
  const want = o.backend
  const accountId = env.AIDESK_R2_ACCOUNT_ID
  const awsReady = probe('aws') && /^[a-f0-9]{32}$/.test(accountId ?? '')
  const rcloneReady = probe('rclone') && !!env.AIDESK_RCLONE_REMOTE
  if (want === 'aws' || (!want && awsReady)) {
    if (!awsReady) throw new ReleaseError('UPLOAD', 'AWS CLI backend requested but `aws` or AIDESK_R2_ACCOUNT_ID (32 hex) is missing — configure it yourself (aws configure --profile r2)')
    return awsBackend({ accountId, profile: env.AIDESK_AWS_PROFILE ?? 'r2', bucket })
  }
  if (want === 'rclone' || (!want && rcloneReady)) {
    if (!rcloneReady) throw new ReleaseError('UPLOAD', 'rclone backend requested but `rclone` or AIDESK_RCLONE_REMOTE is missing')
    return rcloneBackend({ remote: env.AIDESK_RCLONE_REMOTE, bucket })
  }
  if (want && want !== 'wrangler') throw new ReleaseError('UPLOAD', `unknown backend ${want}`)
  return wranglerBackend({ bucket })
}

/** Upload plan in a safe order (installer, blockmap, latest.yml LAST). */
export function uploadPlan(record, localFiles) {
  const a = record.artifacts
  const refs = [a.installer, a.installer.blockmap, a.updateMetadata]
  return refs.map((ref) => ({ key: ref.r2Key, path: localFiles[ref.r2Key], ref, contentType: ref.r2Key.endsWith('.yml') ? 'text/yaml' : 'application/octet-stream' }))
}

/** Inspects remote state for every planned object: absent | identical | CONFLICT. Never writes. */
export async function remoteState(backend, steps) {
  const out = []
  for (const s of steps) {
    const h = await backend.head(s.key)
    out.push({ key: s.key, state: !h ? 'absent' : h.size === s.ref.sizeBytes && h.sha256 === s.ref.sha256 ? 'identical' : 'conflict', remote: h })
  }
  return out
}

export async function uploadArtifacts(backend, steps, journal, log = console.log) {
  for (const s of steps) {
    const h = await backend.head(s.key)
    if (h) {
      if (h.size === s.ref.sizeBytes && h.sha256 === s.ref.sha256) {
        log(`  = ${s.key} (already uploaded, identical)`)
        journal.data.uploads[s.key] = { state: 'done', reused: true }
        journal.save()
        continue
      }
      throw new ReleaseError('UPLOAD', `${s.key} exists with different content — immutable key, refusing to overwrite`)
    }
    journal.data.uploads[s.key] = { state: 'started' }
    journal.save()
    log(`  ↑ ${s.key} (${s.ref.sizeBytes} B)`)
    await backend.put(s)
    const v = await backend.head(s.key)
    if (!v || v.size !== s.ref.sizeBytes || v.sha256 !== s.ref.sha256) throw new ReleaseError('UPLOAD', `${s.key} failed verification after upload (size/sha256)`)
    journal.data.uploads[s.key] = { state: 'done' }
    journal.save()
  }
}

// ---------------------------------------------------------------- Owner gate

/**
 * The Owner types an exact phrase in an interactive terminal. Nothing else is accepted: no flag, no env, no piped stdin
 * (a worker/agent cannot "approve" by printing text into the pipeline's input).
 * `readLine` resolves `null` when the input ends (EOF, stdin closed or errored, terminal gone) — the gate fails closed.
 * Ctrl+C is left to Node's default SIGINT handling: the process exits before anything of the gated step starts.
 * `isTTY` is re-read on every prompt so a terminal that goes away mid-gate is noticed.
 */
export const terminalIo = () => {
  const reader = () => (stdinReader ??= lineReader(process.stdin))
  return {
    get isTTY() {
      return !!process.stdin.isTTY && !!process.stdout.isTTY
    },
    write: (s) => process.stdout.write(s),
    readLine: () => reader()(),
    drainStale: () => reader().drain(),
  }
}
let stdinReader = null

/** How long a gate keeps pulling already-buffered input after its prompt is shown; all of it counts as typed AHEAD. */
export const GATE_STALE_SETTLE_MS = 300

/**
 * ONE line reader for the whole process (not one per gate): lines that arrive together (a paste with several newlines)
 * are queued, never dropped. The input is paused while nobody waits (it does not keep the process alive). After the
 * input ends or errors every read resolves `null` at once.
 * `read.drain(ms)` = everything that was typed BEFORE now: it resumes the input for `ms` so data buffered by the OS /
 * console while the pipeline was busy (or before it started) is pulled in, and returns + removes all queued lines.
 */
export function lineReader(input) {
  const queue = []
  const waiters = []
  let ended = false
  let draining = false
  const rl = createInterface({ input, terminal: false })
  rl.pause()
  rl.on('line', (l) => {
    const w = waiters.shift()
    if (w) w(l)
    else queue.push(l)
    if (!waiters.length && !draining && !ended) rl.pause()
  })
  const end = () => {
    ended = true
    for (const w of waiters.splice(0)) w(null)
  }
  rl.on('close', end)
  rl.on('error', end) // readline re-emits input errors on the interface
  input.on('error', end)
  const read = () => {
    if (queue.length) return Promise.resolve(queue.shift())
    if (ended) return Promise.resolve(null)
    return new Promise((r) => {
      waiters.push(r)
      rl.resume()
    })
  }
  read.drain = async (ms = GATE_STALE_SETTLE_MS) => {
    if (!ended) {
      draining = true
      rl.resume()
      await new Promise((r) => setTimeout(r, ms))
      draining = false
      if (!waiters.length && !ended) rl.pause() // never touch a closed interface (EOF during the settle window)
    }
    return queue.splice(0)
  }
  return read
}

/** Consecutive blank lines tolerated at one gate before it fails closed (a stuck key / runaway input, never an approval). */
export const GATE_MAX_BLANK_LINES = 20

/**
 * One gate, one exact phrase, typed AFTER this gate opened. On opening, everything already buffered (typed or pasted ahead:
 * during a long step, before the pipeline started, or extra lines of a multi-line paste at an earlier gate) is drained:
 * blank lines in it are ignored, ANY non-empty line in it rejects the gate — even the correct phrase is never accepted from
 * the buffer, so one paste can never approve future gates. Then: blank / whitespace-only lines are skipped and the prompt
 * is shown again (bounded); any other non-matching line — including another gate's phrase — rejects immediately; input
 * end / lost TTY rejects. Surrounding whitespace (incl. a CR) is trimmed.
 */
export async function ownerGate({ name, phrase, summary, io }) {
  const t = io ?? terminalIo()
  t.write(`\n================ OWNER APPROVAL: ${name} ================\n${summary}\n\nType exactly:  ${phrase}\n> `)
  if (!t.isTTY) throw new ReleaseError(name, 'approval must be typed by the Owner in an interactive terminal (stdin/stdout are not a TTY) — nothing was done')
  const stale = t.drainStale ? await t.drainStale() : []
  if (stale.length > GATE_MAX_BLANK_LINES * 5) throw new ReleaseError(name, `${stale.length} lines were buffered before this gate opened — refusing (runaway input?) — nothing was done`)
  if (stale.some((l) => String(l).trim() !== '')) throw new ReleaseError(name, 'input typed BEFORE this gate opened (buffered / pasted ahead) is never an approval — nothing was done; rerun and type the phrase after the prompt appears')
  for (let blanks = 0; ; ) {
    if (!t.isTTY) throw new ReleaseError(name, 'approval must be typed by the Owner in an interactive terminal (stdin/stdout are not a TTY) — nothing was done')
    const answer = await t.readLine()
    if (answer === null || answer === undefined) throw new ReleaseError(name, 'input ended before the approval was typed (EOF / terminal closed) — nothing was done')
    const text = String(answer).trim()
    if (text === '') {
      if (++blanks > GATE_MAX_BLANK_LINES) throw new ReleaseError(name, `${GATE_MAX_BLANK_LINES} blank lines in a row — refusing (runaway input?) — nothing was done`)
      t.write(`  (blank line ignored — type the phrase above)\n> `)
      continue
    }
    if (text !== phrase) throw new ReleaseError(name, 'approval phrase did not match — nothing was done')
    return true
  }
}

// ---------------------------------------------------------------- network reads (read-only)

export async function fetchBytes(url, init) {
  const r = await fetch(url, { ...init, redirect: 'manual', cache: 'no-store' })
  return { status: r.status, headers: r.headers, body: Buffer.from(await r.arrayBuffer()) }
}

/**
 * Read-only GET with a bounded wait for NETWORK errors only (a fresh <hash>.pages.dev preview needs a few seconds of DNS).
 * Any HTTP response — including wrong content or 404/5xx — is returned at once and judged by the caller; nothing is ever
 * written, so this is not a retry of a state-changing step.
 */
export async function readWithRetry(get, url, init, { attempts = 6, delayMs = 10_000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let last
  for (let i = 1; i <= attempts; i++) {
    try {
      return await get(url, init)
    } catch (e) {
      last = e
      if (i < attempts) await sleep(delayMs)
    }
  }
  throw new ReleaseError('VERIFY-READ', `cannot reach ${url} after ${attempts} attempts (${String(last?.message ?? last).slice(0, 80)}) — read-only check, nothing was changed`)
}

/**
 * A brand-new Pages deployment can answer HTTP 404 for a few seconds after `wrangler pages deploy` returned (seen live:
 * preview d2430ec5 404 at once, 25/25 PASS minutes later). Used for the just-deployed PREVIEW only: a 404 is re-read
 * (bounded, read-only GET); any other answer — including a 200 with the WRONG content — is returned at once and judged.
 */
export async function readFreshDeployment(get, url, init, { attempts = 7, delayMs = 10_000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let res
  for (let i = 1; i <= attempts; i++) {
    res = await get(url, init)
    if (res.status !== 404) return res
    if (i < attempts) await sleep(delayMs)
  }
  return res
}

/**
 * Verifies a deployed feed (preview or production) serves EXACTLY this release. `freshDeployment` (preview only) adds the
 * bounded 404 wait of readFreshDeployment; production / post-release checks never pass it.
 */
export async function verifyFeed({ origin, channel, record, ymlText, components, signer, get: rawGet = fetchBytes, retry, freshDeployment }) {
  const problems = []
  const read = (url, init) => readWithRetry(rawGet, url, init, retry)
  const get = freshDeployment ? (url, init) => readFreshDeployment(read, url, init, freshDeployment) : read
  const yml = await get(`${origin}/api/updates/${channel}/latest.yml`)
  if (yml.status !== 200 || yml.body.toString('utf8') !== ymlText) problems.push(`latest.yml at ${origin} is not this release (HTTP ${yml.status})`)
  const comp = await get(`${origin}/api/updates/${channel}/components.json`)
  if (comp.status !== 200 || comp.body.toString('utf8') !== components.text) problems.push(`components.json at ${origin} is not the signed manifest ${components.sequence} (HTTP ${comp.status})`)
  else {
    try {
      const p = verifyEnvelope(comp.body.toString('utf8'), signer.keyId, signer.spki)
      if (p.desktop?.installer?.sha512 !== record.artifacts.installer.sha512) problems.push('served manifest does not pin this installer')
    } catch (e) {
      problems.push(`served manifest signature: ${e.message}`)
    }
  }
  const inst = await get(`${origin}/api/updates/${channel}/${record.artifacts.installer.fileName}`, { headers: { range: 'bytes=0-1023' } })
  if (inst.status !== 206 || inst.body.length !== 1024) problems.push(`installer not served with byte ranges at ${origin} (HTTP ${inst.status})`)
  return problems
}

// ---------------------------------------------------------------- orchestration

/** Atomic rewrite of a release data file (temp copy + rename): a crash can never leave a half-written catalog. */
export function writeReleaseFileAtomic(data, path) {
  const tmp = `${path}.release-beta.tmp`
  writeFileSync(tmp, readFileSync(path))
  writeReleaseFile(data, tmp)
  readReleaseFile(tmp) // parse back before replacing the real file
  renameSync(tmp, path)
}

/** Fingerprint of what `wrangler pages deploy dist-public` would upload (worker + index), to prove preview == production. */
export function distFingerprint(root = ROOT) {
  const h = createHash('sha256')
  for (const f of ['_worker.js', 'index.html', '_headers']) {
    const p = join(root, 'dist-public', f)
    h.update(f)
    h.update(existsSync(p) ? readFileSync(p) : Buffer.from('<missing>'))
  }
  return h.digest('hex')
}

/** Payload expiry of a signed manifest text (no signature check here — callers verify separately). */
const manifestExpiry = (text) => {
  try {
    return Date.parse(JSON.parse(Buffer.from(JSON.parse(text).payload, 'base64').toString('utf8')).expiresAt)
  } catch {
    return 0
  }
}

function summaryOf(ctx) {
  const r = ctx.record
  const t = ctx.target
  return [
    `TARGET         ${t.name.toUpperCase()}  — feed ${t.feedOrigin}  project ${t.pagesProject}  bucket ${t.bucket}  catalog ${t.releasesFile.replace(ROOT, '.')}`,
    `version        ${r.version} (${ctx.channel})   WedAiDesk ${ctx.pre.head.slice(0, 12)} on ${ctx.pre.branch}`,
    `installer      ${r.artifacts.installer.fileName}  ${r.artifacts.installer.sizeBytes} B`,
    `  sha256       ${r.artifacts.installer.sha256}`,
    `  sha512       ${r.artifacts.installer.sha512}`,
    `blockmap       ${r.artifacts.installer.blockmap.sizeBytes} B sha256 ${r.artifacts.installer.blockmap.sha256}`,
    `latest.yml     ${r.artifacts.updateMetadata.sizeBytes} B sha256 ${r.artifacts.updateMetadata.sha256}`,
    `trust          ${r.signature === 'signed' ? 'Authenticode + Ed25519' : 'feed-only (unsigned EXE, Ed25519 manifest)'}; app built for ${ctx.app.appTarget.target} ${ctx.app.appTarget.feedOrigin}${ctx.app.appTarget.legacy ? ' (legacy build)' : ''}; key ${ctx.keyId} compiled + signing key matches`,
    `R2             ${t.bucket}/releases/${ctx.channel}/${r.version}/ (immutable) via ${ctx.backendName ?? '(backend chosen at upload)'}`,
    `remote state   ${ctx.remote ? ctx.remote.map((x) => `${x.key.split('/').pop()}=${x.state}`).join(', ') : 'not checked'}`,
    `incomplete MPU ${ctx.mpu === undefined ? 'not checked' : ctx.mpu === null ? 'UNKNOWN (backend cannot list multipart uploads — check the R2 dashboard)' : ctx.mpu.length ? ctx.mpu.map((u) => `${u.key} (${u.uploadId})`).join('; ') + ' — left untouched' : 'none'}`,
    `manifest       components ${ctx.channel}/${ctx.plan.components.sequence} sha256 ${ctx.plan.components.sha256.slice(0, 16)}… expires ${ctx.plan.components.expiresAt}`,
    `feed target    ${t.feedOrigin}/api/updates/${ctx.channel}/  (now: ${ctx.live.ok ? ctx.live.version ?? 'no release' : 'not read'} → ${r.version})`,
  ].join('\n')
}

/** Banner shown before PROMOTE on the production target: this step reaches REAL users. Empty for staging. */
export function productionWarning(target, ctx) {
  if (target.name !== 'production') return ''
  const from = ctx.live?.ok ? ctx.live.version ?? 'no release' : 'unknown'
  return [
    '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    '!!  PRODUCTION RELEASE — AFFECTS REAL USERS',
    `!!  After this step ${target.feedOrigin}/api/updates/${ctx.channel}/ offers ${ctx.record.version} (currently ${from}).`,
    `!!  Every AI Desk install on the ${ctx.channel} channel will be offered this update automatically`,
    '!!  (download in the background; install after the user agrees or at a proven-safe point).',
    '!!  Rollback = sign a NEW manifest that withdraws this version + release.mjs withdraw + deploy.',
    '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    '',
  ].join('\n')
}

/** Live feed state. ok=false = could not be determined (network / 5xx / target_mismatch) — release mode refuses then. */
export async function readLiveFeed(origin, channel, get) {
  try {
    const r = await get(`${origin}/api/updates/${channel}/latest.yml`)
    if (r.status === 200) return { ok: true, version: parseLatestYml(r.body.toString('utf8')).version ?? null }
    if (r.status === 404) return { ok: true, version: null }
    return { ok: false, reason: `HTTP ${r.status}` }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e).slice(0, 120) }
  }
}

const MODES = ['release', 'verify-only', 'reconcile', 'clear-uncertain']

export async function run(argv, deps = {}) {
  const o = parseArgs(argv)
  const version = o._[0]
  const channel = DEFAULTS.channel
  const chosen = MODES.filter((m) => o[m] !== undefined)
  if (chosen.length > 1) throw new ReleaseError('PREFLIGHT', `choose one of --${MODES.join(' / --')}`)
  const mode = chosen[0] ?? 'dry-run'
  const log = deps.log ?? console.log
  if (!version) throw new ReleaseError('PREFLIGHT', 'usage: node scripts/release-beta.mjs <x.y.z-beta.N> --target production|staging [--release]')
  const target = resolveTarget(o, mode)
  const offline = o.offline === true
  if (offline && mode !== 'dry-run') throw new ReleaseError('PREFLIGHT', `--offline is only allowed for a dry-run (${mode} must read the real state)`)
  const artifactsDir = resolve(o.artifacts ?? join(DEFAULTS.buildsRoot, `v${version}`))
  const unpackedDir = resolve(o.unpacked ?? join(DEFAULTS.buildsRoot, `stage-${version}`, 'dist', 'win-unpacked'))
  const keyId = o['key-id'] ?? target.defaultKeyId
  const releasesFile = deps.releasesFile ?? target.releasesFile
  if (target.name === 'staging' && resolve(releasesFile) === resolve(RELEASES_FILE)) throw new ReleaseError('PREFLIGHT', 'staging must never write the production catalog')
  const releaseFile = readReleaseFile(releasesFile)
  const get = deps.fetch ?? fetchBytes
  const journal = new Journal(deps.journalPath ?? journalPath(target.name, channel, version))
  const io = deps.io

  log(`AI Desk beta release pipeline — ${version} — TARGET ${target.name.toUpperCase()} (${target.feedOrigin}) — mode ${mode.toUpperCase()}`)

  // ---- clear-uncertain: the ONLY way to forget a step with an unknown outcome (Owner-gated, local journal only)
  if (mode === 'clear-uncertain') {
    const step = typeof o['clear-uncertain'] === 'string' ? o['clear-uncertain'] : null
    if (!step || journal.data?.steps?.[step]?.state !== 'started') throw new ReleaseError('RECONCILE', `no uncertain step "${step}" in ${journal.path}`)
    await ownerGate({ name: 'CLEAR', phrase: `CLEAR ${step} ${target.name} ${version}`, summary: `Forget the unknown outcome of "${step}" (${target.name} ${version}). Only do this after checking the Cloudflare deployment list yourself.\nNothing remote is changed by this command.`, io })
    journal.data.steps[step] = { state: 'cleared-by-owner', at: new Date().toISOString() }
    journal.save()
    log(`cleared ${step}`)
    return { mode, ok: true }
  }

  // 1. PREFLIGHT
  const live = offline ? { ok: false, reason: 'offline' } : await readLiveFeed(target.feedOrigin, channel, get)
  if (mode !== 'dry-run' && !live.ok) throw new ReleaseError('PREFLIGHT', `cannot read the live ${target.name} feed (${live.reason}) — refusing to act on an unknown state`)
  const git = (deps.gitState ?? gitState)()
  const ownWrite = !!journal.data?.steps?.releaseData?.sha256 && journal.data.steps.releaseData.sha256 === sha256(readFileSync(releasesFile))
  const liveFeedVersion = live.ok ? live.version : null
  const verifyOnly = mode === 'verify-only' || mode === 'reconcile'
  const pre = verifyOnly
    ? { problems: [], warnings: [], resume: true, feedCurrent: null, branch: git.branch, head: git.head }
    : preflight({ version, channel, releaseFile, git, liveFeedVersion, mode: mode === 'release' ? 'release' : 'dry-run', ownWrite })
  for (const w of pre.warnings) log(`  ! ${w}`)
  if (pre.problems.length) throw new ReleaseError('PREFLIGHT', pre.problems)
  log(`[1/7] PREFLIGHT ok — ${git.branch}@${String(git.head).slice(0, 12)}, live feed ${live.ok ? liveFeedVersion ?? 'no release' : `not read (${live.reason})`}${pre.resume ? ', resuming' : ''}`)

  // 2. BUILD
  const built = await verifyBuild({ version, channel, artifactsDir, unpackedDir, releaseFile, keyId, target, deps })
  log(`[2/7] BUILD ok — ${built.record.artifacts.installer.fileName}, app ${built.app.version} built for ${built.app.appTarget.target}, key ${keyId}, ${built.record.signature}`)

  // 3. VERIFY
  const rec = reconcileJournal(journal, { installerSha512: built.record.artifacts.installer.sha512 })
  if (rec.problems.length) throw new ReleaseError('VERIFY', rec.problems)
  const signer = loadSigningKey({ keyPath: o.key ?? target.defaultKeyPath, keyId, expectedSpki: built.expectedSpki, target })
  const now = deps.now?.() ?? Date.now()
  const backend = mode === 'release' || mode === 'dry-run' ? (deps.backend ?? (mode === 'release' ? await chooseBackend(o, target) : null)) : null
  try {
    // A journal manifest that expired may be re-signed ONLY if its immutable key was never uploaded.
    let existing = journal.data?.components ?? null
    if (existing && manifestExpiry(existing.text) <= now) {
      const key = componentsKey(channel, existing.sequence)
      const uploaded = backend ? await backend.head(key) : null
      if (uploaded || journal.data?.uploads?.[key]?.state === 'done') throw new ReleaseError('VERIFY', `the signed manifest ${channel}/${existing.sequence} from the interrupted run expired after it was uploaded — publish needs a NEW sequence (withdraw/clean up by hand)`)
      if (mode === 'release') {
        delete journal.data.components
        journal.save()
      }
      log(`  ! journal manifest ${channel}/${existing.sequence} expired and was never uploaded — re-signing`)
      existing = null
    }
    const plan = planPublication({ releaseFile, record: built.record, channel, signer, now, existingComponents: existing })
    log(`[3/7] VERIFY ok — SHA-512/size/blockmap match latest.yml, manifest ${channel}/${plan.components.sequence} signed + verified with the app's ${target.name} key`)
    const ctx = { channel, target, keyId, record: built.record, app: built.app, pre, plan, live, remote: null, mpu: undefined, backendName: backend?.name ?? null }

    // ---- verify-only / reconcile: read-only POST-RELEASE checks against the real feed
    if (verifyOnly) {
      const components = journal.data?.components ? { ...plan.components, text: journal.data.components.text, sequence: journal.data.components.sequence } : plan.components
      const problems = await verifyFeed({ origin: target.feedOrigin, channel, record: built.record, ymlText: built.ymlText, components, signer, get })
      if (mode === 'reconcile') {
        const uncertain = rec.uncertain
        if (!uncertain.length) log('nothing to reconcile')
        if (uncertain.includes('productionDeploy') && journal.data) {
          if (!problems.length) {
            journal.step('productionDeploy', { state: 'done', reconciled: true })
            journal.step('postRelease', { state: 'done', reconciled: true })
            log('productionDeploy reconciled: the live feed serves exactly this release → done')
          } else log(`productionDeploy stays UNCERTAIN — the live feed does not serve this release (${problems.join('; ')}). Check the deployment list; if it failed, run --clear-uncertain productionDeploy and then --release again.`)
        }
        if (uncertain.includes('previewDeploy')) log('previewDeploy stays UNCERTAIN — a preview URL cannot be recovered automatically; check the deployment list, then --clear-uncertain previewDeploy')
        return { mode, ok: true, problems, ctx }
      }
      if (journal.data) journal.step('postRelease', { state: problems.length ? 'failed' : 'done', problems, verifyOnly: true })
      if (problems.length) throw new ReleaseError('POST-RELEASE', problems)
      log(`POST-RELEASE PASS — ${target.feedOrigin}/api/updates/${channel}/ serves ${version}`)
      return { mode, ok: true, ctx }
    }

    if (mode === 'dry-run') {
      if (!offline && backend) {
        ctx.remote = await remoteState(backend, uploadPlan(built.record, built.localFiles))
        ctx.mpu = await backend.listMultipartUploads(`releases/${channel}/${version}/`)
      } else if (!offline && target.r2PublicBase) {
        ctx.remote = []
        for (const s of uploadPlan(built.record, built.localFiles)) {
          const h = await get(`${target.r2PublicBase}/${s.key}`, { method: 'HEAD' }).catch(() => null)
          ctx.remote.push({ key: s.key, state: h?.status === 200 ? (Number(h.headers.get('content-length')) === s.ref.sizeBytes ? 'present(size ok)' : 'CONFLICT(size)') : 'absent' })
        }
        ctx.mpu = null
      }
      log(`\n${summaryOf(ctx)}`)
      log(`\nDRY-RUN complete: nothing uploaded, signed manifest not stored, catalog unchanged, nothing deployed.`)
      if (rec.uncertain.length) log(`  ! an earlier run left uncertain steps: ${rec.uncertain.join(', ')} — use --reconcile`)
      return { mode, ok: true, ctx }
    }

    // ---------------- RELEASE MODE ----------------
    if (rec.uncertain.length) throw new ReleaseError('RECONCILE', `steps with unknown outcome from an earlier run: ${rec.uncertain.join(', ')} — run --reconcile (read-only) first; never retried blindly`)
    journal.init({ version, channel, target: target.name, installerSha512: built.record.artifacts.installer.sha512 })
    journal.save()
    const steps = uploadPlan(built.record, built.localFiles)
    ctx.remote = await remoteState(backend, steps)
    ctx.mpu = await backend.listMultipartUploads(`releases/${channel}/${version}/`)
    if (ctx.remote.some((x) => x.state === 'conflict')) throw new ReleaseError('UPLOAD', 'an immutable key already holds DIFFERENT content — bump the version')
    journal.data.components ??= { sequence: plan.components.sequence, text: plan.components.text } // same bytes on every rerun
    journal.save()
    const phraseHash = built.record.artifacts.installer.sha256.slice(0, 8)

    // 4. UPLOAD
    await ownerGate({ name: 'UPLOAD', phrase: `UPLOAD ${target.name} ${version} ${phraseHash}`, summary: summaryOf(ctx), io })
    await uploadArtifacts(backend, steps, journal, log)
    journal.step('upload', { state: 'done' })
    log(`[4/7] UPLOAD ok`)
    ctx.remote = await remoteState(backend, steps) // the PUBLISH summary shows the state AFTER the upload, not the stale pre-upload view

    // 5. PUBLISH — components.json, catalog, check, PREVIEW deploy + endpoint check
    await ownerGate({ name: 'PUBLISH', phrase: `PUBLISH ${target.name} ${version} seq${plan.components.sequence} ${phraseHash}`, summary: `${summaryOf(ctx)}\n\nNext: upload components.json, write ${target.releasesFile.replace(ROOT, '.')}, npm run check, deploy a PREVIEW of ${target.pagesProject} and verify it (its production untouched).`, io })
    const compPath = join(dirname(journal.path), `${target.name}-${channel}-${version}-components.json`)
    mkdirSync(dirname(compPath), { recursive: true })
    writeFileSync(compPath, plan.components.text)
    const compStep = { key: plan.components.key, path: compPath, ref: { sizeBytes: Buffer.byteLength(plan.components.text), sha256: plan.components.sha256 }, contentType: 'application/json' }
    await uploadArtifacts(backend, [compStep], journal, log)
    for (const s of [...steps, compStep]) {
      const h = await backend.head(s.key) // authoritative store state (staging buckets are private)
      if (!h || h.size !== s.ref.sizeBytes || h.sha256 !== s.ref.sha256) throw new ReleaseError('PUBLISH', `${s.key} is not in ${target.bucket} with the expected size/sha256 — not publishing`)
    }
    writeReleaseFileAtomic(plan.nextFile, releasesFile)
    journal.step('releaseData', { state: 'done', sha256: sha256(readFileSync(releasesFile)) })
    const exec = deps.exec ?? ((cmd, args) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' }))
    const check = exec('npm', ['run', 'check'])
    if (check.status !== 0) throw new ReleaseError('PUBLISH', 'npm run check failed — catalog written but NOTHING deployed (fix, then rerun)')
    const fingerprint = (deps.distFingerprint ?? distFingerprint)()
    journal.step('previewDeploy', { state: 'started', fingerprint })
    const branch = `release-${version.replace(/[^0-9a-z]+/gi, '-')}`
    const pv = exec('npx', ['wrangler', 'pages', 'deploy', 'dist-public', '--project-name', target.pagesProject, '--branch', branch])
    const urlRe = new RegExp(`https://[a-z0-9]+\\.${target.previewHost.replace(/\./g, '\\.')}`)
    const previewUrl = urlRe.exec(`${pv?.stdout ?? ''}${pv?.stderr ?? ''}`)?.[0]
    if (!pv || pv.status !== 0 || !previewUrl) throw new ReleaseError('PUBLISH', 'preview deploy failed or printed no URL — recorded as UNCERTAIN (run --reconcile)')
    journal.step('previewDeploy', { state: 'done', url: previewUrl, fingerprint })
    const pvProblems = await verifyFeed({ origin: previewUrl, channel, record: built.record, ymlText: built.ymlText, components: plan.components, signer, get, freshDeployment: deps.previewWait ?? {} })
    if (pvProblems.length) throw new ReleaseError('PUBLISH', [`preview ${previewUrl} does not serve this release:`, ...pvProblems])
    log(`[5/7] PUBLISH staged + preview verified at ${previewUrl}`)

    // 6. PROMOTE
    await ownerGate({ name: 'PROMOTE', phrase: `PROMOTE ${target.name} ${version} ${phraseHash}`, summary: `${productionWarning(target, ctx)}TARGET ${target.name.toUpperCase()}: preview ${previewUrl} serves ${version} (latest.yml + signed components.json + installer ranges verified).\nNext: deploy ${target.pagesProject} branch ${target.productionBranch} (dashboard bindings, no --config) → ${target.feedOrigin}.`, io })
    if ((deps.distFingerprint ?? distFingerprint)() !== fingerprint) throw new ReleaseError('PROMOTE', 'dist-public changed since the verified preview — refusing to deploy something that was not verified')
    journal.step('productionDeploy', { state: 'started' })
    const prod = exec('npx', ['wrangler', 'pages', 'deploy', 'dist-public', '--project-name', target.pagesProject, '--branch', target.productionBranch])
    if (!prod || prod.status !== 0) throw new ReleaseError('PROMOTE', 'production deploy failed — recorded as UNCERTAIN (run --reconcile; never retried blindly)')
    journal.step('productionDeploy', { state: 'done' })

    // 7. POST-RELEASE
    const postProblems = await verifyFeed({ origin: target.feedOrigin, channel, record: built.record, ymlText: built.ymlText, components: plan.components, signer, get })
    if (target.checksDownloadPage) {
      const dl = readFileSync(join(ROOT, 'src', 'lib', 'directDownload.ts'), 'utf8')
      const dlVersion = /versionLabel:\s*'([^']+)'/.exec(dl)?.[1]
      if (dlVersion !== version) log(`  ! website download button still offers ${dlVersion} (src/lib/directDownload.ts) — update it in a separate change`)
    }
    journal.step('postRelease', { state: postProblems.length ? 'failed' : 'done', problems: postProblems })
    if (postProblems.length) throw new ReleaseError('POST-RELEASE', [...postProblems, 'deploy is done; re-check later with --verify-only (CDN propagation)'])
    log(`[7/7] POST-RELEASE PASS — ${target.feedOrigin}/api/updates/${channel}/ serves ${version}; commit ${target.releasesFile.replace(ROOT, '.')} yourself.`)
    return { mode, ok: true, ctx }
  } finally {
    await backend?.dispose?.()
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).catch((e) => {
    console.error(`\n${e instanceof ReleaseError ? e.message : `ERROR: ${e.stack ?? e}`}`)
    process.exit(1)
  })
}
