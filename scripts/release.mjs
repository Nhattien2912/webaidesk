#!/usr/bin/env node
// AI Desk release pipeline: inspect → stage (upload + verify) → approve → publish → (withdraw).
//
// Everything is a DRY RUN unless you pass --execute (uploads) or --write (edits server/releaseData.ts).
// The update feed and the website only change when server/releaseData.ts is reviewed and deployed,
// so uploading never publishes anything by itself.
//
//   node scripts/release.mjs inspect  --dir <electron-builder output dir> [--portable <file.exe>]
//   node scripts/release.mjs stage    --dir <dir> [--portable <file.exe>] --account-id <id> [--aws-profile r2] [--execute] [--write]
//   node scripts/release.mjs approve  --version <semver> [--write]
//   node scripts/release.mjs publish  --version <semver> [--write]
//   node scripts/release.mjs withdraw --version <semver> [--write]      (rollback: previous published release becomes current)
//   node scripts/release.mjs status
//
// Requirements: Node >= 22.18 (imports the TypeScript record rules directly), PowerShell for the
// Authenticode check, and the AWS CLI with a profile YOU configure for R2 uploads. No credential is
// read, printed or stored by this script.

import { createHash } from 'node:crypto'
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { checkCatalog, currentRelease, immutableKey, UPDATE_METADATA_FILE, validateRecord } from '../server/releaseRecords.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const RELEASES_FILE = join(ROOT, 'server', 'releaseData.ts')
const BEGIN = '/* RELEASES:BEGIN */'
const END = '/* RELEASES:END */'

/** Reads the release data (JSON between the markers of server/releaseData.ts). */
export function readReleaseFile(path = RELEASES_FILE) {
  const text = readFileSync(path, 'utf8')
  const a = text.indexOf(BEGIN)
  const b = text.indexOf(END)
  if (a < 0 || b < a) throw new Error(`${path}: release data markers not found`)
  return JSON.parse(text.slice(a + BEGIN.length, b))
}

/** Rewrites only the JSON between the markers; the rest of the file is kept verbatim. */
export function writeReleaseFile(data, path = RELEASES_FILE) {
  const text = readFileSync(path, 'utf8')
  const a = text.indexOf(BEGIN)
  const b = text.indexOf(END)
  if (a < 0 || b < a) throw new Error(`${path}: release data markers not found`)
  writeFileSync(path, `${text.slice(0, a + BEGIN.length)} ${JSON.stringify(data, null, 2)} ${text.slice(b)}`)
}
const BUCKET = 'aidesk-releases'

// ---------------------------------------------------------------- latest.yml

/** Reads the fields electron-builder writes in latest.yml (top-level keys + first files[] entry). */
export function parseLatestYml(text) {
  const out = { files: [] }
  let current = null
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue
    const unquote = (v) => v.trim().replace(/^['"]|['"]$/g, '')
    const item = /^\s*-\s+(\w+):\s*(.*)$/.exec(raw)
    if (item) {
      current = { [item[1]]: unquote(item[2]) }
      out.files.push(current)
      continue
    }
    const nested = /^\s+(\w+):\s*(.*)$/.exec(raw)
    if (nested && current) {
      current[nested[1]] = unquote(nested[2])
      continue
    }
    const top = /^(\w+):\s*(.*)$/.exec(raw)
    if (top) {
      current = null
      if (top[2] !== '') out[top[1]] = unquote(top[2])
    }
  }
  for (const f of out.files) if (f.size !== undefined) f.size = Number(f.size)
  return out
}

// ---------------------------------------------------------------- hashing / signature

export function hashFile(file) {
  return new Promise((resolvePromise, reject) => {
    const s256 = createHash('sha256')
    const s512 = createHash('sha512')
    createReadStream(file)
      .on('data', (chunk) => {
        s256.update(chunk)
        s512.update(chunk)
      })
      .on('error', reject)
      .on('end', () => resolvePromise({ sha256: s256.digest('hex'), sha512: s512.digest('base64'), sizeBytes: statSync(file).size }))
  })
}

/** Authenticode check through PowerShell (read-only). Returns { status, signer }. */
export function authenticode(file) {
  const ps = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', `$s = Get-AuthenticodeSignature -LiteralPath '${file.replace(/'/g, "''")}'; @{ status = [string]$s.Status; signer = [string]$s.SignerCertificate.Subject } | ConvertTo-Json -Compress`],
    { encoding: 'utf8' },
  )
  if (ps.status !== 0) return { status: 'Unknown', signer: '' }
  try {
    return JSON.parse(ps.stdout)
  } catch {
    return { status: 'Unknown', signer: '' }
  }
}

// ---------------------------------------------------------------- inspect

/**
 * Validates one electron-builder output (latest.yml + installer + blockmap [+ portable]) and returns
 * the staged record it would create. Throws with every problem found (missing artifact, hash or size
 * mismatch, invalid version, duplicate version).
 */
export async function inspectBuild({ dir, portable, channel = 'stable', minOs = 'Windows 10/11 64-bit', releaseFile, deps = {} }) {
  const hash = deps.hashFile ?? hashFile
  const sign = deps.authenticode ?? authenticode
  const problems = []
  const ymlPath = join(dir, UPDATE_METADATA_FILE)
  if (!existsSync(ymlPath)) throw new Error(`missing ${UPDATE_METADATA_FILE} in ${dir} (enable "publish" in electron-builder so it is generated)`)
  const ymlText = readFileSync(ymlPath, 'utf8')
  const yml = parseLatestYml(ymlText)
  const file0 = yml.files[0]
  if (!yml.version) problems.push('latest.yml has no version')
  if (!file0?.url || !file0.sha512 || !file0.size) problems.push('latest.yml files[0] must have url, sha512 and size')
  if (file0 && (yml.path !== file0.url || yml.sha512 !== file0.sha512)) problems.push('latest.yml path/sha512 do not match files[0]')
  const installerPath = file0?.url ? join(dir, file0.url) : ''
  const blockmapPath = `${installerPath}.blockmap`
  if (!installerPath || !existsSync(installerPath)) problems.push(`missing installer ${file0?.url ?? '(none)'}`)
  if (!installerPath || !existsSync(blockmapPath)) problems.push(`missing blockmap ${file0?.url ?? ''}.blockmap`)
  if (portable && !existsSync(portable)) problems.push(`missing portable ${portable}`)
  if (problems.length) throw new Error(problems.join('\n'))

  const inst = await hash(installerPath)
  if (inst.sha512 !== file0.sha512) problems.push('installer SHA-512 does not match latest.yml')
  if (inst.sizeBytes !== file0.size) problems.push('installer size does not match latest.yml')
  const bm = await hash(blockmapPath)
  const meta = await hash(ymlPath)
  const port = portable ? await hash(portable) : null
  const sig = sign(installerPath)
  if (portable) {
    const psig = sign(portable)
    if (psig.status !== sig.status) problems.push(`portable signature (${psig.status}) differs from installer (${sig.status})`)
  }

  const version = yml.version
  const fileName = basename(installerPath)
  const record = {
    version,
    channel,
    releasedAt: yml.releaseDate ?? new Date().toISOString(),
    minOs,
    signature: sig.status === 'Valid' ? 'signed' : 'unsigned',
    ...(sig.status === 'Valid' && sig.signer ? { signer: sig.signer } : {}),
    status: 'staged',
    approved: false,
    artifacts: {
      installer: {
        fileName,
        r2Key: immutableKey(channel, version, fileName),
        sizeBytes: inst.sizeBytes,
        sha256: inst.sha256,
        sha512: inst.sha512,
        blockmap: { fileName: `${fileName}.blockmap`, r2Key: immutableKey(channel, version, `${fileName}.blockmap`), sizeBytes: bm.sizeBytes, sha256: bm.sha256 },
      },
      updateMetadata: { fileName: UPDATE_METADATA_FILE, r2Key: immutableKey(channel, version, UPDATE_METADATA_FILE), sizeBytes: meta.sizeBytes, sha256: meta.sha256 },
      ...(port
        ? { portable: { fileName: basename(portable), r2Key: immutableKey(channel, version, basename(portable)), sizeBytes: port.sizeBytes, sha256: port.sha256 } }
        : {}),
    },
  }
  problems.push(...validateRecord(record))
  const existing = releaseFile ?? readReleaseFile()
  if (existing.releases.some((r) => r.channel === channel && r.version === version)) problems.push(`version ${channel}/${version} already exists (keys are immutable; bump the version)`)
  if (problems.length) throw new Error(problems.join('\n'))

  const localFiles = {
    [record.artifacts.installer.r2Key]: installerPath,
    [record.artifacts.installer.blockmap.r2Key]: blockmapPath,
    ...(port ? { [record.artifacts.portable.r2Key]: portable } : {}),
    // latest.yml last: every artifact it points to is already uploaded and verified.
    [record.artifacts.updateMetadata.r2Key]: ymlPath,
  }
  return { record, localFiles, authenticode: sig }
}

// ---------------------------------------------------------------- transitions

/** Pure status transition on a release file. Returns { file, changes } or throws. */
export function applyTransition(file, op, version, channel = 'stable') {
  const next = structuredClone(file)
  const r = next.releases.find((x) => x.channel === channel && x.version === version)
  if (!r) throw new Error(`no release ${channel}/${version}`)
  if (op === 'approve') {
    if (r.status !== 'staged') throw new Error(`only staged releases can be approved (is ${r.status})`)
    if (r.signature !== 'signed') throw new Error('unsigned builds cannot be approved for public release')
    r.approved = true
  } else if (op === 'publish') {
    if (r.status !== 'staged') throw new Error(`only staged releases can be published (is ${r.status})`)
    if (!r.approved) throw new Error('approve before publishing')
    if (r.signature !== 'signed') throw new Error('unsigned builds cannot be published')
    r.status = 'published'
  } else if (op === 'withdraw') {
    if (r.status === 'withdrawn') throw new Error('already withdrawn')
    r.status = 'withdrawn'
  } else {
    throw new Error(`unknown operation ${op}`)
  }
  const check = checkCatalog(next)
  if (check.errors.length) throw new Error(`release file would be invalid:\n${check.errors.join('\n')}`)
  const before = currentRelease(checkCatalog(file).valid, channel)
  const after = currentRelease(check.valid, channel)
  return { file: next, changes: { currentBefore: before?.version ?? null, currentAfter: after?.version ?? null } }
}

export function addStagedRecord(file, record) {
  const next = structuredClone(file)
  next.releases.push(record)
  const check = checkCatalog(next)
  if (check.errors.length) throw new Error(`release file would be invalid:\n${check.errors.join('\n')}`)
  return next
}

// ---------------------------------------------------------------- upload

export function uploadCommands(localFiles, record, { accountId, awsProfile = 'r2' }) {
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
  const shaOf = {}
  const a = record.artifacts
  for (const ref of [a.installer, a.installer.blockmap, a.updateMetadata, ...(a.portable ? [a.portable] : [])]) shaOf[ref.r2Key] = ref
  return Object.entries(localFiles).map(([key, path]) => ({
    key,
    path,
    expect: shaOf[key],
    put: ['s3api', 'put-object', '--bucket', BUCKET, '--key', key, '--body', path,
      '--content-type', key.endsWith('.yml') ? 'text/yaml' : 'application/octet-stream',
      '--metadata', `sha256=${shaOf[key].sha256}`,
      // Never overwrite an immutable key.
      '--if-none-match', '*',
      '--endpoint-url', endpoint, '--profile', awsProfile],
    head: ['s3api', 'head-object', '--bucket', BUCKET, '--key', key, '--endpoint-url', endpoint, '--profile', awsProfile],
  }))
}

function runAws(args) {
  const r = spawnSync('aws', args, { encoding: 'utf8' })
  if (r.error) throw new Error('AWS CLI not available. Install it and run: aws configure --profile r2')
  return r
}

// ---------------------------------------------------------------- CLI

function args(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true
      out[key] = val
    } else out._.push(a)
  }
  return out
}

async function main() {
  const opts = args(process.argv.slice(2))
  const cmd = opts._[0]
  const channel = opts.channel ?? 'stable'
  const file = readReleaseFile()
  const save = (next) => {
    if (opts.write) {
      writeReleaseFile(next)
      console.log(`Wrote ${RELEASES_FILE}. Review the diff, then deploy to make it live.`)
    } else console.log('Dry run: releaseData.ts not changed (add --write).')
  }

  if (cmd === 'status') {
    const check = checkCatalog(file)
    console.log(JSON.stringify({ errors: check.errors, current: currentRelease(check.valid, channel)?.version ?? null, releases: file.releases.map((r) => `${r.channel}/${r.version} ${r.status} approved=${r.approved} ${r.signature}`) }, null, 2))
    return
  }
  if (cmd === 'inspect' || cmd === 'stage') {
    if (!opts.dir) throw new Error('--dir <electron-builder output directory> is required')
    const { record, localFiles, authenticode: sig } = await inspectBuild({ dir: resolve(opts.dir), portable: opts.portable && resolve(opts.portable), channel, releaseFile: file })
    console.log(`Authenticode: ${sig.status}${sig.signer ? ` (${sig.signer})` : ''}`)
    if (record.signature !== 'signed') console.log('WARNING: unsigned build. It can be staged for internal testing but never approved or published.')
    console.log(JSON.stringify(record, null, 2))
    if (cmd === 'inspect') return
    if (!opts['account-id'] || !/^[a-f0-9]{32}$/.test(opts['account-id'])) throw new Error('--account-id <32-char Cloudflare account id> is required')
    const plan = uploadCommands(localFiles, record, { accountId: opts['account-id'], awsProfile: opts['aws-profile'] ?? 'r2' })
    for (const step of plan) {
      console.log(`${opts.execute ? 'UPLOAD' : 'PLAN'} ${step.key} <- ${step.path}`)
      if (!opts.execute) continue
      const put = runAws(step.put)
      if (put.status !== 0) throw new Error(`upload failed for ${step.key} (exists already or permission denied)`)
      const head = runAws(step.head)
      const info = JSON.parse(head.stdout || '{}')
      if (info.ContentLength !== step.expect.sizeBytes || info.Metadata?.sha256 !== step.expect.sha256) throw new Error(`verification failed for ${step.key}`)
    }
    if (!opts.execute) {
      console.log('Dry run: nothing uploaded (add --execute).')
      return
    }
    save(addStagedRecord(file, record))
    return
  }
  if (cmd === 'approve' || cmd === 'publish' || cmd === 'withdraw') {
    if (!opts.version) throw new Error('--version is required')
    const { file: next, changes } = applyTransition(file, cmd, opts.version, channel)
    console.log(`${cmd} ${channel}/${opts.version}: current release ${changes.currentBefore ?? 'none'} -> ${changes.currentAfter ?? 'none'}`)
    save(next)
    return
  }
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 17).join('\n'))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`ERROR: ${e.message}`)
    process.exit(1)
  })
}
