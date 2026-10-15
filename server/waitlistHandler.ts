// Waitlist API core ("Đăng ký nhận tin khi có AI Desk Pro"), runtime-agnostic so it can be tested
// under Node and served by Cloudflare Pages Functions (functions/api/waitlist.ts).
// No secret is required for the frontend; the server reads its bindings from `env`.

import {
  CONSENT_VERSION,
  MAX_BODY_BYTES,
  checkPayload,
  type WaitlistErrorCode,
} from '../src/lib/waitlistRules.ts'

/** Minimal subset of the Cloudflare D1 API used here. */
export interface D1Result {
  meta?: { changes?: number }
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  run(): Promise<D1Result>
}
export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatement
}

export interface WaitlistEnv {
  DB?: D1DatabaseLike
  /** Optional: when set, a valid Turnstile token is required. */
  TURNSTILE_SECRET_KEY?: string
  /** Optional salt for hashing client IPs (recommended). */
  IP_HASH_SALT?: string
  /** Optional comma-separated list of allowed Origins; defaults to same-origin. */
  ALLOWED_ORIGINS?: string
}

export interface HandlerDeps {
  now: () => number
  verifyTurnstile: (secret: string, token: string, ip: string) => Promise<boolean>
}

export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
export const RATE_LIMIT_MAX = 5

const STATUS: Record<WaitlistErrorCode, number> = {
  invalid_email: 400,
  consent_required: 400,
  rejected: 400,
  captcha_failed: 400,
  rate_limited: 429,
  not_configured: 503,
  server_error: 500,
  network_error: 502,
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}

const fail = (error: WaitlistErrorCode) => json({ ok: false, error }, STATUS[error])

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function originAllowed(request: Request, env: WaitlistEnv): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true // non-browser clients; still subject to the other checks
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  if (allowed.length > 0) return allowed.includes(origin)
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

export async function verifyTurnstileToken(secret: string, token: string, ip: string): Promise<boolean> {
  if (!token) return false
  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  if (ip) form.append('remoteip', ip)
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

const defaultDeps: HandlerDeps = { now: () => Date.now(), verifyTurnstile: verifyTurnstileToken }

export async function handleWaitlist(request: Request, env: WaitlistEnv, deps: HandlerDeps = defaultDeps): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { allow: 'POST', 'content-type': 'application/json; charset=utf-8' },
    })
  }
  if (!originAllowed(request, env)) return fail('rejected')
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return fail('rejected')

  const text = await request.text()
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return fail('rejected')
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return fail('rejected')
  }

  const now = deps.now()
  const checked = checkPayload(raw, now)
  if (!checked.ok) return fail(checked.error)

  const ip = request.headers.get('cf-connecting-ip') ?? ''
  if (env.TURNSTILE_SECRET_KEY) {
    const valid = await deps.verifyTurnstile(env.TURNSTILE_SECRET_KEY, checked.turnstileToken, ip)
    if (!valid) return fail('captcha_failed')
  }

  const db = env.DB
  if (!db) return fail('not_configured')

  try {
    const ipHash = await sha256Hex(`${env.IP_HASH_SALT ?? ''}|${ip || 'unknown'}`)
    const since = now - RATE_LIMIT_WINDOW_MS
    await db.prepare('DELETE FROM waitlist_attempts WHERE created_at <= ?1').bind(since).run()
    const row = await db
      .prepare('SELECT COUNT(*) AS n FROM waitlist_attempts WHERE ip_hash = ?1 AND created_at > ?2')
      .bind(ipHash, since)
      .first<{ n: number }>()
    if ((row?.n ?? 0) >= RATE_LIMIT_MAX) return fail('rate_limited')

    await db.prepare('INSERT INTO waitlist_attempts (ip_hash, created_at) VALUES (?1, ?2)').bind(ipHash, now).run()
    await db
      .prepare(
        'INSERT INTO waitlist_subscribers (email, consent_version, consent_at, source, created_at) VALUES (?1, ?2, ?3, ?4, ?3) ON CONFLICT(email) DO NOTHING',
      )
      .bind(checked.email, CONSENT_VERSION, now, checked.source)
      .run()
    // Same answer for new and existing emails, so the endpoint does not reveal who is subscribed.
    return json({ ok: true })
  } catch {
    return fail('server_error')
  }
}
