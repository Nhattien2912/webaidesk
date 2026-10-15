import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  checkCatalog,
  compareSemver,
  currentRelease,
  immutableKey,
  validateRecord,
  type ReleaseRecord,
} from '../server/releaseRecords.ts'
import { currentCatalog, entriesForRecord, RELEASE_CATALOG, RELEASE_FILE_ERRORS, RELEASE_RECORDS } from '../server/releaseCatalog.ts'
import { handleDownload, handleLatestManifest, type R2BucketLike, type R2ObjectLike } from '../server/downloadHandler.ts'
import { handleUpdate, metadataMatchesRecord } from '../server/updateHandler.ts'
// @ts-expect-error plain ESM script without type declarations
import { addStagedRecord, applyTransition, inspectBuild, parseLatestYml, uploadCommands } from '../scripts/release.mjs'

const ORIGIN = 'https://webaidesk.pages.dev'

// ---------------------------------------------------------------- fixtures (offline, no real build)

interface Build {
  version: string
  installer: Uint8Array
  blockmap: Uint8Array
  yml: string
  record: ReleaseRecord
}

const sha256 = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex')
const sha512b64 = (b: Uint8Array) => createHash('sha512').update(b).digest('base64')

/** latest.yml exactly in the shape electron-builder 26 writes it. */
function builderYml(version: string, file: string, bytes: Uint8Array, date = '2026-11-01T10:00:00.000Z'): string {
  const h = sha512b64(bytes)
  return `version: ${version}\nfiles:\n  - url: ${file}\n    sha512: ${h}\n    size: ${bytes.length}\npath: ${file}\nsha512: ${h}\nreleaseDate: '${date}'\n`
}

function build(version: string, overrides: Partial<ReleaseRecord> = {}, seed = 1): Build {
  const installer = new Uint8Array(Array.from({ length: 2000 }, (_, i) => (i * seed + version.length) % 256))
  const blockmap = new TextEncoder().encode(`blockmap-${version}`)
  const fileName = `AI-Desk-Setup-${version}.exe`
  const yml = builderYml(version, fileName, installer)
  const record: ReleaseRecord = {
    version,
    channel: 'stable',
    releasedAt: '2026-11-01T10:00:00.000Z',
    minOs: 'Windows 10/11 64-bit',
    signature: 'signed',
    signer: 'CN=Example',
    status: 'published',
    approved: true,
    artifacts: {
      installer: {
        fileName,
        r2Key: immutableKey('stable', version, fileName),
        sizeBytes: installer.length,
        sha256: sha256(installer),
        sha512: sha512b64(installer),
        blockmap: { fileName: `${fileName}.blockmap`, r2Key: immutableKey('stable', version, `${fileName}.blockmap`), sizeBytes: blockmap.length, sha256: sha256(blockmap) },
      },
      updateMetadata: { fileName: 'latest.yml', r2Key: immutableKey('stable', version, 'latest.yml'), sizeBytes: new TextEncoder().encode(yml).length, sha256: sha256(yml) },
    },
    ...overrides,
  }
  return { version, installer, blockmap, yml, record }
}

function bucketFor(builds: Build[], tamper: (key: string, obj: { bytes: Uint8Array; meta: Record<string, string> }) => void = () => {}) {
  const objects = new Map<string, { bytes: Uint8Array; meta: Record<string, string> }>()
  for (const b of builds) {
    const a = b.record.artifacts
    objects.set(a.installer.r2Key, { bytes: b.installer, meta: { sha256: a.installer.sha256 } })
    objects.set(a.installer.blockmap.r2Key, { bytes: b.blockmap, meta: { sha256: a.installer.blockmap.sha256 } })
    objects.set(a.updateMetadata.r2Key, { bytes: new TextEncoder().encode(b.yml), meta: { sha256: a.updateMetadata.sha256 } })
  }
  for (const [k, v] of objects) tamper(k, v)
  const info = (key: string, o: { bytes: Uint8Array; meta: Record<string, string> }): R2ObjectLike => ({
    key,
    size: o.bytes.length,
    httpEtag: `"${sha256(o.bytes).slice(0, 8)}"`,
    uploaded: new Date('2026-11-01T10:00:00Z'),
    customMetadata: o.meta,
  })
  const calls: string[] = []
  const bucket: R2BucketLike = {
    async head(key) {
      calls.push(`head ${key}`)
      const o = objects.get(key)
      return o ? info(key, o) : null
    },
    async get(key, options) {
      calls.push(`get ${key}`)
      const o = objects.get(key)
      if (!o) return null
      const offset = options?.range?.offset ?? 0
      const length = options?.range?.length ?? o.bytes.length - offset
      const slice = o.bytes.slice(offset, offset + length)
      return { ...info(key, o), body: new ReadableStream({ start: (c) => (c.enqueue(slice), c.close()) }) }
    },
  }
  return { bucket, objects, calls }
}

const req = (path: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
  new Request(`${ORIGIN}${path}`, { method: init.method ?? 'GET', headers: init.headers })
const feed = (records: ReleaseRecord[], bucket: R2BucketLike | undefined, file: string, init?: Parameters<typeof req>[1], env: Record<string, string> = {}, channel = 'stable') =>
  handleUpdate(req(`/api/updates/${channel}/${file}`, init), { RELEASES: bucket, ...env }, channel, file, { records })
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error

// ---------------------------------------------------------------- shipped state

test('shipped server/releaseData.ts is valid, has no current release and no internal build', () => {
  assert.deepEqual([...RELEASE_FILE_ERRORS], [])
  assert.equal(currentRelease(RELEASE_RECORDS, 'stable'), null)
  assert.equal(RELEASE_CATALOG.length, 0)
  assert.deepEqual(currentCatalog(false), [])
})

// ---------------------------------------------------------------- record rules

test('validateRecord: semver, immutable keys, sha512, blockmap, metadata, approval', () => {
  assert.deepEqual(validateRecord(build('0.2.0').record), [])
  const bad: Array<[string, (r: ReleaseRecord) => void]> = [
    ['version', (r) => (r.version = 'latest')],
    ['channel', (r) => ((r as { channel: string }).channel = 'nightly')],
    ['published without approval', (r) => (r.approved = false)],
    ['mutable key', (r) => (r.artifacts.installer.r2Key = 'latest/AI-Desk-Setup.exe')],
    ['key of another version', (r) => (r.artifacts.installer.r2Key = immutableKey('stable', '0.1.0', r.artifacts.installer.fileName))],
    ['sha512', (r) => (r.artifacts.installer.sha512 = 'abc')],
    ['sha256', (r) => (r.artifacts.installer.sha256 = 'abc')],
    ['blockmap name', (r) => (r.artifacts.installer.blockmap.fileName = 'other.blockmap')],
    ['blockmap missing', (r) => delete (r.artifacts.installer as { blockmap?: unknown }).blockmap],
    ['metadata missing', (r) => delete (r.artifacts as { updateMetadata?: unknown }).updateMetadata],
    ['metadata name', (r) => (r.artifacts.updateMetadata.fileName = 'beta.yml')],
    ['metadata too large', (r) => (r.artifacts.updateMetadata.sizeBytes = 70_000)],
    ['installer name', (r) => (r.artifacts.installer.fileName = '../x.exe')],
    ['size', (r) => (r.artifacts.installer.sizeBytes = 0)],
    ['date', (r) => (r.releasedAt = 'soon')],
  ]
  for (const [name, mutate] of bad) {
    const r = structuredClone(build('0.2.0').record)
    mutate(r)
    assert.ok(validateRecord(r).length > 0, name)
  }
})

test('checkCatalog drops every record involved in a duplicate version, file or key', () => {
  const a = build('0.2.0').record
  const dupVersion = structuredClone(a)
  const check = checkCatalog({ schemaVersion: 1, releases: [a, dupVersion, build('0.3.0').record] })
  assert.deepEqual(check.valid.map((r) => r.version), ['0.3.0'])
  assert.ok(check.errors.some((e) => e.includes('duplicate')))
  assert.equal(checkCatalog({ releases: [] }).errors.length, 1)
  assert.equal(checkCatalog({ schemaVersion: 1, releases: [{ version: 'x' }] }).valid.length, 0)
})

test('currentRelease: highest semver among published + approved + signed', () => {
  assert.ok(compareSemver('0.10.0', '0.9.0') > 0)
  assert.ok(compareSemver('1.0.0', '1.0.0-beta.2') > 0)
  assert.ok(compareSemver('1.0.0-beta.10', '1.0.0-beta.2') > 0)
  const records = [
    build('0.2.0').record,
    build('0.4.0', { status: 'staged', approved: false }).record,
    build('0.5.0', { status: 'withdrawn' }).record,
    build('0.6.0', { signature: 'unsigned' }).record,
    build('0.3.0').record,
  ]
  assert.equal(currentRelease(records, 'stable')?.version, '0.3.0')
  assert.equal(currentRelease(records, 'stable', { allowUnsigned: true })?.version, '0.6.0')
  assert.equal(currentRelease([], 'stable'), null)
})

// ---------------------------------------------------------------- update feed

test('latest.yml is served verbatim for the current release, with no-cache', async () => {
  const b2 = build('0.2.0')
  const b3 = build('0.3.0', {}, 3)
  const { bucket } = bucketFor([b2, b3])
  const res = await feed([b2.record, b3.record], bucket, 'latest.yml')
  assert.equal(res.status, 200)
  assert.equal(await res.text(), b3.yml)
  assert.equal(res.headers.get('content-type'), 'text/yaml; charset=utf-8')
  assert.equal(res.headers.get('cache-control'), 'no-cache')
  assert.equal(res.headers.get('x-aidesk-release'), 'stable/0.3.0')
  const parsed = parseLatestYml(await (await feed([b3.record], bucket, 'latest.yml')).text())
  assert.equal(parsed.version, '0.3.0')
  assert.equal(parsed.files[0].url, b3.record.artifacts.installer.fileName)
  const head = await feed([b3.record], bucket, 'latest.yml', { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal((await head.arrayBuffer()).byteLength, 0)
})

test('unapproved, staged, withdrawn and unsigned releases never appear in the feed', async () => {
  const cases = [
    build('0.2.0', { status: 'staged', approved: false }),
    build('0.2.0', { status: 'staged', approved: true }),
    build('0.2.0', { status: 'withdrawn' }),
    build('0.2.0', { signature: 'unsigned' }),
  ]
  for (const b of cases) {
    const { bucket, calls } = bucketFor([b])
    const meta = await feed([b.record], bucket, 'latest.yml', undefined, { ALLOW_UNSIGNED_DOWNLOAD: 'true' })
    assert.equal(meta.status, 404)
    assert.equal(await errorOf(meta), 'no_release')
    const exe = await feed([b.record], bucket, b.record.artifacts.installer.fileName, undefined, { ALLOW_UNSIGNED_DOWNLOAD: 'true' })
    assert.equal(exe.status, 404)
    assert.equal(calls.length, 0)
  }
})

test('feed metadata fails closed: missing object, wrong hash, content naming another build', async () => {
  const b = build('0.2.0')
  const missing = bucketFor([b], (k, o) => k.endsWith('latest.yml') && (o.bytes = new Uint8Array()))
  missing.objects.delete(b.record.artifacts.updateMetadata.r2Key)
  assert.equal(await errorOf(await feed([b.record], missing.bucket, 'latest.yml')), 'release_unavailable')

  const tampered = bucketFor([b], (k, o) => {
    if (k.endsWith('latest.yml')) o.bytes = new TextEncoder().encode(b.yml.replace('0.2.0', '9.9.9'))
  })
  assert.equal(await errorOf(await feed([b.record], tampered.bucket, 'latest.yml')), 'integrity_mismatch')

  // Hash matches the record but the yml describes another installer -> refused.
  const other = build('0.2.0', {}, 7)
  const wrongContent = structuredClone(b.record)
  wrongContent.artifacts.updateMetadata.sha256 = sha256(other.yml)
  wrongContent.artifacts.updateMetadata.sizeBytes = new TextEncoder().encode(other.yml).length
  const swapped = bucketFor([b], (k, o) => k.endsWith('latest.yml') && (o.bytes = new TextEncoder().encode(other.yml)))
  assert.equal(await errorOf(await feed([wrongContent], swapped.bucket, 'latest.yml')), 'integrity_mismatch')
  assert.equal(metadataMatchesRecord(b.yml, b.record), true)
  assert.equal(metadataMatchesRecord(other.yml, b.record), false)

  assert.equal(await errorOf(await feed([b.record], undefined, 'latest.yml')), 'not_configured')
  const broken: R2BucketLike = { head: async () => { throw new Error('down') }, get: async () => { throw new Error('down') } }
  assert.equal((await feed([b.record], broken, 'latest.yml')).status, 502)
})

test('feed installer/blockmap: GET, HEAD, Range 206/416, resume with If-Range, integrity', async () => {
  const b = build('0.2.0')
  const { bucket } = bucketFor([b])
  const file = b.record.artifacts.installer.fileName
  const full = await feed([b.record], bucket, file)
  assert.equal(full.status, 200)
  assert.deepEqual(new Uint8Array(await full.arrayBuffer()), b.installer)
  const etag = full.headers.get('etag')!
  assert.equal(full.headers.get('accept-ranges'), 'bytes')

  const part = await feed([b.record], bucket, file, { headers: { range: 'bytes=1000-', 'if-range': etag } })
  assert.equal(part.status, 206)
  assert.equal(part.headers.get('content-range'), `bytes 1000-1999/${b.installer.length}`)
  assert.deepEqual(new Uint8Array(await part.arrayBuffer()), b.installer.slice(1000))

  assert.equal((await feed([b.record], bucket, file, { headers: { range: 'bytes=999999-' } })).status, 416)
  assert.equal((await feed([b.record], bucket, file, { headers: { 'if-none-match': etag } })).status, 304)
  assert.equal((await feed([b.record], bucket, file, { method: 'HEAD' })).headers.get('content-length'), String(b.installer.length))

  const bm = await feed([b.record], bucket, `${file}.blockmap`)
  assert.equal(bm.status, 200)
  assert.deepEqual(new Uint8Array(await bm.arrayBuffer()), b.blockmap)

  const bad = bucketFor([b], (k, o) => k.endsWith('.exe') && (o.meta = { sha256: 'f'.repeat(64) }))
  assert.equal(await errorOf(await feed([b.record], bad.bucket, file)), 'integrity_mismatch')
})

test('older published installers stay available (differential/reinstall); withdrawn and portable do not', async () => {
  const old = build('0.2.0')
  const withdrawn = build('0.3.0', { status: 'withdrawn' }, 3)
  const withPortable = build('0.4.0', {}, 5)
  withPortable.record.artifacts.portable = { fileName: 'AI-Desk-Portable-0.4.0.exe', r2Key: immutableKey('stable', '0.4.0', 'AI-Desk-Portable-0.4.0.exe'), sizeBytes: 10, sha256: 'a'.repeat(64) }
  const records = [old.record, withdrawn.record, withPortable.record]
  const { bucket } = bucketFor([old, withdrawn, withPortable])
  assert.equal((await feed(records, bucket, old.record.artifacts.installer.fileName)).status, 200)
  assert.equal((await feed(records, bucket, withdrawn.record.artifacts.installer.fileName)).status, 404)
  assert.equal((await feed(records, bucket, 'AI-Desk-Portable-0.4.0.exe')).status, 404)
  assert.equal((await feed(records, bucket, 'latest.yml')).headers.get('x-aidesk-release'), 'stable/0.4.0')
})

test('feed input validation: channel, file name, method', async () => {
  const b = build('0.2.0')
  const { bucket, calls } = bucketFor([b])
  assert.equal(await errorOf(await feed([b.record], bucket, 'latest.yml', undefined, {}, 'nightly')), 'unknown_channel')
  for (const f of ['../latest.yml', 'beta.yml', 'x.zip', 'a/b.exe', '.exe']) {
    assert.equal(await errorOf(await feed([b.record], bucket, f)), 'invalid_filename', f)
  }
  assert.equal((await feed([b.record], bucket, 'latest.yml', { method: 'POST' })).status, 405)
  assert.equal(calls.length, 0)
})

// ---------------------------------------------------------------- website <-> feed agreement

test('website manifest/download and update feed point at the same release and bytes', async () => {
  const b2 = build('0.2.0')
  const b3 = build('0.3.0', {}, 3)
  const records = [b2.record, b3.record]
  const { bucket } = bucketFor([b2, b3])
  const manifest = await (await handleLatestManifest(req('/api/releases/latest'), {}, { catalog: currentCatalog(false, records) })).json() as {
    version: string
    files: Array<{ fileName: string; sha256: string; url: string }>
  }
  const yml = parseLatestYml(await (await feed(records, bucket, 'latest.yml')).text())
  assert.equal(manifest.version, yml.version)
  assert.equal(manifest.files[0].fileName, yml.files[0].url)
  assert.equal(manifest.files[0].url, `${ORIGIN}/api/download/${yml.files[0].url}`)
  const viaWebsite = await handleDownload(req(`/api/download/${manifest.files[0].fileName}`), { RELEASES: bucket }, manifest.files[0].fileName, { catalog: records.flatMap(entriesForRecord) })
  const viaFeed = await feed(records, bucket, yml.files[0].url)
  const [w, f] = [new Uint8Array(await viaWebsite.arrayBuffer()), new Uint8Array(await viaFeed.arrayBuffer())]
  assert.deepEqual(w, f)
  assert.equal(createHash('sha512').update(f).digest('base64'), yml.files[0].sha512)
  assert.equal(sha256(w), manifest.files[0].sha256)
})

// ---------------------------------------------------------------- release script

function fixtureDir(version: string, opts: { yml?: (y: string) => string; blockmap?: boolean } = {}) {
  const b = build(version)
  const dir = mkdtempSync(join(tmpdir(), 'aidesk-release-'))
  const file = b.record.artifacts.installer.fileName
  writeFileSync(join(dir, file), b.installer)
  if (opts.blockmap !== false) writeFileSync(join(dir, `${file}.blockmap`), b.blockmap)
  writeFileSync(join(dir, 'latest.yml'), opts.yml ? opts.yml(b.yml) : b.yml)
  return { dir, b }
}
const signed = { authenticode: () => ({ status: 'Valid', signer: 'CN=Example' }) }
const emptyFile = { schemaVersion: 1, releases: [] as ReleaseRecord[] }

test('inspectBuild: builder output -> valid staged record, latest.yml uploaded last', async () => {
  const { dir, b } = fixtureDir('0.2.0')
  try {
    const { record, localFiles } = await inspectBuild({ dir, releaseFile: emptyFile, deps: signed })
    assert.deepEqual(validateRecord(record), [])
    assert.equal(record.status, 'staged')
    assert.equal(record.approved, false)
    assert.equal(record.signature, 'signed')
    assert.equal(record.artifacts.installer.sha512, b.record.artifacts.installer.sha512)
    assert.equal(record.artifacts.updateMetadata.sha256, b.record.artifacts.updateMetadata.sha256)
    assert.equal(Object.keys(localFiles).at(-1), immutableKey('stable', '0.2.0', 'latest.yml'))
    const cmds = uploadCommands(localFiles, record, { accountId: 'a'.repeat(32) })
    for (const c of cmds) {
      assert.ok(c.put.includes('--if-none-match') && c.put.includes('*'), 'never overwrite')
      assert.ok(c.put.includes(`sha256=${c.expect.sha256}`))
      assert.ok(!c.put.join(' ').match(/secret|token|access-key/i))
    }
    const unsigned = await inspectBuild({ dir, releaseFile: emptyFile, deps: { authenticode: () => ({ status: 'NotSigned', signer: '' }) } })
    assert.equal(unsigned.record.signature, 'unsigned')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('inspectBuild fails closed: missing artifact, hash mismatch, bad version, duplicate version', async () => {
  const cases: Array<[string, Parameters<typeof fixtureDir>[1], RegExp, typeof emptyFile?]> = [
    ['missing blockmap', { blockmap: false }, /missing blockmap/],
    ['sha512 mismatch', { yml: (y) => y.replaceAll(/sha512: .+/g, `sha512: ${'A'.repeat(86)}==`) }, /SHA-512 does not match/],
    ['size mismatch', { yml: (y) => y.replace(/size: \d+/, 'size: 5') }, /size does not match/],
    ['bad version', { yml: (y) => y.replace('version: 0.2.0', 'version: latest') }, /semver|immutableKey|r2Key|version/],
    ['missing installer', { yml: (y) => y.replaceAll('AI-Desk-Setup-0.2.0.exe', 'Nope.exe') }, /missing installer/],
  ]
  for (const [name, opts, pattern] of cases) {
    const { dir } = fixtureDir('0.2.0', opts)
    try {
      await assert.rejects(inspectBuild({ dir, releaseFile: emptyFile, deps: signed }), pattern, name)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }
  const { dir } = fixtureDir('0.2.0')
  try {
    await assert.rejects(inspectBuild({ dir, releaseFile: { schemaVersion: 1, releases: [build('0.2.0').record] }, deps: signed }), /already exists/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  const empty = mkdtempSync(join(tmpdir(), 'aidesk-release-'))
  try {
    await assert.rejects(inspectBuild({ dir: empty, releaseFile: emptyFile, deps: signed }), /missing latest\.yml/)
  } finally {
    rmSync(empty, { recursive: true, force: true })
  }
})

test('transitions: approve/publish need signature + approval; publish switches current; withdraw rolls back', () => {
  const staged = (v: string, sig: 'signed' | 'unsigned' = 'signed') => build(v, { status: 'staged', approved: false, signature: sig }).record
  let file = { schemaVersion: 1, releases: [build('0.2.0').record, staged('0.3.0')] }
  assert.throws(() => applyTransition(file, 'publish', '0.3.0'), /approve before publishing/)
  file = applyTransition(file, 'approve', '0.3.0').file
  const pub = applyTransition(file, 'publish', '0.3.0')
  assert.deepEqual(pub.changes, { currentBefore: '0.2.0', currentAfter: '0.3.0' })
  const back = applyTransition(pub.file, 'withdraw', '0.3.0')
  assert.deepEqual(back.changes, { currentBefore: '0.3.0', currentAfter: '0.2.0' })
  assert.throws(() => applyTransition(back.file, 'withdraw', '0.3.0'), /already withdrawn/)
  assert.throws(() => applyTransition(back.file, 'publish', '0.3.0'), /only staged/)
  const unsigned = { schemaVersion: 1, releases: [staged('0.4.0', 'unsigned')] }
  assert.throws(() => applyTransition(unsigned, 'approve', '0.4.0'), /unsigned/)
  assert.throws(() => applyTransition(unsigned, 'publish', '0.4.0'), /approve|unsigned/)
  assert.throws(() => applyTransition(unsigned, 'approve', '9.9.9'), /no release/)
  assert.throws(() => addStagedRecord({ schemaVersion: 1, releases: [build('0.2.0').record] }, build('0.2.0').record), /duplicate/)
})

test('parseLatestYml reads the electron-builder format', () => {
  const b = build('1.2.3-beta.1')
  const y = parseLatestYml(b.yml)
  assert.equal(y.version, '1.2.3-beta.1')
  assert.equal(y.path, b.record.artifacts.installer.fileName)
  assert.equal(y.sha512, b.record.artifacts.installer.sha512)
  assert.equal(y.releaseDate, '2026-11-01T10:00:00.000Z')
  assert.deepEqual(y.files, [{ url: b.record.artifacts.installer.fileName, sha512: b.record.artifacts.installer.sha512, size: b.installer.length }])
})

test('release data file round-trips through the script markers without touching the rest of the file', async () => {
  // @ts-expect-error plain ESM script without type declarations
  const { readReleaseFile, writeReleaseFile, RELEASES_FILE } = await import('../scripts/release.mjs')
  const { readFileSync, copyFileSync } = await import('node:fs')
  const dir = mkdtempSync(join(tmpdir(), 'aidesk-data-'))
  try {
    const copy = join(dir, 'releaseData.ts')
    copyFileSync(RELEASES_FILE, copy)
    assert.deepEqual(readReleaseFile(copy), { schemaVersion: 1, releases: [] })
    const next = { schemaVersion: 1, releases: [build('0.2.0', { status: 'staged', approved: false }).record] }
    writeReleaseFile(next, copy)
    assert.deepEqual(readReleaseFile(copy), next)
    const text = readFileSync(copy, 'utf8')
    assert.match(text, /^\/\/ GENERATED by scripts\/release\.mjs/)
    assert.match(text, /export const RELEASE_DATA: unknown = \/\* RELEASES:BEGIN \*\//)
    assert.ok(!/with \{ type/.test(readFileSync(join(import.meta.dirname, '..', 'server', 'releaseCatalog.ts'), 'utf8')), 'no JSON import attributes in Functions code')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
