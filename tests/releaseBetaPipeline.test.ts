// ONE-COMMAND BETA RELEASE PIPELINE V1 — offline tests. Everything remote is faked (git, network, R2, wrangler deploy,
// terminal): no test touches Cloudflare, the real catalogs or the real signing keys.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// @ts-expect-error plain ESM script without type declarations
import { DEFAULTS, TARGETS, readAsarFiles, run, preflight, ReleaseError, detectAppTarget, resolveTarget, writeReleaseFileAtomic, readWithRetry, ownerGate, GATE_MAX_BLANK_LINES, lineReader } from '../scripts/release-beta.mjs'
import { PassThrough } from 'node:stream'
import { immutableKey } from '../server/releaseRecords.ts'

const sha256 = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex')
const sha512b64 = (b: Uint8Array) => createHash('sha512').update(b).digest('base64')

/** Minimal asar writer (same layout electron/asar uses: pickle(headerSize) + pickle(json) + file data). */
function writeAsar(path: string, files: Record<string, Buffer>) {
  const index: { files: Record<string, unknown> } = { files: {} }
  let offset = 0
  const datas: Buffer[] = []
  for (const [name, buf] of Object.entries(files)) {
    const parts = name.split('/')
    let node = index as { files: Record<string, unknown> }
    for (const p of parts.slice(0, -1)) node = (node.files[p] ??= { files: {} }) as { files: Record<string, unknown> }
    node.files[parts.at(-1)!] = { size: buf.length, offset: String(offset) }
    offset += buf.length
    datas.push(buf)
  }
  const json = Buffer.from(JSON.stringify(index))
  const pad = (4 - (json.length % 4)) % 4
  const pickle2 = Buffer.alloc(8 + json.length + pad)
  pickle2.writeUInt32LE(4 + json.length + pad, 0)
  pickle2.writeUInt32LE(json.length, 4)
  json.copy(pickle2, 8)
  const pickle1 = Buffer.alloc(8)
  pickle1.writeUInt32LE(4, 0)
  pickle1.writeUInt32LE(pickle2.length, 4)
  writeFileSync(path, Buffer.concat([pickle1, pickle2, ...datas]))
}

const releaseDataText = (data: unknown) => `// GENERATED\nexport const RELEASE_DATA: unknown = /* RELEASES:BEGIN */ ${JSON.stringify(data, null, 2)} /* RELEASES:END */\n`
const catalogOf = (path: string) => JSON.parse(readFileSync(path, 'utf8').split('/* RELEASES:BEGIN */')[1].split('/* RELEASES:END */')[0])

function publishedRecord(version: string, installer: Buffer) {
  const fileName = `AI-Desk-Setup-${version}.exe`
  const yml = `version: ${version}\nfiles:\n  - url: ${fileName}\n    sha512: ${sha512b64(installer)}\n    size: ${installer.length}\npath: ${fileName}\nsha512: ${sha512b64(installer)}\n`
  const bm = Buffer.from(`bm-${version}`)
  return {
    version, channel: 'beta', releasedAt: '2026-11-18T03:50:53.752Z', minOs: 'Windows 10/11 64-bit', signature: 'unsigned', status: 'published', approved: true, updateTrust: 'feed-only',
    artifacts: {
      installer: { fileName, r2Key: immutableKey('beta', version, fileName), sizeBytes: installer.length, sha256: sha256(installer), sha512: sha512b64(installer), blockmap: { fileName: `${fileName}.blockmap`, r2Key: immutableKey('beta', version, `${fileName}.blockmap`), sizeBytes: bm.length, sha256: sha256(bm) } },
      updateMetadata: { fileName: 'latest.yml', r2Key: immutableKey('beta', version, 'latest.yml'), sizeBytes: Buffer.byteLength(yml), sha256: sha256(yml) },
    },
  }
}

type TargetName = 'production' | 'staging'
interface Fx { dir: string; artifacts: string; unpacked: string; releases: string; journal: string; keyPath: string; keyId: string; spki: string; version: string; installer: Buffer; yml: string; target: TargetName }

const defineFor = (t: TargetName) => (t === 'production'
  ? 'var define_UPDATE_TARGET_default = { target: "production", feedOrigin: "https://webaidesk.pages.dev", feedBase: "https://webaidesk.pages.dev/api/updates" };'
  : 'var define_UPDATE_TARGET_default = { target: "staging", feedOrigin: "https://webaidesk-staging.pages.dev", feedBase: "https://webaidesk-staging.pages.dev/api/updates" };')

/** A complete fake build of `version` for `target` + its catalog (beta.2 published there) + a matching signing key. */
function fixture(version = '0.5.0-beta.3', opts: { target?: TargetName; appTarget?: TargetName | 'legacy' | 'none'; appVersion?: string; compiledSpki?: string; compiledKeyId?: string; extraKey?: string; releases?: unknown[] } = {}): Fx {
  const target = opts.target ?? 'production'
  const keyId = target === 'production' ? 'release-test' : 'staging-test'
  const dir = mkdtempSync(join(tmpdir(), 'aidesk-relbeta-'))
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const spki = publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
  const keyPath = join(dir, 'release.pem')
  writeFileSync(keyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }))
  const installer = Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 7 + version.length) % 256))
  const fileName = `AI-Desk-Setup-${version}.exe`
  const yml = `version: ${version}\nfiles:\n  - url: ${fileName}\n    sha512: ${sha512b64(installer)}\n    size: ${installer.length}\npath: ${fileName}\nsha512: ${sha512b64(installer)}\nreleaseDate: '2026-11-18T05:00:00.000Z'\n`
  const artifacts = join(dir, 'artifacts')
  mkdirSync(artifacts)
  writeFileSync(join(artifacts, fileName), installer)
  writeFileSync(join(artifacts, `${fileName}.blockmap`), Buffer.from(`blockmap-${version}`))
  writeFileSync(join(artifacts, 'latest.yml'), yml)
  const unpacked = join(dir, 'stage', 'dist', 'win-unpacked')
  mkdirSync(join(unpacked, 'resources'), { recursive: true })
  writeFileSync(join(dir, 'stage', 'dist', 'latest.yml'), yml)
  const appTarget = opts.appTarget ?? target
  const head = appTarget === 'legacy' ? 'const FEED_BASE = "https://webaidesk.pages.dev/api/updates";' : appTarget === 'none' ? '' : defineFor(appTarget)
  writeAsar(join(unpacked, 'resources', 'app.asar'), {
    'package.json': Buffer.from(JSON.stringify({ name: 'ai-desk', version: opts.appVersion ?? version })),
    'out/main/index.js': Buffer.from(`${head}const FEED={keys:"${opts.compiledKeyId ?? keyId}:${opts.compiledSpki ?? spki}${opts.extraKey ? `,${opts.extraKey}` : ''}"};`),
  })
  writeFileSync(join(unpacked, 'resources', 'app-update.yml'), 'provider: generic\nurl: https://webaidesk.pages.dev/api/updates/stable\n')
  const releases = join(dir, 'releaseData.ts')
  writeFileSync(releases, releaseDataText({ schemaVersion: 1, releases: opts.releases ?? [publishedRecord('0.5.0-beta.2', Buffer.from('beta2-installer'))], components: [] }))
  return { dir, artifacts, unpacked, releases, journal: join(dir, 'state', `${target}-beta-${version}.json`), keyPath, keyId, spki, version, installer, yml, target }
}

/** In-memory R2 + a fake Pages project per target ("deployed" flips the live feed to the stored release). */
function fakeWorld(fx: Fx, opts: { putFails?: string; putLandsThenThrows?: string; mpu?: { key: string; uploadId: string }[] | null; servedComponents?: 'ok' | 'missing'; dirty?: string[]; liveStatus?: number; previewThrows?: boolean; prodFails?: boolean; prodNotLive?: boolean } = {}) {
  const store = new Map<string, { bytes: Buffer; sha256: string }>()
  const calls = { put: [] as string[], exec: [] as string[][], fetch: [] as { url: string; method: string }[] }
  const origin = TARGETS[fx.target].feedOrigin
  const backend = {
    name: 'fake',
    async head(key: string) {
      const o = store.get(key)
      return o ? { size: o.bytes.length, sha256: o.sha256 } : null
    },
    async put(step: { key: string; path: string; ref: { sha256: string } }) {
      calls.put.push(step.key)
      if (opts.putFails && step.key.endsWith(opts.putFails)) throw new Error('simulated R2 500')
      store.set(step.key, { bytes: readFileSync(step.path), sha256: step.ref.sha256 })
      if (opts.putLandsThenThrows && step.key.endsWith(opts.putLandsThenThrows)) {
        opts.putLandsThenThrows = undefined
        throw new Error('connection reset after the object landed (outcome unknown to the client)')
      }
    },
    async listMultipartUploads() {
      return opts.mpu === undefined ? [] : opts.mpu
    },
  }
  const res = (status: number, body: Buffer | string = '', headers: Record<string, string> = {}) => ({ status, headers: new Headers(headers), body: Buffer.isBuffer(body) ? body : Buffer.from(body) })
  const state = { deployed: false }
  const fetch = async (url: string, init: { method?: string; headers?: Record<string, string> } = {}) => {
    calls.fetch.push({ url, method: init.method ?? 'GET' })
    if (url.startsWith(DEFAULTS.r2PublicBase)) {
      const o = store.get(url.slice(DEFAULTS.r2PublicBase.length + 1))
      return o ? res(200, '', { 'content-length': String(o.bytes.length) }) : res(404)
    }
    const m = /\/api\/updates\/beta\/(.+)$/.exec(url)
    if (!m) return res(404)
    const isLive = url.startsWith(origin)
    if (isLive && opts.liveStatus) return res(opts.liveStatus)
    const servesNew = !isLive || (state.deployed && !opts.prodNotLive)
    if (m[1] === 'latest.yml') {
      if (!servesNew) return res(200, 'version: 0.5.0-beta.2\n')
      const o = store.get(`releases/beta/${fx.version}/latest.yml`)
      return o ? res(200, o.bytes) : res(404)
    }
    if (m[1] === 'components.json') {
      if (opts.servedComponents === 'missing' || !servesNew) return res(404)
      const key = [...store.keys()].find((k) => k.endsWith('/components.json'))
      return key ? res(200, store.get(key)!.bytes) : res(404)
    }
    const inst = servesNew ? store.get(`releases/beta/${fx.version}/${m[1]}`) : undefined
    return inst ? res(206, inst.bytes.subarray(0, 1024)) : res(404)
  }
  const exec = (cmd: string, args: string[]) => {
    calls.exec.push([cmd, ...args])
    if (args.includes('deploy')) {
      const isProd = args.includes('main')
      if (!isProd && opts.previewThrows) throw new Error('wrangler crashed (outcome unknown)')
      if (isProd && opts.prodFails) return { status: 1, stdout: '', stderr: 'network error' }
      if (isProd) state.deployed = true
      return { status: 0, stdout: `Deployment complete! https://abc123de.${TARGETS[fx.target].previewHost}`, stderr: '' }
    }
    return { status: 0, stdout: '', stderr: '' }
  }
  const git = () => ({ branch: 'feature/x', head: 'c47a2dce8de1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', dirty: opts.dirty ?? [], indexLock: false, worktrees: [] })
  return { store, calls, backend, fetch, exec, git, state, opts }
}

// Exhausted answers = EOF (null): the gate fails closed (a blank line would only be skipped).
const answers = (...lines: string[]) => ({ isTTY: true, write() {}, readLine: async () => (lines.length ? lines.shift()! : null) })
const argsFor = (fx: Fx, extra: string[] = []) => [fx.version, '--target', fx.target, '--artifacts', fx.artifacts, '--unpacked', fx.unpacked, '--key', fx.keyPath, '--key-id', fx.keyId, ...extra]
const depsFor = (fx: Fx, w: ReturnType<typeof fakeWorld>, more: Record<string, unknown> = {}) => ({ releasesFile: fx.releases, journalPath: fx.journal, gitState: w.git, fetch: w.fetch, backend: w.backend, exec: w.exec, distFingerprint: () => 'dist-1', authenticode: () => ({ status: 'NotSigned', signer: '' }), log: () => {}, ...more })
const ph = (fx: Fx) => sha256(fx.installer).slice(0, 8)
const approve = (fx: Fx, seq = 1) => answers(`UPLOAD ${fx.target} ${fx.version} ${ph(fx)}`, `PUBLISH ${fx.target} ${fx.version} seq${seq} ${ph(fx)}`, `PROMOTE ${fx.target} ${fx.version} ${ph(fx)}`)
const journalOf = (fx: Fx) => JSON.parse(readFileSync(fx.journal, 'utf8'))

// ---------------------------------------------------------------- basics

test('asar reader + compiled target detection (define, legacy ≤ beta.3, unknown)', () => {
  const fx = fixture()
  const f = readAsarFiles(join(fx.unpacked, 'resources', 'app.asar'), ['package.json', 'out/main/index.js', 'missing.js'])
  assert.equal(JSON.parse(f['package.json'].toString()).version, fx.version)
  assert.equal(f['missing.js'], null)
  assert.deepEqual(detectAppTarget(defineFor('staging')), { target: 'staging', feedOrigin: 'https://webaidesk-staging.pages.dev', legacy: false })
  assert.deepEqual(detectAppTarget('x="https://webaidesk.pages.dev/api/updates"'), { target: 'production', feedOrigin: 'https://webaidesk.pages.dev', legacy: true })
  assert.equal(detectAppTarget('nothing here'), null)
})

test('target selection: required for every state-changing mode; unknown refused; dry-run previews production', () => {
  assert.equal(resolveTarget({}, 'dry-run').name, 'production')
  for (const m of ['release', 'verify-only', 'reconcile', 'clear-uncertain']) assert.throws(() => resolveTarget({}, m), /--target production\|staging is required/)
  assert.throws(() => resolveTarget({ target: 'prod' }, 'release'), /unknown --target/)
  assert.equal(resolveTarget({ target: 'STAGING' }, 'release').name, 'staging')
  const p = TARGETS.production
  const s = TARGETS.staging
  for (const k of ['feedOrigin', 'pagesProject', 'bucket', 'releasesFile', 'keyIdPrefix', 'previewHost']) assert.notEqual(p[k], s[k], `${k} differs between targets`)
})

test('dry-run (default) verifies everything but makes no remote write and writes nothing locally', async () => {
  const fx = fixture()
  const w = fakeWorld(fx)
  const before = readFileSync(fx.releases, 'utf8')
  const r = await run(argsFor(fx), depsFor(fx, w))
  assert.equal(r.mode, 'dry-run')
  assert.deepEqual(w.calls.put, [])
  assert.deepEqual(w.calls.exec, [])
  assert.ok(w.calls.fetch.every((c) => c.method === 'GET' || c.method === 'HEAD'))
  assert.equal(readFileSync(fx.releases, 'utf8'), before)
  assert.equal(existsSync(fx.journal), false)
})

test('fail-closed inputs: missing key, key ≠ app key, wrong hash, wrong version, duplicate, downgrade', async () => {
  const fx = fixture()
  await assert.rejects(run(argsFor(fx).map((a) => (a === fx.keyPath ? join(fx.dir, 'nope.pem') : a)), depsFor(fx, fakeWorld(fx))), /signing key not found/)
  const other = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
  const fk = fixture('0.5.0-beta.3', { compiledSpki: other })
  await assert.rejects(run(argsFor(fk), depsFor(fk, fakeWorld(fk))), /signing key ≠ public key release-test compiled into the app/)
  const fh = fixture()
  writeFileSync(join(fh.artifacts, `AI-Desk-Setup-${fh.version}.exe`), Buffer.from('tampered'))
  await assert.rejects(run(argsFor(fh), depsFor(fh, fakeWorld(fh))), (e: Error) => e instanceof ReleaseError && /BUILD FAILED/.test(e.message))
  const fv = fixture('0.5.0-beta.3', { appVersion: '0.5.0-beta.2' })
  await assert.rejects(run(argsFor(fv), depsFor(fv, fakeWorld(fv))), /app\.asar package\.json version 0\.5\.0-beta\.2 ≠ 0\.5\.0-beta\.3/)
  const fd = fixture('0.5.0-beta.2')
  await assert.rejects(run(argsFor(fd), depsFor(fd, fakeWorld(fd))), /already published — refusing a duplicate/)
  const fo = fixture('0.5.0-beta.1')
  await assert.rejects(run(argsFor(fo), depsFor(fo, fakeWorld(fo))), /downgrade\/re-use refused/)
})

// ---------------------------------------------------------------- wrong-target guards

test('wrong target: production artifacts to staging, staging artifacts to production, foreign keys, production key as staging signer', async () => {
  const prodApp = fixture('0.5.0-beta.3', { target: 'staging', appTarget: 'production' })
  await assert.rejects(run(argsFor(prodApp, ['--release']), depsFor(prodApp, fakeWorld(prodApp), { io: approve(prodApp) })), /built for production \(https:\/\/webaidesk\.pages\.dev\), not for --target staging/)
  const stagingApp = fixture('0.5.0-beta.3', { target: 'production', appTarget: 'staging' })
  await assert.rejects(run(argsFor(stagingApp), depsFor(stagingApp, fakeWorld(stagingApp))), /built for staging .* not for --target production/)
  const legacyToStaging = fixture('0.5.0-beta.3', { target: 'staging', appTarget: 'legacy' })
  await assert.rejects(run(argsFor(legacyToStaging), depsFor(legacyToStaging, fakeWorld(legacyToStaging))), /built for production/)
  const unknown = fixture('0.5.0-beta.3', { appTarget: 'none' })
  await assert.rejects(run(argsFor(unknown), depsFor(unknown, fakeWorld(unknown))), /cannot tell which update feed/)
  const mixed = fixture('0.5.0-beta.3', { target: 'staging', extraKey: 'release-2026a:MCowBQYDK2VwAyEA1UAIjfSBC+mOrDsBTcNE20C0cuAJcmIEmPDLS2hHhfo=' })
  await assert.rejects(run(argsFor(mixed), depsFor(mixed, fakeWorld(mixed))), /carries keys of another environment \(release-2026a\)/)
  const wrongId = fixture('0.5.0-beta.3', { target: 'staging' })
  await assert.rejects(run(argsFor(wrongId).map((a) => (a === 'staging-test' ? 'release-test' : a)), depsFor(wrongId, fakeWorld(wrongId))), /not a staging key|NOT compiled/)
  // the legacy production builds (0.5.0-beta.2/beta.3) still release to production
  const legacy = fixture('0.5.0-beta.3', { appTarget: 'legacy' })
  assert.equal((await run(argsFor(legacy), depsFor(legacy, fakeWorld(legacy)))).ok, true)
})

test('staging release writes ONLY the staging catalog, uses staging project/branch/journal and target-bound phrases', async () => {
  const fx = fixture('0.5.0-beta.3', { target: 'staging', releases: [] })
  const w = fakeWorld(fx)
  const prodCatalogBefore = readFileSync(join(import.meta.dirname, '..', 'server', 'releaseData.ts'), 'utf8')
  const wrongTarget = fixture('0.5.0-beta.3', { target: 'staging', releases: [] })
  await assert.rejects(run(argsFor(wrongTarget, ['--release']), depsFor(wrongTarget, fakeWorld(wrongTarget), { io: answers(`UPLOAD production ${wrongTarget.version} ${ph(wrongTarget)}`) })), /UPLOAD FAILED/, 'a production phrase never approves a staging upload')
  const r = await run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx) }))
  assert.equal(r.ok, true)
  assert.ok(w.calls.exec.filter((c) => c.includes('deploy')).every((c) => c.includes('webaidesk-staging')), 'only the staging project')
  assert.equal(readFileSync(join(import.meta.dirname, '..', 'server', 'releaseData.ts'), 'utf8'), prodCatalogBefore, 'production catalog untouched')
  assert.equal(catalogOf(fx.releases).releases[0].version, fx.version)
  await assert.rejects(run([fx.version, '--target', 'staging', '--release', '--artifacts', fx.artifacts], { ...depsFor(fx, w), releasesFile: join(import.meta.dirname, '..', 'server', 'releaseData.ts') }), /staging must never write the production catalog/)
})

// ---------------------------------------------------------------- gates + mpu + dirty tree + live feed

test('Owner gates: no TTY / vague / wrong-target phrase → nothing uploaded', async () => {
  const fx = fixture()
  for (const io of [{ isTTY: false, write() {}, readLine: async () => `UPLOAD production ${fx.version} ${ph(fx)}` }, answers('yes'), answers(`UPLOAD ${fx.version} ${ph(fx)}`), answers(`UPLOAD staging ${fx.version} ${ph(fx)}`)]) {
    const w = fakeWorld(fx)
    await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io })), /UPLOAD FAILED/)
    assert.deepEqual(w.calls.put, [])
  }
})

test('incomplete multipart uploads are reported (never resumed/aborted); UNKNOWN when the backend cannot list', async () => {
  const fx = fixture()
  const lines: string[] = []
  await run(argsFor(fx), depsFor(fx, fakeWorld(fx, { mpu: [{ key: `releases/beta/${fx.version}/AI-Desk-Setup-${fx.version}.exe`, uploadId: 'u-123' }] }), { log: (l: string) => lines.push(l) }))
  assert.match(lines.join('\n'), /\(u-123\) — left untouched/)
  const l2: string[] = []
  await run(argsFor(fx), depsFor(fx, fakeWorld(fx, { mpu: null }), { log: (l: string) => l2.push(l) }))
  assert.match(l2.join('\n'), /incomplete MPU UNKNOWN/)
})

test('release refuses: dirty tree, --offline, unreadable live feed (5xx / target_mismatch)', async () => {
  const fx = fixture()
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, fakeWorld(fx, { dirty: ['src/lib/directDownload.ts'] }), { io: approve(fx) })), /working tree not clean/)
  await assert.rejects(run(argsFor(fx, ['--release', '--offline']), depsFor(fx, fakeWorld(fx), { io: approve(fx) })), /--offline is only allowed for a dry-run/)
  for (const s of [503, 500]) await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, fakeWorld(fx, { liveStatus: s }), { io: approve(fx) })), /cannot read the live production feed/)
  assert.equal((await run(argsFor(fx), depsFor(fx, fakeWorld(fx, { dirty: ['x.ts'] })))).ok, true, 'dry-run only warns')
})

// ---------------------------------------------------------------- happy path

test('happy path: gates in order, latest.yml last, preview verified, production deployed, post-release PASS, atomic catalog', async () => {
  const fx = fixture()
  const w = fakeWorld(fx)
  const r = await run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx) }))
  assert.equal(r.ok, true)
  assert.deepEqual(w.calls.put.map((k) => k.split('/').pop()), [`AI-Desk-Setup-${fx.version}.exe`, `AI-Desk-Setup-${fx.version}.exe.blockmap`, 'latest.yml', 'components.json'])
  const deploys = w.calls.exec.filter((c) => c.includes('deploy'))
  assert.equal(deploys.length, 2)
  assert.ok(deploys[0].includes('release-0-5-0-beta-3') && !deploys.flat().includes('--config'))
  assert.ok(deploys[1].includes('main'))
  assert.match(readFileSync(fx.releases, 'utf8'), /"version": "0\.5\.0-beta\.3"[\s\S]*"updateTrust": "feed-only"/)
  assert.equal(existsSync(`${fx.releases}.release-beta.tmp`), false, 'temp file renamed away')
  assert.equal(journalOf(fx).steps.postRelease.state, 'done')
  assert.ok(!JSON.stringify(journalOf(fx)).includes('PRIVATE KEY'))
})

// ---------------------------------------------------------------- interruptions between UPLOAD / PUBLISH / PROMOTE

test('UPLOAD interrupted: failed put → no publish; put that landed then threw → reconciled by HEAD, never re-uploaded', async () => {
  const fx = fixture()
  const before = readFileSync(fx.releases, 'utf8')
  const w = fakeWorld(fx, { putFails: '.blockmap' })
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx) })), /simulated R2 500/)
  assert.equal(readFileSync(fx.releases, 'utf8'), before)
  assert.deepEqual(w.calls.exec, [])
  assert.equal(w.store.has(`releases/beta/${fx.version}/latest.yml`), false, 'latest.yml never before installer + blockmap')
  // unknown outcome of a put: the object actually landed — the rerun proves it with HEAD and does not upload it again
  const fx2 = fixture()
  const w2 = fakeWorld(fx2, { putLandsThenThrows: '.exe' })
  await assert.rejects(run(argsFor(fx2, ['--release']), depsFor(fx2, w2, { io: approve(fx2) })), /connection reset/)
  assert.equal(journalOf(fx2).uploads[`releases/beta/${fx2.version}/AI-Desk-Setup-${fx2.version}.exe`].state, 'started')
  const putsBefore = w2.calls.put.filter((k) => k.endsWith('.exe')).length
  assert.equal((await run(argsFor(fx2, ['--release']), depsFor(fx2, w2, { io: approve(fx2) }))).ok, true)
  assert.equal(w2.calls.put.filter((k) => k.endsWith('.exe')).length, putsBefore, 'installer not uploaded twice')
})

test('UPLOAD conflict: an immutable key with different content stops before any gate', async () => {
  const fx = fixture()
  const w = fakeWorld(fx)
  w.store.set(`releases/beta/${fx.version}/AI-Desk-Setup-${fx.version}.exe`, { bytes: Buffer.from('other build'), sha256: 'x'.repeat(64) })
  const io = answers(`UPLOAD production ${fx.version} ${ph(fx)}`)
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io })), /holds DIFFERENT content/)
  assert.deepEqual(w.calls.put, [])
})

test('PUBLISH interrupted: after components upload the rerun reuses the SAME signed bytes and sequence', async () => {
  const fx = fixture()
  const w = fakeWorld(fx)
  const crash = (cmd: string, args: string[]) => (args.includes('check') ? { status: 1, stdout: '', stderr: 'boom' } : w.exec(cmd, args))
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx), exec: crash })), /npm run check failed/)
  const signed = journalOf(fx).components.text
  const compKey = [...w.store.keys()].find((k) => k.endsWith('components.json'))!
  assert.equal(w.store.get(compKey)!.bytes.toString(), signed)
  const r = await run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx), gitState: () => ({ ...w.git(), dirty: ['server/releaseData.ts'] }) }))
  assert.equal(r.ok, true)
  assert.equal(journalOf(fx).components.text, signed, 'same bytes after resume')
  assert.equal(w.calls.put.filter((k) => k.endsWith('components.json')).length, 1, 'components uploaded once')
  // a published record NOT written by this pipeline stays a duplicate
  assert.ok(preflight({ version: fx.version, channel: 'beta', releaseFile: catalogOf(fx.releases), git: { dirty: [], indexLock: false }, liveFeedVersion: '0.5.0-beta.2', mode: 'release', ownWrite: false }).problems.some((p: string) => /duplicate/.test(p)))
})

test('PUBLISH: preview deploy with unknown outcome → UNCERTAIN, rerun refuses, nothing deployed again', async () => {
  const fx = fixture()
  const w = fakeWorld(fx, { previewThrows: true })
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx) })), /wrangler crashed/)
  assert.equal(journalOf(fx).steps.previewDeploy.state, 'started')
  w.opts.previewThrows = false
  const deploysBefore = w.calls.exec.filter((c) => c.includes('deploy')).length
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx), gitState: () => ({ ...w.git(), dirty: ['server/releaseData.ts'] }) })), /RECONCILE FAILED[\s\S]*previewDeploy[\s\S]*never retried blindly/)
  assert.equal(w.calls.exec.filter((c) => c.includes('deploy')).length, deploysBefore, 'no blind re-deploy')
  const rec = await run(argsFor(fx, ['--reconcile']), depsFor(fx, w))
  assert.equal(rec.ok, true)
  assert.equal(journalOf(fx).steps.previewDeploy.state, 'started', 'a preview URL cannot be recovered: stays uncertain')
})

test('PUBLISH: feed without the signed components → preview refused, production never deployed', async () => {
  const fx = fixture()
  const w = fakeWorld(fx, { servedComponents: 'missing' })
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx) })), /components\.json at https:\/\/abc123de\.webaidesk\.pages\.dev is not the signed manifest/)
  assert.ok(!w.calls.exec.some((c) => c.includes('main')))
})

test('PROMOTE: dist-public changed after the verified preview → refused before deploying', async () => {
  const fx = fixture()
  const w = fakeWorld(fx)
  let n = 0
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx), distFingerprint: () => (n++ === 0 ? 'dist-1' : 'dist-2') })), /dist-public changed since the verified preview/)
  assert.ok(!w.calls.exec.some((c) => c.includes('main')))
  assert.equal(journalOf(fx).steps.productionDeploy, undefined, 'production deploy never started')
})

test('PROMOTE: failed production deploy → UNCERTAIN; --reconcile resolves it only from the real feed; CLEAR needs a typed gate', async () => {
  const fx = fixture()
  const w = fakeWorld(fx, { prodFails: true })
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx) })), /production deploy failed — recorded as UNCERTAIN/)
  assert.equal(journalOf(fx).steps.productionDeploy.state, 'started')
  const dirtyGit = () => ({ ...w.git(), dirty: ['server/releaseData.ts'] })
  // rerun --release: refused, no blind deploy
  const deploys = () => w.calls.exec.filter((c) => c.includes('deploy') && c.includes('main')).length
  const before = deploys()
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx), gitState: dirtyGit })), /RECONCILE FAILED/)
  assert.equal(deploys(), before)
  // reconcile while production still serves the old release → stays uncertain (read-only)
  await run(argsFor(fx, ['--reconcile']), depsFor(fx, w, { gitState: dirtyGit }))
  assert.equal(journalOf(fx).steps.productionDeploy.state, 'started')
  assert.equal(deploys(), before)
  // clear-uncertain: wrong / no-TTY phrase refused, exact phrase accepted (local journal only)
  await assert.rejects(run(argsFor(fx, ['--clear-uncertain', 'productionDeploy']), depsFor(fx, w, { io: answers('yes') })), /CLEAR FAILED/)
  await assert.rejects(run(argsFor(fx, ['--clear-uncertain', 'productionDeploy']), depsFor(fx, w, { io: { isTTY: false, write() {}, readLine: async () => `CLEAR productionDeploy production ${fx.version}` } })), /CLEAR FAILED/)
  await run(argsFor(fx, ['--clear-uncertain', 'productionDeploy']), depsFor(fx, w, { io: answers(`CLEAR productionDeploy production ${fx.version}`) }))
  assert.equal(journalOf(fx).steps.productionDeploy.state, 'cleared-by-owner')
  assert.equal(deploys(), before, 'clearing never deploys')
  // the Owner then releases again: everything identical is reused, PROMOTE deploys once
  w.opts.prodFails = false
  const r = await run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx), gitState: dirtyGit }))
  assert.equal(r.ok, true)
  assert.equal(deploys(), before + 1)
})

test('PROMOTE: deploy reported failed but actually live → --reconcile marks it done from the real feed', async () => {
  const fx = fixture()
  const w = fakeWorld(fx, { prodFails: true })
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx) })), /UNCERTAIN/)
  w.state.deployed = true // the deploy did land
  await run(argsFor(fx, ['--reconcile']), depsFor(fx, w, { gitState: () => ({ ...w.git(), dirty: ['server/releaseData.ts'] }) }))
  assert.equal(journalOf(fx).steps.productionDeploy.state, 'done')
  assert.equal(journalOf(fx).steps.postRelease.state, 'done')
})

test('POST-RELEASE fails (CDN not yet live) → --verify-only re-checks later, read-only', async () => {
  const fx = fixture()
  const w = fakeWorld(fx, { prodNotLive: true })
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx) })), /POST-RELEASE FAILED[\s\S]*--verify-only/)
  assert.equal(journalOf(fx).steps.productionDeploy.state, 'done')
  const puts = w.calls.put.length
  const execs = w.calls.exec.length
  await assert.rejects(run(argsFor(fx, ['--verify-only']), depsFor(fx, w)), /POST-RELEASE FAILED/)
  w.opts.prodNotLive = false
  const r = await run(argsFor(fx, ['--verify-only']), depsFor(fx, w))
  assert.equal(r.ok, true)
  assert.equal(journalOf(fx).steps.postRelease.state, 'done')
  assert.equal(w.calls.put.length, puts, 'verify-only never uploads')
  assert.equal(w.calls.exec.length, execs, 'verify-only never deploys')
})

test('rerun after changed artifacts is refused (immutable keys never mix two builds)', async () => {
  const fx = fixture()
  mkdirSync(join(fx.dir, 'state'), { recursive: true })
  writeFileSync(fx.journal, JSON.stringify({ schema: 'aidesk-release-journal/1', version: fx.version, channel: 'beta', installerSha512: 'x', uploads: {}, steps: {} }))
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, fakeWorld(fx), { io: approve(fx) })), /artifacts changed since the interrupted run/)
})

test('expired journal manifest: re-signed if never uploaded, refused if it was uploaded', async () => {
  const fx = fixture()
  const w = fakeWorld(fx)
  const crash = (cmd: string, args: string[]) => (args.includes('check') ? { status: 1, stdout: '', stderr: 'boom' } : w.exec(cmd, args))
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx), exec: crash })), /npm run check failed/)
  const later = () => Date.now() + 40 * 86_400_000
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: approve(fx), now: later, gitState: () => ({ ...w.git(), dirty: ['server/releaseData.ts'] }) })), /expired after it was uploaded — publish needs a NEW sequence/)
  // never uploaded: crash before PUBLISH gate (gate refused), then much later → re-signed transparently
  const fx2 = fixture()
  const w2 = fakeWorld(fx2)
  await assert.rejects(run(argsFor(fx2, ['--release']), depsFor(fx2, w2, { io: answers(`UPLOAD production ${fx2.version} ${ph(fx2)}`, 'no') })), /PUBLISH FAILED/)
  const old = journalOf(fx2).components.text
  const lines: string[] = []
  const r = await run(argsFor(fx2), depsFor(fx2, w2, { now: () => Date.now() + 40 * 86_400_000, log: (l: string) => lines.push(l) }))
  assert.equal(r.ok, true)
  assert.match(lines.join('\n'), /expired and was never uploaded — re-signing/)
  assert.notEqual(r.ctx.plan.components.text, old)
})

test('writeReleaseFileAtomic keeps the file intact when the new data is invalid JSON-wise', () => {
  const fx = fixture()
  const before = readFileSync(fx.releases, 'utf8')
  const data = catalogOf(fx.releases)
  writeReleaseFileAtomic({ ...data, note: 'x' }, fx.releases)
  assert.equal(catalogOf(fx.releases).note, 'x')
  assert.notEqual(readFileSync(fx.releases, 'utf8'), before)
})

test('read-only feed checks wait (bounded) for network errors only; an HTTP answer is never retried', async () => {
  let n = 0
  const flaky = async () => { if (++n < 3) throw new Error('getaddrinfo ENOTFOUND abc.webaidesk-staging.pages.dev'); return { status: 200, body: Buffer.from('ok') } }
  const sleeps: number[] = []
  const r = await readWithRetry(flaky, 'https://x', undefined, { attempts: 6, delayMs: 7, sleep: async (ms: number) => { sleeps.push(ms) } })
  assert.equal(r.status, 200)
  assert.deepEqual(sleeps, [7, 7])
  let m = 0
  const wrong = async () => { m++; return { status: 404, body: Buffer.from('no') } }
  assert.equal((await readWithRetry(wrong, 'https://x', undefined, { sleep: async () => {} })).status, 404)
  assert.equal(m, 1, 'an HTTP response (even 404 / wrong content) is returned at once')
  await assert.rejects(readWithRetry(async () => { throw new Error('down') }, 'https://x', undefined, { attempts: 3, sleep: async () => {} }), /VERIFY-READ FAILED[\s\S]*after 3 attempts[\s\S]*nothing was changed/)
})

test('gate summaries: PROMOTE on production carries the real-users warning (not on staging); PUBLISH shows the post-upload remote state', async () => {
  const capture = (fx: Fx) => {
    const lines = [`UPLOAD ${fx.target} ${fx.version} ${ph(fx)}`, `PUBLISH ${fx.target} ${fx.version} seq1 ${ph(fx)}`, `PROMOTE ${fx.target} ${fx.version} ${ph(fx)}`]
    const shown: string[] = []
    return { shown, io: { isTTY: true, write: (s: string) => shown.push(s), readLine: async () => (lines.length ? lines.shift()! : null) } }
  }
  const prod = fixture()
  const p = capture(prod)
  await run(argsFor(prod, ['--release']), depsFor(prod, fakeWorld(prod), { io: p.io }))
  const promote = p.shown.find((s) => s.includes('OWNER APPROVAL: PROMOTE'))!
  assert.match(promote, /PRODUCTION RELEASE — AFFECTS REAL USERS/)
  assert.match(promote, /offers 0\.5\.0-beta\.3 \(currently 0\.5\.0-beta\.2\)/)
  const publish = p.shown.find((s) => s.includes('OWNER APPROVAL: PUBLISH'))!
  assert.match(publish, /remote state +AI-Desk-Setup-0\.5\.0-beta\.3\.exe=identical/, 'post-upload state, not the stale "absent"')
  const stg = fixture('0.5.0-beta.3', { target: 'staging', releases: [] })
  const s = capture(stg)
  await run(argsFor(stg, ['--release']), depsFor(stg, fakeWorld(stg), { io: s.io }))
  assert.doesNotMatch(s.shown.join('\n'), /AFFECTS REAL USERS/)
})

// ---------------------------------------------------------------- Owner gate input handling (stray blank lines)

/** Scripted terminal: `script` items are lines (or null = EOF); `tty` may flip to simulate a lost terminal. */
const gateIo = (script: Array<string | null>, ttyAfterReads?: number) => {
  const shown: string[] = []
  let reads = 0
  return {
    shown,
    get reads() { return reads },
    io: {
      get isTTY() { return ttyAfterReads === undefined || reads < ttyAfterReads },
      write: (s: string) => shown.push(s),
      readLine: async () => { reads++; return script.length ? script.shift()! : null },
    },
  }
}
const GATE = { name: 'PUBLISH', phrase: 'PUBLISH production 0.5.0-beta.3 seq2 3a78fd9b', summary: 's' }

test('ownerGate: blank / whitespace-only / CR-only lines are skipped and the prompt is shown again; the exact phrase is accepted', async () => {
  const g = gateIo(['', '   ', '\r', '\t \r', 'PUBLISH production 0.5.0-beta.3 seq2 3a78fd9b\r'])
  assert.equal(await ownerGate({ ...GATE, io: g.io }), true)
  assert.equal(g.reads, 5)
  assert.equal(g.shown.filter((s) => s.includes('blank line ignored')).length, 4, 'prompt re-shown once per blank line')
  assert.ok(g.shown.every((s) => s.endsWith('> ') || s.endsWith('\n')))
})

test('ownerGate: any non-empty mismatch rejects at once (no further read) — vague words, partial, wrong seq/hash/target, another gate\'s phrase', async () => {
  for (const wrong of ['yes', 'PUBLISH', 'PUBLISH production 0.5.0-beta.3 seq3 3a78fd9b', 'PUBLISH production 0.5.0-beta.3 seq2 deadbeef', 'PUBLISH staging 0.5.0-beta.3 seq2 3a78fd9b',
    'UPLOAD production 0.5.0-beta.3 3a78fd9b', 'PROMOTE production 0.5.0-beta.3 3a78fd9b', 'publish production 0.5.0-beta.3 seq2 3a78fd9b']) {
    const g = gateIo(['', wrong, GATE.phrase])
    await assert.rejects(ownerGate({ ...GATE, io: g.io }), /PUBLISH FAILED[\s\S]*did not match[\s\S]*nothing was done/, wrong)
    assert.equal(g.reads, 2, `${wrong}: the correct phrase queued after it is never read`)
  }
})

test('ownerGate fails closed: EOF (null/undefined), EOF after blank lines, lost TTY before/mid gate, runaway blank lines', async () => {
  await assert.rejects(ownerGate({ ...GATE, io: gateIo([null]).io }), /PUBLISH FAILED[\s\S]*input ended/)
  await assert.rejects(ownerGate({ ...GATE, io: { isTTY: true, write() {}, readLine: async () => undefined } }), /input ended/)
  await assert.rejects(ownerGate({ ...GATE, io: gateIo(['', '  ', null]).io }), /input ended/, 'blank lines then EOF')
  const noTty = gateIo([GATE.phrase], 0)
  await assert.rejects(ownerGate({ ...GATE, io: noTty.io }), /not a TTY/)
  assert.equal(noTty.reads, 0, 'a non-interactive input is never even read')
  const lost = gateIo(['', GATE.phrase], 1)
  await assert.rejects(ownerGate({ ...GATE, io: lost.io }), /not a TTY/, 'terminal gone after a blank line → the queued phrase is not read')
  assert.equal(lost.reads, 1)
  const flood = gateIo([...Array(GATE_MAX_BLANK_LINES + 1).fill(''), GATE.phrase])
  await assert.rejects(ownerGate({ ...GATE, io: flood.io }), /blank lines in a row/)
  assert.equal(flood.reads, GATE_MAX_BLANK_LINES + 1)
  assert.equal(await ownerGate({ ...GATE, io: gateIo([...Array(GATE_MAX_BLANK_LINES).fill(''), GATE.phrase]).io }), true, 'exactly the limit is still fine')
})

test('release: blank lines buffered before UPLOAD and between PUBLISH and PROMOTE (pasted newline / stray Enter during check+deploy) → each gate still needs its own phrase; release completes once', async () => {
  const fx = fixture()
  const w = fakeWorld(fx)
  const io = answers('', `UPLOAD ${fx.target} ${fx.version} ${ph(fx)}`, '\r', `PUBLISH ${fx.target} ${fx.version} seq1 ${ph(fx)}`, '', '  ', '\r', `PROMOTE ${fx.target} ${fx.version} ${ph(fx)}`)
  const r = await run(argsFor(fx, ['--release']), depsFor(fx, w, { io }))
  assert.equal(r.ok, true)
  assert.equal(w.calls.exec.filter((c) => c.includes('deploy') && c.includes('main')).length, 1, 'exactly one production deploy')
  assert.equal(journalOf(fx).steps.productionDeploy.state, 'done')
})

test('release: blank lines then EOF at PROMOTE → PROMOTE FAILED, preview only, production never deployed, no productionDeploy step', async () => {
  const fx = fixture()
  const w = fakeWorld(fx)
  const io = answers(`UPLOAD ${fx.target} ${fx.version} ${ph(fx)}`, `PUBLISH ${fx.target} ${fx.version} seq1 ${ph(fx)}`, '', '   ')
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io })), /PROMOTE FAILED[\s\S]*input ended/)
  assert.ok(!w.calls.exec.some((c) => c.includes('deploy') && c.includes('main')), 'no production deploy')
  assert.equal(w.state.deployed, false)
  assert.equal(journalOf(fx).steps.previewDeploy.state, 'done')
  assert.equal(journalOf(fx).steps.productionDeploy, undefined)
})

test('release: an UPLOAD phrase repeated into the PUBLISH gate, or the PUBLISH phrase into PROMOTE, never approves the next step', async () => {
  const fx = fixture()
  const w = fakeWorld(fx)
  const upload = `UPLOAD ${fx.target} ${fx.version} ${ph(fx)}`
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: answers(upload, '', upload) })), /PUBLISH FAILED[\s\S]*did not match/)
  assert.ok(!w.calls.put.some((k) => k.endsWith('components.json')), 'nothing published')
  assert.ok(!w.calls.exec.some((c) => c.includes('deploy')), 'nothing deployed')
  const fx2 = fixture()
  const w2 = fakeWorld(fx2)
  const publish = `PUBLISH ${fx2.target} ${fx2.version} seq1 ${ph(fx2)}`
  await assert.rejects(run(argsFor(fx2, ['--release']), depsFor(fx2, w2, { io: answers(`UPLOAD ${fx2.target} ${fx2.version} ${ph(fx2)}`, publish, '', publish) })), /PROMOTE FAILED[\s\S]*did not match/)
  assert.ok(!w2.calls.exec.some((c) => c.includes('deploy') && c.includes('main')), 'production never deployed')
})

test('lineReader (real terminal input path): several lines in one chunk are queued, none dropped; EOF / stream error → null forever', async () => {
  const input = new PassThrough()
  const read = lineReader(input)
  input.write('UPLOAD production 0.5.0-beta.3 3a78fd9b\r\n\r\nPUBLISH production 0.5.0-beta.3 seq2 3a78fd9b\r\n')
  assert.equal(await read(), 'UPLOAD production 0.5.0-beta.3 3a78fd9b')
  assert.equal(await read(), '', 'the buffered blank line reaches the next gate (which skips it)')
  assert.equal(await read(), 'PUBLISH production 0.5.0-beta.3 seq2 3a78fd9b')
  const pending = read()
  input.end()
  assert.equal(await pending, null, 'a read waiting at EOF resolves null')
  assert.equal(await read(), null)
  assert.equal(await read(), null, 'stays null — a gate after EOF fails closed instead of hanging')
  const broken = new PassThrough()
  const readBroken = lineReader(broken)
  const waiting = readBroken()
  broken.destroy(new Error('terminal gone'))
  assert.equal(await waiting, null, 'stream error → null')
  assert.equal(await readBroken(), null)
})

// ---------------------------------------------------------------- buffered / pasted-ahead approvals never open a future gate

/**
 * Real lineReader over a stream + a simulated Owner who types `typed(phrase)` only AFTER the prompt appeared (delay > the
 * stale-settle window). Lines written to `input` before a gate opens model typed-ahead / pasted input.
 */
const SETTLE = 20
const liveTerminal = (typed: (phrase: string) => string | null = (p) => `${p}\n`, delayMs = 60) => {
  const input = new PassThrough()
  const read = lineReader(input)
  const shown: string[] = []
  const io = {
    isTTY: true,
    write: (s: string) => {
      shown.push(s)
      const m = /Type exactly: {2}(.+)\n> $/.exec(s)
      if (m) {
        const line = typed(m[1]!)
        if (line !== null) setTimeout(() => input.write(line), delayMs)
      }
    },
    readLine: () => read(),
    drainStale: () => read.drain(SETTLE),
  }
  return { input, io, shown }
}

test('lineReader.drain: returns + removes everything typed before now (incl. OS-buffered data pulled during the settle window); later lines are fresh', async () => {
  const input = new PassThrough()
  const read = lineReader(input)
  input.write('A\r\n\r\nB\r\n')
  assert.deepEqual(await read.drain(SETTLE), ['A', '', 'B'])
  assert.deepEqual(await read.drain(SETTLE), [], 'nothing left')
  setTimeout(() => input.write('C\n'), 40)
  assert.equal(await read(), 'C', 'a line typed after the drain is read normally')
  input.end('tail\n')
  assert.deepEqual(await read.drain(SETTLE), ['tail'])
  assert.equal(await read(), null)
})

test('ownerGate: a non-empty line buffered before the gate opened rejects it — even the CORRECT phrase; buffered blanks alone are ignored', async () => {
  for (const stale of [[GATE.phrase], ['', GATE.phrase], ['UPLOAD production 0.5.0-beta.3 3a78fd9b'], ['  x  ']]) {
    let reads = 0
    const io = { isTTY: true, write() {}, drainStale: async () => [...stale], readLine: async () => { reads++; return GATE.phrase } }
    await assert.rejects(ownerGate({ ...GATE, io }), /PUBLISH FAILED[\s\S]*BEFORE this gate opened[\s\S]*nothing was done/, JSON.stringify(stale))
    assert.equal(reads, 0, 'the gate never even reads a fresh line after buffered content')
  }
  const blanksOnly = { isTTY: true, write() {}, drainStale: async () => ['', '   ', '\r'], readLine: async () => GATE.phrase }
  assert.equal(await ownerGate({ ...GATE, io: blanksOnly }), true)
  const flood = { isTTY: true, write() {}, drainStale: async () => Array(GATE_MAX_BLANK_LINES * 5 + 1).fill(''), readLine: async () => GATE.phrase }
  await assert.rejects(ownerGate({ ...GATE, io: flood }), /buffered before this gate opened/)
  const noTty = { isTTY: false, write() {}, drainStale: async () => { throw new Error('must not drain without a TTY') }, readLine: async () => GATE.phrase }
  await assert.rejects(ownerGate({ ...GATE, io: noTty }), /not a TTY/)
})

test('release (live terminal): each gate typed after it opens → release completes, one production deploy', async () => {
  const fx = fixture()
  const w = fakeWorld(fx)
  const t = liveTerminal()
  const r = await run(argsFor(fx, ['--release']), depsFor(fx, w, { io: t.io }))
  assert.equal(r.ok, true)
  assert.equal(w.calls.exec.filter((c) => c.includes('deploy') && c.includes('main')).length, 1)
})

test('release (live terminal): UPLOAD + PUBLISH + PROMOTE pasted BEFORE the first gate → UPLOAD FAILED, nothing uploaded or deployed', async () => {
  const fx = fixture()
  const w = fakeWorld(fx)
  const t = liveTerminal(() => null)
  t.input.write(`UPLOAD ${fx.target} ${fx.version} ${ph(fx)}\r\nPUBLISH ${fx.target} ${fx.version} seq1 ${ph(fx)}\r\nPROMOTE ${fx.target} ${fx.version} ${ph(fx)}\r\n`)
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: t.io })), /UPLOAD FAILED[\s\S]*BEFORE this gate opened/)
  assert.deepEqual(w.calls.put, [])
  assert.ok(!w.calls.exec.some((c) => c.includes('deploy')))
})

test('release (live terminal): multi-line paste at UPLOAD (UPLOAD + PUBLISH + PROMOTE in one chunk) → UPLOAD ok, PUBLISH refuses the queued lines; nothing published', async () => {
  const fx = fixture()
  const w = fakeWorld(fx)
  const all = `UPLOAD ${fx.target} ${fx.version} ${ph(fx)}\r\nPUBLISH ${fx.target} ${fx.version} seq1 ${ph(fx)}\r\nPROMOTE ${fx.target} ${fx.version} ${ph(fx)}\r\n`
  const t = liveTerminal((p) => (p.startsWith('UPLOAD') ? all : null))
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: t.io })), /PUBLISH FAILED[\s\S]*BEFORE this gate opened/)
  assert.ok(!w.calls.put.some((k) => k.endsWith('components.json')), 'components never uploaded')
  assert.ok(!w.calls.exec.some((c) => c.includes('deploy')), 'nothing deployed')
})

test('release (live terminal): PROMOTE typed ahead while check/preview ran → PROMOTE FAILED, production never deployed; typed-ahead BLANK lines alone are harmless', async () => {
  const fx = fixture()
  const w = fakeWorld(fx)
  const t = liveTerminal((p) => (p.startsWith('PROMOTE') ? null : `${p}\n`))
  const exec = (cmd: string, args: string[]) => {
    if (args.includes('check')) t.input.write(`PROMOTE ${fx.target} ${fx.version} ${ph(fx)}\r\n`)
    return w.exec(cmd, args)
  }
  await assert.rejects(run(argsFor(fx, ['--release']), depsFor(fx, w, { io: t.io, exec })), /PROMOTE FAILED[\s\S]*BEFORE this gate opened/)
  assert.ok(!w.calls.exec.some((c) => c.includes('deploy') && c.includes('main')), 'no production deploy')
  assert.equal(journalOf(fx).steps.productionDeploy, undefined)

  const fx2 = fixture()
  const w2 = fakeWorld(fx2)
  const t2 = liveTerminal()
  const exec2 = (cmd: string, args: string[]) => {
    if (args.includes('check')) t2.input.write('\r\n\r\n   \r\n')
    return w2.exec(cmd, args)
  }
  const r = await run(argsFor(fx2, ['--release']), depsFor(fx2, w2, { io: t2.io, exec: exec2 }))
  assert.equal(r.ok, true, 'stray Enter presses during the wait do not block the release')
  assert.equal(w2.calls.exec.filter((c) => c.includes('deploy') && c.includes('main')).length, 1)
})
