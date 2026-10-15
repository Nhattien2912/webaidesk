// Shared waitlist rules used by both the browser form and the Pages Function, so the two
// sides can never disagree about what a valid submission is. Pure: no DOM, no Workers APIs.

export const CONSENT_VERSION = 'pro-news-v1'
export const MIN_FILL_MS = 2000
export const MAX_BODY_BYTES = 4096
export const MAX_EMAIL_LENGTH = 254

const EMAIL = /^[^\s@"<>()[\]\\,;:]+@[^\s@"<>()[\]\\,;:]+\.[A-Za-z]{2,}$/

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value)
  return email.length > 3 && email.length <= MAX_EMAIL_LENGTH && EMAIL.test(email)
}

export interface WaitlistPayload {
  email: string
  consent: boolean
  /** Honeypot field: must stay empty. */
  website: string
  /** Epoch ms when the form was rendered. */
  startedAt: number
  turnstileToken?: string
  source?: string
}

export type WaitlistErrorCode =
  | 'invalid_email'
  | 'consent_required'
  | 'rejected'
  | 'captcha_failed'
  | 'rate_limited'
  | 'not_configured'
  | 'server_error'
  | 'network_error'

export type PayloadCheck =
  | { ok: true; email: string; source: string; turnstileToken: string }
  | { ok: false; error: WaitlistErrorCode }

export function checkPayload(raw: unknown, now: number): PayloadCheck {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'rejected' }
  const body = raw as Record<string, unknown>
  if (typeof body.website === 'string' && body.website.trim() !== '') return { ok: false, error: 'rejected' }
  if (typeof body.startedAt !== 'number' || !Number.isFinite(body.startedAt)) return { ok: false, error: 'rejected' }
  if (now - body.startedAt < MIN_FILL_MS) return { ok: false, error: 'rejected' }
  if (typeof body.email !== 'string' || !isValidEmail(body.email)) return { ok: false, error: 'invalid_email' }
  if (body.consent !== true) return { ok: false, error: 'consent_required' }
  const source = typeof body.source === 'string' && /^[a-z0-9-]{1,40}$/.test(body.source) ? body.source : 'website'
  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken.slice(0, 4096) : ''
  return { ok: true, email: normalizeEmail(body.email), source, turnstileToken }
}

export const WAITLIST_MESSAGES: Record<WaitlistErrorCode, string> = {
  invalid_email: 'Email chưa hợp lệ. Vui lòng kiểm tra lại.',
  consent_required: 'Bạn cần đồng ý nhận email thông báo để đăng ký.',
  rejected: 'Không thể ghi nhận đăng ký này. Vui lòng thử lại sau vài giây.',
  captcha_failed: 'Không xác minh được bước chống spam. Vui lòng thử lại.',
  rate_limited: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.',
  not_configured: 'Hệ thống nhận tin chưa được kích hoạt. Đăng ký của bạn chưa được lưu.',
  server_error: 'Máy chủ gặp lỗi. Đăng ký của bạn chưa được lưu.',
  network_error: 'Không kết nối được hệ thống nhận tin. Đăng ký của bạn chưa được lưu.',
}

export type SubmitResult = { ok: true } | { ok: false; error: WaitlistErrorCode }

const KNOWN_ERRORS = new Set(Object.keys(WAITLIST_MESSAGES))

/**
 * Posts the form. Success is reported ONLY when the server answers 2xx with JSON {ok:true};
 * anything else (static host without the function, HTML fallback, network error) is a failure.
 */
export async function submitWaitlist(
  endpoint: string,
  payload: WaitlistPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitResult> {
  if (!endpoint) return { ok: false, error: 'not_configured' }
  let res: Response
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    return { ok: false, error: 'network_error' }
  }
  const type = res.headers.get('content-type') ?? ''
  if (!type.includes('application/json')) {
    return { ok: false, error: res.status === 404 || res.status === 405 ? 'not_configured' : 'server_error' }
  }
  let data: unknown
  try {
    data = await res.json()
  } catch {
    return { ok: false, error: 'server_error' }
  }
  const body = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>
  if (res.ok && body.ok === true) return { ok: true }
  const code = typeof body.error === 'string' && KNOWN_ERRORS.has(body.error) ? (body.error as WaitlistErrorCode) : 'server_error'
  return { ok: false, error: code }
}
