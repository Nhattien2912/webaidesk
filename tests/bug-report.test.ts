// Bug report V1: public intake (POST /api/bug-report) and Studio admin list/download. All data is synthetic; D1 is the
// in-memory local D1 from wrangler.test.jsonc and R2 is an in-memory fake. Nothing touches a real database or bucket.
import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getPlatformProxy } from 'wrangler'
import {
  GLOBAL_DAILY_MAX,
  RATE_LIMIT_DAY_MS,
  RATE_LIMIT_HOUR_MS,
  RATE_LIMIT_PER_DAY,
  RATE_LIMIT_PER_HOUR,
  handleBugReport,
  type BugReportBucket,
  type BugReportDeps,
  type BugReportEnv,
} from '../server/bugReportHandler.ts'
import {
  CROCKFORD,
  MAX_BUG_REPORT_BYTES,
  REPORT_ID_RE,
  bundleKeyFor,
  checkBugReport,
  extractErrorCodes,
  extractWorkers,
  randomReportId,
  reportIdFromBytes,
} from '../server/bugReportRules.ts'
import { handleAdminContent } from '../server/cms/handler.ts'
import { csrfToken, type VerifyAccess } from '../server/cms/auth.ts'
import type { AccessIdentity, CmsEnv, R2BucketLike, R2ObjectLike } from '../server/cms/types.ts'
import { bugReportQuery, describeBugReportsError, BugReportsError } from '../src/lib/bugReportsApi.ts'
import { onRequest as bugReportRoute } from '../functions/api/bug-report.ts'

const identity: AccessIdentity = { sub: 'owner', email: 'owner@example.com', exp: 2_000_000_000 }
const verify: VerifyAccess = async () => identity
const T0 = Date.UTC(2026, 10, 18, 9, 0, 0) // 2026-11-18
let proxy: Awaited<ReturnType<typeof getPlatformProxy<CmsEnv>>>
let db: NonNullable<CmsEnv['CMS_DB']>
let clock = T0
let ids: string[] = []
let seq = 0

class FakeBucket implements BugReportBucket, R2BucketLike {
  objects = new Map<string, { body: Uint8Array; contentType?: string; custom?: Record<string, string> }>()
  failPut = false
  async put(key: string, body: ArrayBuffer, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }) {
    if (this.failPut) throw new Error('r2 down')
    this.objects.set(key, { body: new Uint8Array(body.slice(0)), contentType: options?.httpMetadata?.contentType, custom: options?.customMetadata })
    return null
  }
  async get(key: string): Promise<R2ObjectLike | null> {
    const object = this.objects.get(key)
    if (!object) return null
    return { body: new Blob([object.body as BlobPart]).stream(), httpEtag: '"e"', writeHttpMetadata() {} }
  }
  async delete(key: string) { this.objects.delete(key) }
}
let bucket: FakeBucket

const nextId = () => ids.shift() ?? `BR-${String(seq++).padStart(6, '0')}`
const deps = (): BugReportDeps => ({ now: () => clock, randomId: nextId })
const intakeEnv = (extra: Partial<BugReportEnv> = {}): BugReportEnv => ({ CMS_DB: db, BUG_REPORTS: bucket, IP_HASH_SALT: 'test-salt', ...extra })
const adminEnv = (extra: Partial<CmsEnv> = {}): CmsEnv => ({ ...proxy.env, BUG_REPORTS: bucket, ...extra })

function report(over: Record<string, unknown> = {}) {
  return {
    schema: 'AIDESK_BUG_REPORT_V1',
    appVersion: '0.5.0-beta.1',
    channel: 'beta',
    os: 'Windows 11 Home 10.0.22631',
    description: 'GPT → Antigravity task never returned.',
    bundle: { failures: [{ errorCode: 'AG_DISPATCH_TIMEOUT', worker: 'Antigravity' }], workers: ['antigravity', { id: 'codex' }] },
    ...over,
  }
}

function post(body: unknown, opts: { ip?: string; headers?: Record<string, string>; raw?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'cf-connecting-ip': opts.ip ?? '203.0.113.7', ...opts.headers }
  return new Request('https://webaidesk.pages.dev/api/bug-report', { method: 'POST', headers, body: opts.raw ?? JSON.stringify(body) })
}
const send = (body: unknown, opts: Parameters<typeof post>[1] = {}, env = intakeEnv()) => handleBugReport(post(body, opts), env, deps())
const j = async <T = Record<string, any>>(r: Response) => (await r.json()) as T // eslint-disable-line @typescript-eslint/no-explicit-any
const count = async (sql: string, ...v: unknown[]) => Number((await db.prepare(sql).bind(...v).first<{ c: number }>())!.c)

async function admin(path: string, env: CmsEnv = adminEnv(), opts: { token?: string | null; method?: string } = {}) {
  const headers: Record<string, string> = {}
  if (opts.token !== null) headers['cf-access-jwt-assertion'] = opts.token ?? 'test-token'
  const method = opts.method ?? 'GET'
  if (method !== 'GET') Object.assign(headers, { origin: 'https://security.test', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', 'x-csrf-token': await csrfToken(identity, env) })
  await db.prepare('DELETE FROM cms_rate_limits').run() // the per-minute admin limiter is not under test here
  return handleAdminContent(new Request(`https://security.test/api/admin/${path}`, { method, headers, body: method === 'GET' ? undefined : '{}' }), env, path.split('?')[0]!.split('/'), { verifyAccess: verify })
}

before(async () => {
  proxy = await getPlatformProxy<CmsEnv>({ configPath: 'wrangler.test.jsonc', persist: false, remoteBindings: false })
  db = proxy.env.CMS_DB!
  for (const file of ['migrations/0003_studio_rate_limits.sql', 'migrations/0007_bug_reports.sql'])
    for (const sql of fs.readFileSync(file, 'utf8').replace(/^--.*$/gm, '').split(/;\s*(?:\r?\n|$)/).map(v => v.trim()).filter(Boolean)) await db.prepare(sql).run()
})
after(async () => { await proxy.dispose() })
beforeEach(async () => {
  await db.prepare('DELETE FROM bug_reports').run()
  await db.prepare('DELETE FROM bug_report_attempts').run()
  bucket = new FakeBucket()
  clock = T0
  ids = []
})

// ---------- contract helpers ----------
test('BR-RULES-01 report ids are BR- + 6 Crockford base32 chars and never use I, L, O, U', () => {
  assert.equal(reportIdFromBytes(new Uint8Array([0, 1, 31, 32, 255, 18])), 'BR-01Z0ZJ')
  for (let i = 0; i < 2000; i++) {
    const id = randomReportId()
    assert.match(id, REPORT_ID_RE)
    assert.doesNotMatch(id.slice(3), /[ILOU]/)
  }
  assert.equal(CROCKFORD.length, 32)
  assert.equal(bundleKeyFor('BR-ABC123', T0), 'bug-reports/2026-11/BR-ABC123.json')
  assert.equal(bundleKeyFor('BR-ABC123', Date.UTC(2027, 0, 1)), 'bug-reports/2027-01/BR-ABC123.json')
})

test('BR-RULES-02 error codes come from bundle.failures[].errorCode, workers from workers[] and failures[]: distinct, bounded, sanitized', () => {
  const bundle = {
    failures: [
      { errorCode: 'AG_DISPATCH_TIMEOUT', worker: 'Antigravity' },
      { errorCode: 'AG_DISPATCH_TIMEOUT', workerId: 'codex' },
      { errorCode: 'bad code with spaces' },
      { errorCode: 42, adapter: 'claude-code' },
      'not an object',
      { errorCode: '<script>' },
    ],
    workers: ['Antigravity', { name: 'OpenCode' }, { kind: 'x'.repeat(65) }, 7, null],
  }
  assert.deepEqual(extractErrorCodes(bundle), ['AG_DISPATCH_TIMEOUT'])
  assert.deepEqual(extractWorkers(bundle), ['antigravity', 'opencode', 'codex', 'claude-code'])
  assert.deepEqual(extractErrorCodes({}), [])
  assert.deepEqual(extractWorkers({ failures: 'x', workers: {} }), [])
  const many = { failures: Array.from({ length: 50 }, (_, i) => ({ errorCode: `E${i}`, worker: `w${i}` })) }
  assert.equal(extractErrorCodes(many).length, 20)
  assert.equal(extractWorkers(many).length, 20)
})

test('BR-RULES-03 payload validation follows the fixed contract', () => {
  assert.equal(checkBugReport(report()).ok, true)
  assert.equal(checkBugReport(report({ description: '' })).ok, true, 'empty description is allowed')
  assert.equal(checkBugReport(report({ description: 'a'.repeat(4000) })).ok, true)
  assert.equal(checkBugReport(report({ description: '😀'.repeat(4000) })).ok, true, '4000 code points (8000 UTF-16 units) is allowed')
  assert.equal(checkBugReport({ ...report(), extra: 'ignored' }).ok, true)
  const bad: Array<[Record<string, unknown>, string]> = [
    [{ schema: 'AIDESK_BUG_REPORT_V2' }, 'INVALID_SCHEMA'],
    [{ schema: undefined }, 'INVALID_SCHEMA'],
    [{ appVersion: '' }, 'INVALID_APP_VERSION'],
    [{ appVersion: '0.5.0 beta' }, 'INVALID_APP_VERSION'],
    [{ appVersion: 5 }, 'INVALID_APP_VERSION'],
    [{ channel: 'nightly' }, 'INVALID_CHANNEL'],
    [{ os: '' }, 'INVALID_OS'],
    [{ os: 'Win\n11' }, 'INVALID_OS'],
    [{ os: 'x'.repeat(129) }, 'INVALID_OS'],
    [{ description: 'a'.repeat(4001) }, 'INVALID_DESCRIPTION'],
    [{ description: null }, 'INVALID_DESCRIPTION'],
    [{ bundle: [] }, 'INVALID_BUNDLE'],
    [{ bundle: null }, 'INVALID_BUNDLE'],
    [{ bundle: 'text' }, 'INVALID_BUNDLE'],
  ]
  for (const [over, code] of bad) assert.deepEqual(checkBugReport(report(over)), { ok: false, error: code }, JSON.stringify(over))
  assert.deepEqual(checkBugReport([report()]), { ok: false, error: 'INVALID_SCHEMA' })
})

// ---------- intake ----------
test('BR-INTAKE-01 a valid report returns { ok, reportId }, stores the metadata row and the exact body in the private bucket', async () => {
  const raw = JSON.stringify(report())
  const r = await send(null, { raw })
  assert.equal(r.status, 200)
  assert.equal(r.headers.get('cache-control'), 'no-store')
  const body = await j(r)
  assert.equal(body.ok, true)
  assert.match(body.reportId, REPORT_ID_RE)
  assert.deepEqual(Object.keys(body).sort(), ['ok', 'reportId'])
  const row = await db.prepare('SELECT * FROM bug_reports WHERE id = ?1').bind(body.reportId).first<Record<string, any>>() // eslint-disable-line @typescript-eslint/no-explicit-any
  assert.ok(row)
  assert.equal(row.created_at, T0)
  assert.equal(row.app_version, '0.5.0-beta.1')
  assert.equal(row.channel, 'beta')
  assert.equal(row.os, 'Windows 11 Home 10.0.22631')
  assert.equal(row.description, 'GPT → Antigravity task never returned.')
  assert.equal(row.bundle_key, `bug-reports/2026-11/${body.reportId}.json`)
  assert.equal(row.bundle_bytes, new TextEncoder().encode(raw).byteLength)
  assert.deepEqual(JSON.parse(row.error_codes), ['AG_DISPATCH_TIMEOUT'])
  assert.deepEqual(JSON.parse(row.workers), ['antigravity', 'codex'])
  assert.match(row.ip_hash, /^[0-9a-f]{64}$/)
  assert.notEqual(row.ip_hash, '203.0.113.7')
  const stored = bucket.objects.get(row.bundle_key)
  assert.ok(stored)
  assert.equal(new TextDecoder().decode(stored.body), raw, 'R2 holds exactly what the user previewed and sent')
  assert.equal(stored.contentType, 'application/json; charset=utf-8')
  assert.deepEqual(stored.custom, { reportId: body.reportId, receivedAt: String(T0) })
})

test('BR-INTAKE-02 the IP is only stored as a salted hash', async () => {
  ids = ['BR-AAAAA1', 'BR-AAAAA2']
  await send(report())
  await send(report(), {}, intakeEnv({ IP_HASH_SALT: 'other-salt' }))
  const hashes = (await db.prepare('SELECT ip_hash FROM bug_reports ORDER BY id').all<{ ip_hash: string }>()).results!.map(r => r.ip_hash)
  assert.equal(hashes.length, 2)
  assert.notEqual(hashes[0], hashes[1], 'salt changes the hash')
  const dump = JSON.stringify((await db.prepare('SELECT * FROM bug_reports').all()).results) + JSON.stringify((await db.prepare('SELECT * FROM bug_report_attempts').all()).results)
  assert.equal(dump.includes('203.0.113.7'), false)
})

test('BR-INTAKE-03 Content-Length over 1 MiB is rejected with 413 before the body is read', async () => {
  let touched = false
  const fake = {
    method: 'POST',
    url: 'https://webaidesk.pages.dev/api/bug-report',
    headers: new Headers({ 'content-type': 'application/json', 'content-length': String(MAX_BUG_REPORT_BYTES + 1) }),
    get body() { touched = true; throw new Error('body must not be read') },
    text() { touched = true; throw new Error('body must not be read') },
  } as unknown as Request
  const r = await handleBugReport(fake, intakeEnv(), deps())
  assert.equal(r.status, 413)
  assert.deepEqual(await j(r), { ok: false, error: 'PAYLOAD_TOO_LARGE' })
  assert.equal(touched, false)
})

test('BR-INTAKE-04 the 1 MiB limit is also enforced on the stream when Content-Length is missing or lies', async () => {
  const chunk = new Uint8Array(64 * 1024).fill(0x20)
  let pulled = 0
  const stream = new ReadableStream<Uint8Array>({ pull(controller) { pulled++; if (pulled > 40) controller.close(); else controller.enqueue(chunk) } })
  const r = await handleBugReport(new Request('https://webaidesk.pages.dev/api/bug-report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half' } as RequestInit), intakeEnv(), deps())
  assert.equal(r.status, 413)
  assert.deepEqual(await j(r), { ok: false, error: 'PAYLOAD_TOO_LARGE' })
  assert.ok(pulled <= 18, `stopped reading soon after the limit (pulled ${pulled} chunks)`)
  assert.equal(await count('SELECT COUNT(*) AS c FROM bug_reports'), 0)

  // A body of exactly 1 MiB is still accepted.
  const base = JSON.stringify(report({ bundle: { pad: '' } }))
  const exact = JSON.stringify(report({ bundle: { pad: 'x'.repeat(MAX_BUG_REPORT_BYTES - new TextEncoder().encode(base).byteLength) } }))
  assert.equal(new TextEncoder().encode(exact).byteLength, MAX_BUG_REPORT_BYTES)
  assert.equal((await send(null, { raw: exact })).status, 200)
  const over = JSON.stringify(report({ bundle: { pad: 'x'.repeat(MAX_BUG_REPORT_BYTES - new TextEncoder().encode(base).byteLength + 1) } }))
  assert.equal((await send(null, { raw: over, ip: '198.51.100.1' })).status, 413)
})

test('BR-INTAKE-05 malformed requests get 400 with a stable error code and store nothing', async () => {
  const cases: Array<[Request, number, string]> = [
    [post(report(), { headers: { 'content-type': 'text/plain' } }), 400, 'INVALID_CONTENT_TYPE'],
    [post(report(), { headers: { 'content-type': 'application/x-www-form-urlencoded' } }), 400, 'INVALID_CONTENT_TYPE'],
    [post(null, { raw: '{"schema":' }), 400, 'INVALID_JSON'],
    [post(null, { raw: '' }), 400, 'INVALID_JSON'],
    [new Request('https://webaidesk.pages.dev/api/bug-report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: new Uint8Array([0x7b, 0xff, 0x7d]) }), 400, 'INVALID_JSON'],
    [post(report({ schema: 'X' })), 400, 'INVALID_SCHEMA'],
    [post(report({ channel: 'prod' })), 400, 'INVALID_CHANNEL'],
    [post(report({ description: 'a'.repeat(4001) })), 400, 'INVALID_DESCRIPTION'],
    [post(report({ bundle: [1] })), 400, 'INVALID_BUNDLE'],
    [post(report(), { headers: { origin: 'https://evil.example' } }), 400, 'ORIGIN_REJECTED'],
  ]
  for (const [request, status, error] of cases) {
    const r = await handleBugReport(request, intakeEnv(), deps())
    assert.equal(r.status, status, error)
    assert.deepEqual(await j(r), { ok: false, error })
  }
  assert.equal((await send(report(), { headers: { 'content-type': 'application/json; charset=utf-8' } })).status, 200, 'charset parameter is fine')
  assert.equal((await send(report(), { headers: { origin: 'https://webaidesk.pages.dev' } })).status, 200, 'same origin is fine')
  assert.equal(await count('SELECT COUNT(*) AS c FROM bug_reports'), 2)
  const get = await handleBugReport(new Request('https://webaidesk.pages.dev/api/bug-report'), intakeEnv(), deps())
  assert.equal(get.status, 405)
  assert.equal(get.headers.get('allow'), 'POST')
})

test('BR-INTAKE-06 rate limit: 5 per hour and 20 per day per IP hash, other IPs unaffected', async () => {
  for (let i = 0; i < RATE_LIMIT_PER_HOUR; i++) { clock += 1000; assert.equal((await send(report())).status, 200) }
  clock += 1000
  const limited = await send(report())
  assert.equal(limited.status, 429)
  assert.deepEqual(await j(limited), { ok: false, error: 'RATE_LIMITED' })
  assert.equal((await send(report(), { ip: '198.51.100.9' })).status, 200, 'another IP is not limited')

  // Spread over the day: the hourly window frees up, the daily cap of 20 still holds.
  let accepted = RATE_LIMIT_PER_HOUR
  for (let hour = 1; hour < 8 && accepted < RATE_LIMIT_PER_DAY + 2; hour++) {
    clock = T0 + hour * RATE_LIMIT_HOUR_MS + 5000
    for (let i = 0; i < RATE_LIMIT_PER_HOUR; i++) { clock += 1000; if ((await send(report())).status === 200) accepted++ }
  }
  assert.equal(accepted, RATE_LIMIT_PER_DAY)
  clock = T0 + RATE_LIMIT_DAY_MS + 10 * RATE_LIMIT_HOUR_MS
  assert.equal((await send(report())).status, 200, 'a day later the IP may report again')
  assert.ok(await count('SELECT COUNT(*) AS c FROM bug_report_attempts WHERE created_at <= ?1', clock - RATE_LIMIT_DAY_MS) === 0, 'old attempts are pruned')
})

test('BR-INTAKE-07 a global daily cap bounds storage even under a distributed flood', async () => {
  await db.prepare(`WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ${GLOBAL_DAILY_MAX}) INSERT INTO bug_report_attempts (ip_hash, created_at) SELECT 'h' || i, ?1 FROM n`).bind(T0 - 1000).run()
  const r = await send(report(), { ip: '192.0.2.200' })
  assert.equal(r.status, 429)
  assert.deepEqual(await j(r), { ok: false, error: 'RATE_LIMITED' })
})

test('BR-INTAKE-08 an id collision retries with a new id and never overwrites an existing bundle', async () => {
  ids = ['BR-COLL1D']
  const first = await j(await send(report({ description: 'first' })))
  assert.equal(first.reportId, 'BR-COLL1D')
  const original = new TextDecoder().decode(bucket.objects.get(bundleKeyFor('BR-COLL1D', T0))!.body)
  ids = ['BR-COLL1D', 'BR-FRESH2']
  clock += 1000
  const second = await j(await send(report({ description: 'second' }), { ip: '198.51.100.2' }))
  assert.equal(second.reportId, 'BR-FRESH2')
  assert.equal(new TextDecoder().decode(bucket.objects.get(bundleKeyFor('BR-COLL1D', T0))!.body), original)
  assert.equal(await count('SELECT COUNT(*) AS c FROM bug_reports'), 2)
})

test('BR-INTAKE-09 storage failures return 500 and leave no orphan row', async () => {
  bucket.failPut = true
  const r = await send(report())
  assert.equal(r.status, 500)
  assert.deepEqual(await j(r), { ok: false, error: 'SERVER_ERROR' })
  assert.equal(await count('SELECT COUNT(*) AS c FROM bug_reports'), 0)

  const missing = await send(report(), {}, intakeEnv({ BUG_REPORTS: undefined }))
  assert.equal(missing.status, 500)
  assert.deepEqual(await j(missing), { ok: false, error: 'NOT_CONFIGURED' })
  const noDb = await send(report(), {}, intakeEnv({ CMS_DB: undefined }))
  assert.deepEqual(await j(noDb), { ok: false, error: 'NOT_CONFIGURED' })

  const broken = await send(report(), {}, intakeEnv({ CMS_DB: { prepare() { throw new Error('d1 down') } } }))
  assert.equal(broken.status, 500)
  assert.deepEqual(await j(broken), { ok: false, error: 'SERVER_ERROR' })
})

test('BR-INTAKE-10 the Pages Function route and the public function tree expose POST /api/bug-report', async () => {
  const r = await bugReportRoute({ request: new Request('https://webaidesk.pages.dev/api/bug-report'), env: {} })
  assert.equal(r.status, 405)
  assert.equal(fs.readFileSync('functions-public/api/bug-report.ts', 'utf8').trim(), "export { onRequest } from '../../functions/api/bug-report.ts'")
  const privateFiles = fs.readdirSync('functions-private', { recursive: true }).map(String)
  assert.equal(privateFiles.some(f => f.includes('bug-report')), false, 'the intake is not deployed on the private Studio')
  const intake = fs.readFileSync('server/bugReportHandler.ts', 'utf8') + fs.readFileSync('server/bugReportRules.ts', 'utf8')
  assert.doesNotMatch(intake, /\/api\/admin/, 'security:check-v2.5 rejects /api/admin in the public bundle')
  assert.doesNotMatch(intake, /from '[^']*cms\//, 'the public intake must not import admin code')
})

// ---------- admin ----------
async function seed() {
  const rows: Array<[string, number, string, string, string[], string[]]> = [
    ['BR-000001', T0 + 1000, '0.4.0', 'stable', ['AG_DISPATCH_TIMEOUT'], ['antigravity']],
    ['BR-000002', T0 + 2000, '0.5.0-beta.1', 'beta', ['GPT_RETURN_STUCK', 'AG_DISPATCH_TIMEOUT'], ['antigravity', 'codex']],
    ['BR-000003', T0 + 3000, '0.5.0-beta.1', 'beta', [], ['codex']],
    ['BR-000004', T0 + 3000, '0.5.0-beta.1', 'dev', ['GPT_RETURN_STUCK'], []],
  ]
  for (const [id, at, version, channel, codes, workers] of rows) {
    const key = bundleKeyFor(id, at)
    await db.prepare("INSERT INTO bug_reports (id,created_at,app_version,channel,os,description,ip_hash,bundle_key,bundle_bytes,error_codes,workers) VALUES (?1,?2,?3,?4,'Windows 11','desc ' || ?1,'hash',?5,10,?6,?7)").bind(id, at, version, channel, key, JSON.stringify(codes), JSON.stringify(workers)).run()
    await bucket.put(key, new TextEncoder().encode(`{"id":"${id}"}`).buffer as ArrayBuffer)
  }
}
const listIds = async (query = '') => (await j<{ data: Array<{ id: string }> }>(await admin(`bug-reports${query}`))).data.map(r => r.id)

test('BR-ADMIN-01 admin endpoints require the same Cloudflare Access authorization as the rest of the admin', async () => {
  await seed()
  for (const path of ['bug-reports', 'bug-reports/facets', 'bug-reports/BR-000001', 'bug-reports/BR-000001/bundle']) {
    const r = await admin(path, adminEnv(), { token: null })
    assert.equal(r.status, 401, path)
  }
  const disabled = await admin('bug-reports', adminEnv({ CMS_ADMIN_ENABLED: 'false' }))
  assert.equal(disabled.status, 404)
  const post = await admin('bug-reports', adminEnv(), { method: 'POST' })
  assert.equal(post.status, 405, 'read-only API')
})

test('BR-ADMIN-02 list is newest first with filters by app version, channel, error code and worker', async () => {
  await seed()
  assert.deepEqual(await listIds(), ['BR-000004', 'BR-000003', 'BR-000002', 'BR-000001'])
  assert.deepEqual(await listIds('?appVersion=0.4.0'), ['BR-000001'])
  assert.deepEqual(await listIds('?channel=beta'), ['BR-000003', 'BR-000002'])
  assert.deepEqual(await listIds('?errorCode=AG_DISPATCH_TIMEOUT'), ['BR-000002', 'BR-000001'])
  assert.deepEqual(await listIds('?worker=Codex'), ['BR-000003', 'BR-000002'], 'worker filter is case-insensitive')
  assert.deepEqual(await listIds('?appVersion=0.5.0-beta.1&errorCode=GPT_RETURN_STUCK&channel=dev'), ['BR-000004'])
  assert.deepEqual(await listIds('?errorCode=%25'), [], 'filter values are bound, not patterns')
  assert.equal((await admin('bug-reports?channel=prod')).status, 400)
  const first = (await j<{ data: Array<Record<string, unknown>> }>(await admin('bug-reports?appVersion=0.4.0'))).data[0]!
  assert.deepEqual(first, { id: 'BR-000001', createdAt: T0 + 1000, appVersion: '0.4.0', channel: 'stable', os: 'Windows 11', description: 'desc BR-000001', bundleBytes: 10, errorCodes: ['AG_DISPATCH_TIMEOUT'], workers: ['antigravity'], bundleUrl: '/api/admin/bug-reports/BR-000001/bundle' })
  assert.equal(Object.hasOwn(first, 'ipHash') || Object.hasOwn(first, 'ip_hash'), false, 'the IP hash is never exposed')
})

test('BR-ADMIN-03 keyset pagination walks every report exactly once, including equal timestamps', async () => {
  await seed()
  const seen: string[] = []
  let cursor: string | null = null
  for (let guard = 0; guard < 10; guard++) {
    const body: { data: Array<{ id: string }>; meta: { nextCursor: string | null } } = await j(await admin(`bug-reports?limit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`))
    seen.push(...body.data.map(r => r.id))
    cursor = body.meta.nextCursor
    if (!cursor) break
  }
  assert.deepEqual(seen, ['BR-000004', 'BR-000003', 'BR-000002', 'BR-000001'])
  assert.equal((await admin('bug-reports?cursor=garbage')).status, 400)
})

test('BR-ADMIN-04 facets list versions, error codes and workers with counts', async () => {
  await seed()
  const { data } = await j(await admin('bug-reports/facets'))
  assert.deepEqual(data.appVersions, [{ value: '0.5.0-beta.1', count: 3 }, { value: '0.4.0', count: 1 }])
  assert.deepEqual(data.errorCodes, [{ value: 'AG_DISPATCH_TIMEOUT', count: 2 }, { value: 'GPT_RETURN_STUCK', count: 2 }])
  assert.deepEqual(data.workers, [{ value: 'antigravity', count: 2 }, { value: 'codex', count: 2 }])
  assert.deepEqual(data.channels, ['stable', 'beta', 'dev'])
})

test('BR-ADMIN-05 one report and its bundle download, private and as an attachment', async () => {
  await seed()
  const detail = await j(await admin('bug-reports/BR-000002'))
  assert.equal(detail.data.id, 'BR-000002')
  const r = await admin('bug-reports/BR-000002/bundle')
  assert.equal(r.status, 200)
  assert.equal(await r.text(), '{"id":"BR-000002"}')
  assert.equal(r.headers.get('content-disposition'), 'attachment; filename="BR-000002.json"')
  assert.equal(r.headers.get('cache-control'), 'private, no-store')
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
  assert.match(r.headers.get('content-security-policy') ?? '', /sandbox/)
  for (const path of ['bug-reports/BR-999999', 'bug-reports/br-000002', 'bug-reports/BR-000002/other', 'bug-reports/..%2Fsecret/bundle', 'bug-reports/BR-000002/bundle/x'])
    assert.equal((await admin(path)).status, 404, path)
  await bucket.delete(bundleKeyFor('BR-000001', T0 + 1000))
  const gone = await admin('bug-reports/BR-000001/bundle')
  assert.equal(gone.status, 404)
  assert.equal((await j(gone)).error.code, 'bundle_missing')
  const unbound = await admin('bug-reports/BR-000002/bundle', adminEnv({ BUG_REPORTS: undefined }))
  assert.equal(unbound.status, 503)
})

test('BR-ADMIN-06 intake and admin agree end to end', async () => {
  const { reportId } = await j(await send(report()))
  const listed = (await j<{ data: Array<{ id: string; errorCodes: string[]; workers: string[] }> }>(await admin('bug-reports?worker=antigravity'))).data
  assert.deepEqual(listed.map(r => [r.id, r.errorCodes, r.workers]), [[reportId, ['AG_DISPATCH_TIMEOUT'], ['antigravity', 'codex']]])
  const download = await admin(`bug-reports/${reportId}/bundle`)
  assert.deepEqual(JSON.parse(await download.text()), report())
})

// ---------- Studio client ----------
test('BR-UI-01 client builds filter queries and Vietnamese error messages', () => {
  assert.equal(bugReportQuery({ appVersion: ' 0.5.0 ', channel: '', errorCode: 'E1', worker: '' }, 'c1'), 'limit=20&appVersion=0.5.0&errorCode=E1&cursor=c1')
  for (const code of ['cms_not_configured', 'invalid_cursor', 'rate_limited', 'authentication_required']) {
    const text = describeBugReportsError(new BugReportsError(400, code))
    assert.ok(/[À-ỹ]/.test(text), `${code}: ${text}`)
  }
  assert.match(describeBugReportsError(new Error('x')), /Lỗi mạng/)
  const studio = fs.readFileSync('src/pages/StudioPage.tsx', 'utf8')
  assert.match(studio, /id: "bugs", label: "Báo lỗi"/)
  assert.match(studio, /<BugReportsManager \/>/)
})
