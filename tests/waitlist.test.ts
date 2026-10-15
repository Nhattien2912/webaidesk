import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkPayload, isValidEmail, submitWaitlist } from '../src/lib/waitlistRules.ts'
import {
  RATE_LIMIT_MAX,
  handleWaitlist,
  type D1DatabaseLike,
  type D1PreparedStatement,
  type HandlerDeps,
} from '../server/waitlistHandler.ts'

// ---------- in-memory D1 ----------
function fakeDb(opts: { failInsert?: boolean } = {}) {
  const subscribers = new Map<string, { consent_version: string; source: string }>()
  let attempts: Array<{ ip_hash: string; created_at: number }> = []
  const db: D1DatabaseLike = {
    prepare(query: string): D1PreparedStatement {
      let args: unknown[] = []
      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          args = values
          return stmt
        },
        async first<T>() {
          if (query.startsWith('SELECT COUNT(*)')) {
            const [hash, since] = args as [string, number]
            return { n: attempts.filter((a) => a.ip_hash === hash && a.created_at > since).length } as T
          }
          throw new Error(`unexpected first(): ${query}`)
        },
        async run() {
          if (query.startsWith('DELETE FROM waitlist_attempts')) {
            const [since] = args as [number]
            attempts = attempts.filter((a) => a.created_at > since)
            return { meta: { changes: 0 } }
          }
          if (query.startsWith('INSERT INTO waitlist_attempts')) {
            const [ip_hash, created_at] = args as [string, number]
            attempts.push({ ip_hash, created_at })
            return { meta: { changes: 1 } }
          }
          if (query.startsWith('INSERT INTO waitlist_subscribers')) {
            if (opts.failInsert) throw new Error('db down')
            const [email, consent_version, , source] = args as [string, string, number, string]
            if (subscribers.has(email)) return { meta: { changes: 0 } }
            subscribers.set(email, { consent_version, source })
            return { meta: { changes: 1 } }
          }
          throw new Error(`unexpected run(): ${query}`)
        },
      }
      return stmt
    },
  }
  return { db, subscribers, attempts: () => attempts }
}

const NOW = 1_800_000_000_000
const deps = (verify = true): HandlerDeps => ({
  now: () => NOW,
  verifyTurnstile: async () => (verify ? { kind: 'ok', hostname: 'aidesk.example', action: 'waitlist' } : { kind: 'rejected' }),
})

function req(body: unknown, init: { method?: string; origin?: string | null; ip?: string; type?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': init.type ?? 'application/json' }
  if (init.origin !== null) headers.origin = init.origin ?? 'https://aidesk.example'
  if (init.ip) headers['cf-connecting-ip'] = init.ip
  return new Request('https://aidesk.example/api/waitlist', {
    method: init.method ?? 'POST',
    headers,
    body: init.method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const good = (email = 'Dev@Example.com') => ({ email, consent: true, website: '', startedAt: NOW - 10_000, source: 'pro-news' })

// ---------- shared rules ----------
test('email validation', () => {
  assert.equal(isValidEmail('a@b.co'), true)
  assert.equal(isValidEmail('  Dev@Example.COM '), true)
  for (const bad of ['', 'nope', 'a@b', 'a b@c.com', `${'x'.repeat(250)}@a.com`]) assert.equal(isValidEmail(bad), false, bad)
})

test('checkPayload enforces honeypot, timing, email and consent', () => {
  assert.deepEqual(checkPayload({ ...good(), website: 'spam' }, NOW), { ok: false, error: 'rejected' })
  assert.deepEqual(checkPayload({ ...good(), startedAt: NOW - 500 }, NOW), { ok: false, error: 'rejected' })
  assert.deepEqual(checkPayload({ ...good(), email: 'bad' }, NOW), { ok: false, error: 'invalid_email' })
  assert.deepEqual(checkPayload({ ...good(), consent: 'yes' }, NOW), { ok: false, error: 'consent_required' })
  const ok = checkPayload(good(), NOW)
  assert.equal(ok.ok, true)
  if (ok.ok) assert.equal(ok.email, 'dev@example.com')
})

// ---------- handler ----------
test('stores a valid subscription with normalized email and consent version', async () => {
  const { db, subscribers } = fakeDb()
  const res = await handleWaitlist(req(good(), { ip: '1.2.3.4' }), { DB: db }, deps())
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
  assert.equal(res.headers.get('cache-control'), 'no-store')
  assert.deepEqual(subscribers.get('dev@example.com'), { consent_version: 'pro-news-v1', source: 'pro-news' })
})

test('duplicate email answers the same as a new one and is not stored twice', async () => {
  const { db, subscribers } = fakeDb()
  await handleWaitlist(req(good()), { DB: db }, deps())
  const res = await handleWaitlist(req(good('dev@example.com')), { DB: db }, deps())
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
  assert.equal(subscribers.size, 1)
})

test('rejects bad input with specific codes', async () => {
  const { db, subscribers } = fakeDb()
  const cases: Array<[unknown, number, string]> = [
    [{ ...good(), email: 'x' }, 400, 'invalid_email'],
    [{ ...good(), consent: false }, 400, 'consent_required'],
    [{ ...good(), website: 'http://spam' }, 400, 'rejected'],
    [{ ...good(), startedAt: NOW }, 400, 'rejected'],
    ['{not json', 400, 'rejected'],
  ]
  for (const [body, status, error] of cases) {
    const res = await handleWaitlist(req(body), { DB: db }, deps())
    assert.equal(res.status, status)
    assert.equal(((await res.json()) as { error: string }).error, error)
  }
  assert.equal(subscribers.size, 0)
})

test('rejects wrong method, content type, cross-origin and oversized bodies', async () => {
  const { db } = fakeDb()
  assert.equal((await handleWaitlist(req(null, { method: 'GET' }), { DB: db }, deps())).status, 405)
  assert.equal((await handleWaitlist(req(good(), { type: 'text/plain' }), { DB: db }, deps())).status, 400)
  assert.equal((await handleWaitlist(req(good(), { origin: 'https://evil.example' }), { DB: db }, deps())).status, 400)
  const allowed = await handleWaitlist(req(good(), { origin: 'https://other.example' }), { DB: db, ALLOWED_ORIGINS: 'https://other.example' }, deps())
  assert.equal(allowed.status, 200)
  const big = { ...good(), source: 'x', pad: 'y'.repeat(5000) }
  assert.equal((await handleWaitlist(req(big), { DB: db }, deps())).status, 400)
})

test('returns 503 not_configured when D1 is not bound (never a fake success)', async () => {
  const res = await handleWaitlist(req(good()), {}, deps())
  assert.equal(res.status, 503)
  assert.deepEqual(await res.json(), { ok: false, error: 'not_configured' })
})

test('returns 500 when the database fails', async () => {
  const { db } = fakeDb({ failInsert: true })
  const res = await handleWaitlist(req(good()), { DB: db }, deps())
  assert.equal(res.status, 500)
})

test('rate limits per hashed IP and never stores the raw IP', async () => {
  const { db, attempts } = fakeDb()
  for (let i = 0; i < RATE_LIMIT_MAX; i++) {
    const res = await handleWaitlist(req(good(`u${i}@example.com`), { ip: '9.9.9.9' }), { DB: db, IP_HASH_SALT: 's' }, deps())
    assert.equal(res.status, 200)
  }
  const blocked = await handleWaitlist(req(good('late@example.com'), { ip: '9.9.9.9' }), { DB: db, IP_HASH_SALT: 's' }, deps())
  assert.equal(blocked.status, 429)
  const other = await handleWaitlist(req(good('other@example.com'), { ip: '8.8.8.8' }), { DB: db, IP_HASH_SALT: 's' }, deps())
  assert.equal(other.status, 200)
  assert.ok(attempts().every((a) => /^[a-f0-9]{64}$/.test(a.ip_hash) && !a.ip_hash.includes('9.9.9.9')))
})

test('requires a valid Turnstile token only when the secret is configured', async () => {
  const { db } = fakeDb()
  const env = { DB: db, TURNSTILE_SECRET_KEY: 'k', TURNSTILE_ALLOWED_HOSTNAMES: 'aidesk.example' }
  const failed = await handleWaitlist(req({ ...good(), turnstileToken: 'tok' }), env, deps(false))
  assert.equal(failed.status, 400)
  assert.equal(((await failed.json()) as { error: string }).error, 'captcha_failed')
  const passed = await handleWaitlist(req({ ...good('t@example.com'), turnstileToken: 'tok' }), env, deps(true))
  assert.equal(passed.status, 200)
})

// ---------- client submit ----------
function respond(status: number, body: string, type = 'application/json'): typeof fetch {
  return (async () => new Response(body, { status, headers: { 'content-type': type } })) as typeof fetch
}
const payload = { email: 'a@b.co', consent: true, website: '', startedAt: 0 }

test('submitWaitlist reports success only for 2xx JSON {ok:true}', async () => {
  assert.deepEqual(await submitWaitlist('/api/waitlist', payload, respond(200, '{"ok":true}')), { ok: true })
  assert.deepEqual(await submitWaitlist('/api/waitlist', payload, respond(200, '<!doctype html>', 'text/html')), {
    ok: false,
    error: 'server_error',
  })
  assert.deepEqual(await submitWaitlist('/api/waitlist', payload, respond(200, '{"ok":false}')), { ok: false, error: 'server_error' })
  assert.deepEqual(await submitWaitlist('/api/waitlist', payload, respond(404, 'Not found', 'text/plain')), {
    ok: false,
    error: 'not_configured',
  })
  assert.deepEqual(await submitWaitlist('/api/waitlist', payload, respond(429, '{"ok":false,"error":"rate_limited"}')), {
    ok: false,
    error: 'rate_limited',
  })
  const offline = (async () => {
    throw new Error('offline')
  }) as typeof fetch
  assert.deepEqual(await submitWaitlist('/api/waitlist', payload, offline), { ok: false, error: 'network_error' })
  assert.deepEqual(await submitWaitlist('', payload, respond(200, '{"ok":true}')), { ok: false, error: 'not_configured' })
})
