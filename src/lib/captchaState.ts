// Client-side state of the optional Turnstile challenge on the waitlist form. Pure, so the rules
// (no token reuse, reset after every submit, gating the submit button) are unit-tested.

export type CaptchaStatus = 'disabled' | 'loading' | 'solved' | 'expired' | 'error' | 'unavailable'

export interface CaptchaState {
  enabled: boolean
  status: CaptchaStatus
  /** Current single-use token; empty unless status === 'solved'. */
  token: string
  /** Changing this remounts the widget, which gives a fresh challenge and a fresh token. */
  widgetKey: number
}

export type CaptchaEvent =
  | { type: 'token'; token: string }
  | { type: 'expired' }
  | { type: 'challenge-error' }
  | { type: 'script-failed' }
  | { type: 'submitted' }
  | { type: 'retry' }

export function initCaptcha(enabled: boolean): CaptchaState {
  return { enabled, status: enabled ? 'loading' : 'disabled', token: '', widgetKey: 0 }
}

export function captchaReducer(state: CaptchaState, event: CaptchaEvent): CaptchaState {
  if (!state.enabled) return state
  switch (event.type) {
    case 'token':
      return event.token ? { ...state, status: 'solved', token: event.token } : { ...state, status: 'expired', token: '' }
    case 'expired':
      return { ...state, status: 'expired', token: '' }
    case 'challenge-error':
      return { ...state, status: 'error', token: '' }
    case 'script-failed':
      return { ...state, status: 'unavailable', token: '' }
    case 'submitted':
    case 'retry':
      // A token is consumed by the first siteverify call, whatever the API answered: always start over.
      return { ...state, status: 'loading', token: '', widgetKey: state.widgetKey + 1 }
  }
}

/** Submit is allowed when Turnstile is off, or when a fresh token is held. */
export function canSubmit(state: CaptchaState): boolean {
  return !state.enabled || (state.status === 'solved' && state.token !== '')
}

export const CAPTCHA_MESSAGES: Partial<Record<CaptchaStatus, string>> = {
  loading: 'Đang tải bước xác minh chống spam…',
  expired: 'Bước xác minh đã hết hạn. Vui lòng xác minh lại.',
  error: 'Bước xác minh không thành công.',
  unavailable: 'Không tải được bước xác minh chống spam. Kiểm tra kết nối hoặc trình chặn nội dung.',
}
