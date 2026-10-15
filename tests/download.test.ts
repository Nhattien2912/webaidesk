import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  handleDownload,
  handleLatestManifest,
  latestManifest,
  objectSha256,
  parseRange,
  type DownloadEnv,
  type R2BucketLike,
  type R2ObjectBodyLike,
  type R2ObjectLike,
} from '../server/downloadHandler.ts'
import { RELEASE_CATALOG, type ReleaseEntry } from '../server/releaseCatalog.ts'
import { loadDownloadState, validateReleaseManifest } from '../src/lib/releaseManifest.ts'

const ORIGIN = 'https://webaidesk.pages.dev'
const BYTES = new Uint8Array(Array.from({ length: 1000 }, (_, i) => i % 251))
const SHA = createHash('sha256').update(BYTES).digest('hex')
const FILE = 'AI-Desk-Setup-0.1.0-beta.1.exe'
const KEY = `releases/0.1.0-beta.1/${FILE}`

function entry(overrides: Partial<ReleaseEntry> = {}): ReleaseEntry {
  return {
    fileName: FILE,
    r2Key: KEY,
    kind: 'installer',
    version: '0.1.0-beta.1',
    channel: 'public-beta',
    releasedAt: '2026-11-01',
    minOs: 'Windows 10/11 64-bit',
    sizeBytes: BYTES.length,
    sha256: SHA,
    signature: 'signed',
    signer: 'CN=Example Signer',
    status: 'published',
    approved: true,
    ...overrides,
  }
}

interface FakeObject {
  bytes: Uint8Array
  meta?: Record<string, string>
  checksum?: ArrayBuffer
  etag?: string
}

function bucket(objects: Record<string, FakeObject>, opts: { throwOn?: 'head' | 'get'; etagDrift?: boolean } = {}) {
  const calls: Array<{ op: string; key: string; range?: { offset: number; length?: number } }> = []
  const meta = (key: string, o: FakeObject): R2ObjectLike => ({
    key,
    size: o.bytes.length,
    httpEtag: o.etag ?? '"etag-1"',
    uploaded: new Date('2026-11-01T00:00:00Z'),
    customMetadata: o.meta,
    checksums: o.checksum ? { sha256: o.checksum } : {},
  })
  const b: R2BucketLike = {
    async head(key) {
      calls.push({ op: 'head', key })
      if (opts.throwOn === 'head') throw new Error('network down')
      const o = objects[key]
      return o ? meta(key, o) : null
    },
    async get(key, options) {
      calls.push({ op: 'get', key, range: options?.range })
      if (opts.throwOn === 'get') throw new Error('network down')
      const o = objects[key]
      if (!o) return null
      const offset = options?.range?.offset ?? 0
      const length = options?.range?.length ?? o.bytes.length - offset
      const slice = o.bytes.slice(offset, offset + length)
      const m = meta(key, o)
      const body = new ReadableStream({
        start(c) {
          c.enqueue(slice)
          c.close()
        },
      })
      return { ...m, httpEtag: opts.etagDrift ? '"etag-2"' : m.httpEtag, body } satisfies R2ObjectBodyLike
    },
  }
  return { b, calls }
}

const goodObjects = (): Record<string, FakeObject> => ({ [KEY]: { bytes: BYTES, meta: { sha256: SHA } } })

function req(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new Request(`${ORIGIN}${path}`, { method: init.method ?? 'GET', headers: init.headers })
}

async function download(env: DownloadEnv, name: string | string[] | undefined, init?: Parameters<typeof req>[1], catalog = [entry()]) {
  return handleDownload(req(`/api/download/${name}`, init), env, name, { catalog })
}

const body = async (res: Response) => new Uint8Array(await res.arrayBuffer())
const json = async (res: Response) => (await res.json()) as { ok: boolean; error?: string }

// ---------- defaults ----------
test('shipped catalog has no downloadable release (fail-closed) and no internal RC1 build', () => {
  assert.equal(latestManifest(RELEASE_CATALOG, ORIGIN, {}), null)
  assert.ok(!RELEASE_CATALOG.some((e) => /rc1|alpha/i.test(`${e.fileName} ${e.version} ${e.r2Key}`)))
})

// ---------- GET / HEAD ----------
test('GET streams the approved file with download headers', async () => {
  const { b, calls } = bucket(goodObjects())
  const res = await download({ RELEASES: b }, FILE)
  assert.equal(res.status, 200)
  assert.deepEqual(await body(res), BYTES)
  assert.equal(res.headers.get('content-type'), 'application/octet-stream')
  assert.equal(res.headers.get('content-disposition'), `attachment; filename="${FILE}"`)
  assert.equal(res.headers.get('content-length'), String(BYTES.length))
  assert.equal(res.headers.get('accept-ranges'), 'bytes')
  assert.equal(res.headers.get('etag'), '"etag-1"')
  assert.equal(res.headers.get('cache-control'), 'no-cache')
  assert.equal(res.headers.get('x-aidesk-sha256'), SHA)
  assert.ok(res.headers.get('last-modified'))
  // The R2 key comes from the catalog, never from the request.
  assert.ok(calls.every((c) => c.key === KEY))
  assert.equal(calls.find((c) => c.op === 'get')?.range, undefined)
})

test('HEAD returns headers only and never reads the body', async () => {
  const { b, calls } = bucket(goodObjects())
  const res = await download({ RELEASES: b }, FILE, { method: 'HEAD' })
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-length'), String(BYTES.length))
  assert.equal((await body(res)).length, 0)
  assert.ok(!calls.some((c) => c.op === 'get'))
})

// ---------- Range ----------
test('Range requests: 206 with Content-Range, suffix/open ranges, 416 and ignored multi-range', async () => {
  const { b, calls } = bucket(goodObjects())
  const partial = await download({ RELEASES: b }, FILE, { headers: { range: 'bytes=100-199' } })
  assert.equal(partial.status, 206)
  assert.equal(partial.headers.get('content-range'), `bytes 100-199/${BYTES.length}`)
  assert.equal(partial.headers.get('content-length'), '100')
  assert.deepEqual(await body(partial), BYTES.slice(100, 200))
  assert.deepEqual(calls.at(-1)?.range, { offset: 100, length: 100 })

  const open = await download({ RELEASES: b }, FILE, { headers: { range: 'bytes=990-' } })
  assert.equal(open.status, 206)
  assert.deepEqual(await body(open), BYTES.slice(990))

  const suffix = await download({ RELEASES: b }, FILE, { headers: { range: 'bytes=-10' } })
  assert.equal(suffix.headers.get('content-range'), `bytes 990-999/${BYTES.length}`)

  const clamp = await download({ RELEASES: b }, FILE, { headers: { range: 'bytes=900-5000' } })
  assert.equal(clamp.headers.get('content-range'), `bytes 900-999/${BYTES.length}`)

  const bad = await download({ RELEASES: b }, FILE, { headers: { range: 'bytes=5000-6000' } })
  assert.equal(bad.status, 416)
  assert.equal(bad.headers.get('content-range'), `bytes */${BYTES.length}`)

  const multi = await download({ RELEASES: b }, FILE, { headers: { range: 'bytes=0-1,5-6' } })
  assert.equal(multi.status, 200)

  const headRange = await download({ RELEASES: b }, FILE, { method: 'HEAD', headers: { range: 'bytes=0-9' } })
  assert.equal(headRange.status, 206)
  assert.equal(headRange.headers.get('content-length'), '10')
})

test('If-Range with a stale ETag returns the full file; If-None-Match returns 304', async () => {
  const { b } = bucket(goodObjects())
  const stale = await download({ RELEASES: b }, FILE, { headers: { range: 'bytes=0-9', 'if-range': '"old"' } })
  assert.equal(stale.status, 200)
  const fresh = await download({ RELEASES: b }, FILE, { headers: { range: 'bytes=0-9', 'if-range': '"etag-1"' } })
  assert.equal(fresh.status, 206)
  const cached = await download({ RELEASES: b }, FILE, { headers: { 'if-none-match': '"etag-1"' } })
  assert.equal(cached.status, 304)
})

test('parseRange edge cases', () => {
  assert.deepEqual(parseRange(null, 10), { kind: 'full' })
  assert.deepEqual(parseRange('bytes=-', 10), { kind: 'full' })
  assert.deepEqual(parseRange('items=0-1', 10), { kind: 'full' })
  assert.deepEqual(parseRange('bytes=5-2', 10), { kind: 'full' })
  assert.deepEqual(parseRange('bytes=-0', 10), { kind: 'unsatisfiable' })
  assert.deepEqual(parseRange('bytes=-50', 10), { kind: 'partial', offset: 0, length: 10 })
})

// ---------- refusals ----------
test('invalid file names are rejected before touching R2', async () => {
  const { b, calls } = bucket(goodObjects())
  for (const name of ['../secret.exe', 'releases/x.exe', 'a.zip', '.hidden.exe', 'a b.exe', '%2e%2e.exe', '', undefined]) {
    const res = await download({ RELEASES: b }, name as string | undefined)
    assert.equal(res.status, 400, String(name))
    assert.equal((await json(res)).error, 'invalid_filename')
  }
  const multi = await download({ RELEASES: b }, ['releases', FILE])
  assert.equal(multi.status, 400)
  assert.equal(calls.length, 0)
})

test('unknown, unpublished, unapproved and unsigned releases all return 404 without touching R2', async () => {
  const { b, calls } = bucket(goodObjects())
  const cases: ReleaseEntry[][] = [
    [],
    [entry({ status: 'unpublished' })],
    [entry({ approved: false })],
    [entry({ signature: 'unsigned' })],
    [entry({ sha256: 'abc' })],
    [entry({ sizeBytes: 0 })],
    [entry({ version: 'latest' })],
    [entry({ r2Key: '../other' })],
    [entry({ r2Key: '/abs' })],
  ]
  for (const catalog of cases) {
    const res = await download({ RELEASES: b }, FILE, undefined, catalog)
    assert.equal(res.status, 404, JSON.stringify(catalog))
    assert.equal((await json(res)).error, 'not_found')
  }
  assert.equal(calls.length, 0)
  const other = await download({ RELEASES: b }, 'Other-Setup.exe')
  assert.equal(other.status, 404)
})

test('unsigned is served only when the server explicitly allows it', async () => {
  const { b } = bucket(goodObjects())
  const blocked = await download({ RELEASES: b }, FILE, undefined, [entry({ signature: 'unsigned' })])
  assert.equal(blocked.status, 404)
  const allowed = await download({ RELEASES: b, ALLOW_UNSIGNED_DOWNLOAD: 'true' }, FILE, undefined, [entry({ signature: 'unsigned' })])
  assert.equal(allowed.status, 200)
})

test('missing binding, missing object and storage failures fail closed', async () => {
  const noBinding = await download({}, FILE)
  assert.equal(noBinding.status, 503)
  assert.equal((await json(noBinding)).error, 'not_configured')

  const empty = bucket({})
  const missing = await download({ RELEASES: empty.b }, FILE)
  assert.equal(missing.status, 503)
  assert.equal((await json(missing)).error, 'release_unavailable')

  for (const where of ['head', 'get'] as const) {
    const broken = bucket(goodObjects(), { throwOn: where })
    const res = await download({ RELEASES: broken.b }, FILE)
    assert.equal(res.status, 502, where)
    assert.equal((await json(res)).error, 'storage_error')
    assert.equal(res.headers.get('cache-control'), 'no-store')
  }

  const drift = bucket(goodObjects(), { etagDrift: true })
  const changed = await download({ RELEASES: drift.b }, FILE)
  assert.equal((await json(changed)).error, 'integrity_mismatch')
})

test('checksum metadata: missing, wrong or size mismatch => 503; native R2 SHA-256 checksum accepted', async () => {
  const cases: Array<[string, FakeObject]> = [
    ['no metadata', { bytes: BYTES }],
    ['wrong sha', { bytes: BYTES, meta: { sha256: 'f'.repeat(64) } }],
    ['malformed sha', { bytes: BYTES, meta: { sha256: 'xyz' } }],
    ['size mismatch', { bytes: BYTES.slice(1), meta: { sha256: SHA } }],
  ]
  for (const [name, obj] of cases) {
    const { b } = bucket({ [KEY]: obj })
    const res = await download({ RELEASES: b }, FILE)
    assert.equal(res.status, 503, name)
    assert.equal((await json(res)).error, 'integrity_mismatch', name)
  }
  const digest = createHash('sha256').update(BYTES).digest()
  const native = digest.buffer.slice(digest.byteOffset, digest.byteOffset + digest.byteLength) as ArrayBuffer
  const { b } = bucket({ [KEY]: { bytes: BYTES, checksum: native } })
  assert.equal((await download({ RELEASES: b }, FILE)).status, 200)
  assert.equal(objectSha256({ key: 'k', size: 1, httpEtag: '"e"', uploaded: new Date(), customMetadata: { sha256: SHA.toUpperCase() } }), SHA)
})

test('only GET and HEAD are allowed', async () => {
  const { b } = bucket(goodObjects())
  const res = await download({ RELEASES: b }, FILE, { method: 'POST' })
  assert.equal(res.status, 405)
  assert.equal(res.headers.get('allow'), 'GET, HEAD')
})

// ---------- latest manifest ----------
test('/api/releases/latest: 404 no_release until a release is approved', async () => {
  const res = await handleLatestManifest(req('/api/releases/latest'), {}, { catalog: [entry({ approved: false })] })
  assert.equal(res.status, 404)
  assert.equal((await json(res)).error, 'no_release')
  const shipped = await handleLatestManifest(req('/api/releases/latest'), {})
  assert.equal(shipped.status, 404)
})

test('/api/releases/latest returns a manifest the website accepts, pointing at /api/download on the production host', async () => {
  const older = entry({ fileName: 'AI-Desk-Setup-0.0.9.exe', r2Key: 'releases/0.0.9/AI-Desk-Setup-0.0.9.exe', version: '0.0.9', releasedAt: '2026-10-20' })
  const portable = entry({ kind: 'portable', fileName: 'AI-Desk-Portable-0.1.0-beta.1.exe', r2Key: 'releases/0.1.0-beta.1/p.exe' })
  const res = await handleLatestManifest(req('/api/releases/latest'), {}, { catalog: [older, entry(), portable] })
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8')
  const raw = await res.json()
  const check = validateReleaseManifest(raw, { allowedHosts: ['webaidesk.pages.dev'], allowUnsigned: false })
  assert.ok(check.ok)
  if (check.ok) {
    assert.equal(check.manifest.version, '0.1.0-beta.1')
    assert.equal(check.primary.url, `${ORIGIN}/api/download/${FILE}`)
    assert.equal(check.manifest.files.length, 2)
  }
  // Frontend loader accepts it end-to-end (same-origin JSON).
  const fetchImpl = (async () => new Response(JSON.stringify(raw), { headers: { 'content-type': 'application/json' } })) as typeof fetch
  const state = await loadDownloadState('/api/releases/latest', { allowedHosts: ['webaidesk.pages.dev'], allowUnsigned: false }, fetchImpl)
  assert.equal(state.kind, 'available')
  // A preview/other host is not in the default allowlist -> stays closed.
  const preview = await handleLatestManifest(new Request('https://abc.webaidesk.pages.dev/api/releases/latest'), {}, { catalog: [entry()] })
  const closed = validateReleaseManifest(await preview.json(), { allowedHosts: ['webaidesk.pages.dev'], allowUnsigned: false })
  assert.equal(closed.ok, false)
})

test('legacy static manifest (R2 custom-domain style) still validates with an explicit host allowlist', async () => {
  const legacy = {
    schemaVersion: 1,
    channel: 'public-beta',
    status: 'published',
    approved: true,
    version: '0.1.0-beta.1',
    releasedAt: '2026-11-01',
    minOs: 'Windows 10/11 64-bit',
    files: [{ kind: 'installer', fileName: FILE, url: `https://downloads.example.com/${FILE}`, sizeBytes: 10, sha256: SHA, signature: 'signed' }],
  }
  assert.ok(validateReleaseManifest(legacy, { allowedHosts: ['downloads.example.com'], allowUnsigned: false }).ok)
  assert.equal(validateReleaseManifest(legacy, { allowedHosts: ['webaidesk.pages.dev'], allowUnsigned: false }).ok, false)
})
