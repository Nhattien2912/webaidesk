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
  | { kind: 'unavailable' }

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

/** Calls siteverify. Network errors, timeouts and non-JSON answers are "unavailable", never "ok". */
export async function verifyTurnstile(secret: string, token: string, ip: string, fetchImpl: typeof fetch = fetch): Promise<TurnstileOutcome> {
  if (!token || token.length > MAX_TOKEN_LENGTH) return { kind: 'rejected' }
  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  if (ip) form.append('remoteip', ip)
  // Single-use protection is enforced by Cloudflare; the idempotency key lets a retried call be safe.
  form.append('idempotency_key', crypto.randomUUID())
  let res: Response
  try {
    res = await fetchImpl(SITEVERIFY_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS) })
  } catch {
    return { kind: 'unavailable' }
  }
  if (!res.ok) return { kind: 'unavailable' }
  let data: { success?: unknown; hostname?: unknown; action?: unknown }
  try {
    data = (await res.json()) as typeof data
  } catch {
    return { kind: 'unavailable' }
  }
  if (data.success !== true || typeof data.hostname !== 'string') return { kind: 'rejected' }
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
  if (outcome.kind !== 'ok') return 'captcha_failed'
  if (outcome.action !== TURNSTILE_ACTION) return 'captcha_failed'
  if (!hostnameAllowed(outcome.hostname, allowed)) return 'captcha_failed'
  return 'pass'
}
