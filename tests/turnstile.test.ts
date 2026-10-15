import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkTurnstile, hostnameAllowed, parseAllowedHostnames, verifyTurnstile, type TurnstileOutcome } from '../server/turnstile.ts'
import { handleWaitlist, type D1DatabaseLike, type HandlerDeps } from '../server/waitlistHandler.ts'
import { canSubmit, captchaReducer, initCaptcha, type CaptchaState } from '../src/lib/captchaState.ts'

// ---------------------------------------------------------------- allowlist

test('TURNSTILE_ALLOWED_HOSTNAMES: strict parsing, fail closed on any invalid entry', () => {
  assert.deepEqual(parseAllowedHostnames('webaidesk.pages.dev'), ['webaidesk.pages.dev'])
  assert.deepEqual(parseAllowedHostnames(' WebAIDesk.pages.dev , *.webaidesk.pages.dev '), ['webaidesk.pages.dev', '*.webaidesk.pages.dev'])
  for (const bad of [
    undefined,
    '',
    ' ',
    '*',
    '*.dev',
    '*.pages.dev', // would accept every Pages site
    'webaidesk.pages.dev,',
    'webaidesk.pages.dev,,example.com',
    'https://webaidesk.pages.dev',
    'webaidesk.pages.dev:443',
    'webaidesk.pages.dev/path',
    'localhost',
    '127.0.0.1',
    'web*desk.pages.dev',
    '*.*.pages.dev',
    'webaidesk.pages.dev, evil host.com',
    '-bad.example.com',
  ]) {
    assert.equal(parseAllowedHostnames(bad), null, String(bad))
  }
})

test('hostname matching: exact, one-level wildcard, no lookalikes', () => {
  const allowed = parseAllowedHostnames('webaidesk.pages.dev,*.webaidesk.pages.dev')!
  assert.equal(hostnameAllowed('webaidesk.pages.dev', allowed), true)
  assert.equal(hostnameAllowed('WEBAIDESK.pages.dev', allowed), true)
  assert.equal(hostnameAllowed('89f08aef.webaidesk.pages.dev', allowed), true)
  for (const bad of ['a.b.webaidesk.pages.dev', 'evilwebaidesk.pages.dev', 'webaidesk.pages.dev.evil.com', 'other.pages.dev', '', '.webaidesk.pages.dev', 'x y.webaidesk.pages.dev']) {
    assert.equal(hostnameAllowed(bad, allowed), false, bad)
  }
  assert.equal(hostnameAllowed('89f08aef.webaidesk.pages.dev', parseAllowedHostnames('webaidesk.pages.dev')!), false)
})

// ---------------------------------------------------------------- siteverify client

function fakeFetch(handler: (body: FormData) => Response | Promise<Response>) {
  const calls: FormData[] = []
  const f = (async (_url: string, init: RequestInit) => {
    calls.push(init.body as FormData)
    return handler(init.body as FormData)
  }) as unknown as typeof fetch
  return { f, calls }
}
const jsonRes = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

test('verifyTurnstile: success, rejection, network/HTTP/JSON failures', async () => {
  const ok = fakeFetch(() => jsonRes({ success: true, hostname: 'webaidesk.pages.dev', action: 'waitlist' }))
  assert.deepEqual(await verifyTurnstile('secret', 'tok', '203.0.113.1', ok.f), { kind: 'ok', hostname: 'webaidesk.pages.dev', action: 'waitlist' })
  const sent = ok.calls[0]
  assert.equal(sent.get('secret'), 'secret')
  assert.equal(sent.get('response'), 'tok')
  assert.ok(typeof sent.get('idempotency_key') === 'string')

  assert.deepEqual(await verifyTurnstile('s', 'tok', '', fakeFetch(() => jsonRes({ success: false, 'error-codes': ['timeout-or-duplicate'] })).f), { kind: 'rejected' })
  assert.deepEqual(await verifyTurnstile('s', 'tok', '', fakeFetch(() => jsonRes({ success: true })).f), { kind: 'rejected' })
  assert.deepEqual(await verifyTurnstile('s', 'tok', '', fakeFetch(() => jsonRes({}, 500)).f), { kind: 'unavailable' })
  assert.deepEqual(await verifyTurnstile('s', 'tok', '', fakeFetch(() => new Response('<html>', { status: 200 })).f), { kind: 'unavailable' })
  const offline = (async () => {
    throw new TypeError('network down')
  }) as typeof fetch
  assert.deepEqual(await verifyTurnstile('s', 'tok', '', offline), { kind: 'unavailable' })

  const never = fakeFetch(() => jsonRes({ success: true, hostname: 'x' }))
  assert.deepEqual(await verifyTurnstile('s', '', '', never.f), { kind: 'rejected' })
  assert.deepEqual(await verifyTurnstile('s', 'x'.repeat(2049), '', never.f), { kind: 'rejected' })
  assert.equal(never.calls.length, 0, 'missing or oversized tokens never reach siteverify')
})

// ---------------------------------------------------------------- decision

const env = { TURNSTILE_SECRET_KEY: 'super-secret', TURNSTILE_ALLOWED_HOSTNAMES: 'webaidesk.pages.dev,*.webaidesk.pages.dev' }
const outcome = (o: TurnstileOutcome) => async () => o

test('checkTurnstile decisions', async () => {
  const good = outcome({ kind: 'ok', hostname: '89f08aef.webaidesk.pages.dev', action: 'waitlist' })
  assert.equal(await checkTurnstile({}, '', '', good), 'pass', 'disabled: no token needed')
  assert.equal(await checkTurnstile(env, 'tok', '', good), 'pass')
  assert.equal(await checkTurnstile(env, '', '', good), 'captcha_failed', 'missing token')
  assert.equal(await checkTurnstile(env, 'tok', '', outcome({ kind: 'ok', hostname: 'evil.example.com', action: 'waitlist' })), 'captcha_failed', 'wrong hostname')
  assert.equal(await checkTurnstile(env, 'tok', '', outcome({ kind: 'ok', hostname: 'webaidesk.pages.dev', action: 'login' })), 'captcha_failed', 'wrong action')
  assert.equal(await checkTurnstile(env, 'tok', '', outcome({ kind: 'rejected' })), 'captcha_failed', 'expired / reused token')
  assert.equal(await checkTurnstile(env, 'tok', '', outcome({ kind: 'unavailable' })), 'captcha_unavailable')
  assert.equal(await checkTurnstile({ TURNSTILE_SECRET_KEY: 'k' }, 'tok', '', good), 'not_configured', 'secret without allowlist')
  assert.equal(await checkTurnstile({ TURNSTILE_SECRET_KEY: 'k', TURNSTILE_ALLOWED_HOSTNAMES: '*.pages.dev' }, 'tok', '', good), 'not_configured')
})

// ---------------------------------------------------------------- handler end-to-end (fake D1)

function fakeDb() {
  let inserts = 0
  const db: D1DatabaseLike = {
    prepare(query: string) {
      const stmt = {
        bind: () => stmt,
        first: async <T,>() => ({ n: 0 }) as T,
        run: async () => {
          if (query.startsWith('INSERT INTO waitlist_subscribers')) inserts++
          return { meta: { changes: 1 } }
        },
      }
      return stmt
    },
  }
  return { db, inserts: () => inserts }
}
const NOW = 1_800_000_000_000
const body = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ email: 'turnstile-test@example.com', consent: true, website: '', startedAt: NOW - 10_000, source: 'pro-news', ...extra })
const request = (b: string) =>
  new Request('https://webaidesk.pages.dev/api/waitlist', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://webaidesk.pages.dev' }, body: b })

test('waitlist API with Turnstile: fail closed, no DB write, no secret/token echoed', async () => {
  const seen: string[] = []
  const verify = (o: TurnstileOutcome): HandlerDeps => ({
    now: () => NOW,
    verifyTurnstile: async (secret, token) => {
      seen.push(`${secret}|${token}`)
      return o
    },
  })
  const okVerify = verify({ kind: 'ok', hostname: 'webaidesk.pages.dev', action: 'waitlist' })
  const cases: Array<[string, Record<string, unknown>, HandlerDeps, Record<string, string>, number, string]> = [
    ['missing token', {}, okVerify, env, 400, 'captcha_failed'],
    ['wrong hostname', { turnstileToken: 'tk1' }, verify({ kind: 'ok', hostname: 'evil.example', action: 'waitlist' }), env, 400, 'captcha_failed'],
    ['reused/expired token', { turnstileToken: 'tk2' }, verify({ kind: 'rejected' }), env, 400, 'captcha_failed'],
    ['siteverify down', { turnstileToken: 'tk3' }, verify({ kind: 'unavailable' }), env, 503, 'captcha_unavailable'],
    ['secret without allowlist', { turnstileToken: 'tk4' }, okVerify, { TURNSTILE_SECRET_KEY: 'k' }, 503, 'not_configured'],
  ]
  for (const [name, extra, deps, e, status, error] of cases) {
    const { db, inserts } = fakeDb()
    const res = await handleWaitlist(request(body(extra)), { DB: db, ...e }, deps)
    const text = await res.text()
    assert.equal(res.status, status, name)
    assert.deepEqual(JSON.parse(text), { ok: false, error }, name)
    assert.ok(!text.includes('super-secret') && !/tk[1-4]/.test(text), `${name}: nothing sensitive echoed`)
    assert.equal(inserts(), 0, `${name}: no DB write`)
  }
  const { db, inserts } = fakeDb()
  const res = await handleWaitlist(request(body({ turnstileToken: 'good' })), { DB: db, ...env }, okVerify)
  assert.equal(res.status, 200)
  assert.equal(inserts(), 1)
  assert.ok(seen.includes('super-secret|good'))

  const off = fakeDb()
  const disabled = await handleWaitlist(request(body()), { DB: off.db }, okVerify)
  assert.equal(disabled.status, 200, 'Turnstile not configured: existing behaviour kept')
  assert.equal(off.inserts(), 1)
})

// ---------------------------------------------------------------- client state

test('captcha state: gating, expiry, reset after every submit, no token reuse', () => {
  const off = initCaptcha(false)
  assert.equal(canSubmit(off), true)
  assert.deepEqual(captchaReducer(off, { type: 'token', token: 'x' }), off, 'disabled ignores events')

  let s: CaptchaState = initCaptcha(true)
  assert.equal(s.status, 'loading')
  assert.equal(canSubmit(s), false, 'locked until a token arrives')
  s = captchaReducer(s, { type: 'token', token: 'tok-1' })
  assert.equal(canSubmit(s), true)
  const expired = captchaReducer(s, { type: 'expired' })
  assert.equal(canSubmit(expired), false)
  assert.equal(expired.token, '')

  const submitted = captchaReducer(s, { type: 'submitted' })
  assert.equal(submitted.token, '', 'token consumed on submit')
  assert.equal(submitted.widgetKey, s.widgetKey + 1, 'widget remounted for a fresh challenge')
  assert.equal(canSubmit(submitted), false, 'cannot resubmit until a NEW token arrives (API error or not)')
  const again = captchaReducer(submitted, { type: 'token', token: 'tok-2' })
  assert.equal(again.token, 'tok-2')

  for (const ev of [{ type: 'challenge-error' }, { type: 'script-failed' }] as const) {
    const failed = captchaReducer(s, ev)
    assert.equal(canSubmit(failed), false)
    const retried = captchaReducer(failed, { type: 'retry' })
    assert.equal(retried.status, 'loading')
    assert.equal(retried.widgetKey, failed.widgetKey + 1)
  }
  assert.equal(captchaReducer(s, { type: 'token', token: '' }).status, 'expired')
})
