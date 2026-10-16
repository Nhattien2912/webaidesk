// Cloudflare Turnstile server-side verification for the waitlist API.
//
// Trust model: the token proves a challenge was solved, but only siteverify (called here with the
// secret) says WHERE it was solved. We accept a token only when siteverify reports success, the
// expected action, and a hostname from the server-side allowlist TURNSTILE_ALLOWED_HOSTNAMES.
// Nothing the browser sends (Origin, Host, a claimed hostname) is used for that decision.
// The secret and the user token are never logged or echoed.

export const TURNSTILE_ACTION = 'waitlist'
export const MAX_TOKEN_LENGTH = 2048
export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const SITEVERIFY_TIMEOUT_MS = 5000

export type TurnstileOutcome =
  | { kind: 'ok'; hostname: string; action: string }
  | { kind: 'rejected' }
  /** Siteverify refused OUR configuration (invalid/missing secret): an operator problem, not an outage. */
  | { kind: 'misconfigured' }
  | { kind: 'unavailable' }

/** Sanitized diagnostics: categories, HTTP status and Cloudflare error codes only (never secret, token, IP or email). */
export interface SiteverifyDiagnostic {
  result: TurnstileOutcome['kind']
  reason: 'success' | 'not_success' | 'secret_rejected' | 'bad_request' | 'http_error' | 'non_json' | 'timeout' | 'network' | 'token_invalid_local'
  status?: number
  errorCodes?: string[]
}
export type SiteverifyLogger = (d: SiteverifyDiagnostic) => void

/** Default logger: one JSON line in Pages Functions logs. */
export const logSiteverify: SiteverifyLogger = (d) => console.warn(JSON.stringify({ event: 'turnstile_siteverify', ...d }))

// Codes documented by Cloudflare that mean the SECRET (server configuration) is wrong.
const SECRET_ERRORS = new Set(['missing-input-secret', 'invalid-input-secret'])

const LABEL = '(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)'
const EXACT_HOST = new RegExp(`^${LABEL}(?:\\.${LABEL})+$`)
// "*.example.pages.dev": one wildcard label, followed by at least three labels, so "*.dev" or
// "*.pages.dev" (every Pages site) can never be configured by mistake.
const WILDCARD_HOST = new RegExp(`^\\*\\.${LABEL}\\.${LABEL}(?:\\.${LABEL})+$`)

/** A DNS hostname whose top-level label contains a letter (IP literals are not hostnames here). */
function isDnsName(host: string): boolean {
  return EXACT_HOST.test(host) && /[a-z]/.test(host.slice(host.lastIndexOf('.') + 1))
}

/**
 * Parses TURNSTILE_ALLOWED_HOSTNAMES (comma-separated). Returns null when the value is missing,
 * empty or contains ANY invalid entry, so a typo disables the form instead of widening it.
 */
export function parseAllowedHostnames(value: string | undefined): string[] | null {
  if (!value) return null
  const entries = value.split(',').map((h) => h.trim().toLowerCase())
  if (entries.length === 0 || entries.length > 20 || entries.some((h) => !h)) return null
  for (const h of entries) {
    const wildcard = WILDCARD_HOST.test(h) && isDnsName(h.slice(2))
    if (h.length > 253 || !(isDnsName(h) || wildcard)) return null
  }
  return entries
}

/** Exact match, or a single extra label for "*.suffix" entries (a.suffix yes, a.b.suffix no, suffix no). */
export function hostnameAllowed(hostname: string, allowed: readonly string[]): boolean {
  const host = hostname.trim().toLowerCase()
  if (!isDnsName(host)) return false
  return allowed.some((pattern) => {
    if (!pattern.startsWith('*.')) return host === pattern
    const suffix = pattern.slice(1)
    if (!host.endsWith(suffix)) return false
    const label = host.slice(0, host.length - suffix.length)
    return new RegExp(`^${LABEL}$`).test(label)
  })
}

interface SiteverifyBody {
  success?: unknown
  hostname?: unknown
  action?: unknown
  'error-codes'?: unknown
}

async function readJson(res: Response): Promise<SiteverifyBody | null> {
  try {
    const body: unknown = await res.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as SiteverifyBody) : null
  } catch {
    return null
  }
}

function safeErrorCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((c): c is string => typeof c === 'string' && /^[a-z0-9-]{1,48}$/.test(c)).slice(0, 10)
}

/**
 * Calls siteverify (POST form: secret, response, remoteip, idempotency_key — per Cloudflare docs).
 * Siteverify answers HTTP 200 for token verdicts and HTTP 400 with `invalid-input-secret` /
 * `missing-input-secret` when the secret is wrong, so the body is classified on every status:
 *   - secret errors (any status)      → misconfigured (503 not_configured, operator must fix the secret)
 *   - other 4xx / success:false        → rejected (400 captcha_failed)
 *   - 5xx, non-JSON, network, timeout  → unavailable (503 captcha_unavailable)
 */
export async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string,
  fetchImpl: typeof fetch = fetch,
  log: SiteverifyLogger = logSiteverify,
): Promise<TurnstileOutcome> {
  const done = (d: SiteverifyDiagnostic & { result: 'rejected' | 'misconfigured' | 'unavailable' }): TurnstileOutcome => {
    log(d)
    return { kind: d.result }
  }
  if (!token || token.length > MAX_TOKEN_LENGTH) return done({ result: 'rejected', reason: 'token_invalid_local' })
  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  if (ip) form.append('remoteip', ip)
  // Single-use protection is enforced by Cloudflare; the idempotency key lets a retried call be safe.
  form.append('idempotency_key', crypto.randomUUID())
  let res: Response
  try {
    res = await fetchImpl(SITEVERIFY_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS) })
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    return done({ result: 'unavailable', reason: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network' })
  }
  const status = res.status
  const data = await readJson(res)
  if (!data) return done({ result: 'unavailable', reason: 'non_json', status })
  const errorCodes = safeErrorCodes(data['error-codes'])
  if (errorCodes.some((c) => SECRET_ERRORS.has(c))) return done({ result: 'misconfigured', reason: 'secret_rejected', status, errorCodes })
  if (status >= 500) return done({ result: 'unavailable', reason: 'http_error', status, errorCodes })
  if (!res.ok) return done({ result: 'rejected', reason: 'bad_request', status, errorCodes })
  if (data.success !== true || typeof data.hostname !== 'string') return done({ result: 'rejected', reason: 'not_success', status, errorCodes })
  log({ result: 'ok', reason: 'success', status })
  return { kind: 'ok', hostname: data.hostname, action: typeof data.action === 'string' ? data.action : '' }
}

export type TurnstileDecision = 'pass' | 'captcha_failed' | 'captcha_unavailable' | 'not_configured'

/** Full decision for one request, given the configured secret/allowlist and a verifier. */
export async function checkTurnstile(
  env: { TURNSTILE_SECRET_KEY?: string; TURNSTILE_ALLOWED_HOSTNAMES?: string },
  token: string,
  ip: string,
  verify: (secret: string, token: string, ip: string) => Promise<TurnstileOutcome>,
): Promise<TurnstileDecision> {
  if (!env.TURNSTILE_SECRET_KEY) return 'pass' // Turnstile not enabled: honeypot + timing + rate limit only.
  const allowed = parseAllowedHostnames(env.TURNSTILE_ALLOWED_HOSTNAMES)
  if (!allowed) return 'not_configured' // fail closed: secret without a valid hostname allowlist
  if (!token) return 'captcha_failed'
  const outcome = await verify(env.TURNSTILE_SECRET_KEY, token, ip)
  if (outcome.kind === 'unavailable') return 'captcha_unavailable'
  if (outcome.kind === 'misconfigured') return 'not_configured'
  if (outcome.kind !== 'ok') return 'captcha_failed'
  if (outcome.action !== TURNSTILE_ACTION) return 'captcha_failed'
  if (!hostnameAllowed(outcome.hostname, allowed)) return 'captcha_failed'
  return 'pass'
}
