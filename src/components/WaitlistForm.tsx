import React, { useId, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { siteConfig } from '../config/site'
import { TurnstileWidget } from './TurnstileWidget'
import {
  WAITLIST_MESSAGES,
  isValidEmail,
  submitWaitlist,
  type SubmitResult,
  type WaitlistErrorCode,
} from '../lib/waitlistRules'

type FormStatus =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; code: WaitlistErrorCode }

interface WaitlistFormProps {
  endpoint?: string
  turnstileSiteKey?: string
  /** Injected in tests; defaults to the real network submit. */
  submit?: typeof submitWaitlist
  initialStatus?: FormStatus
}

export const WaitlistForm: React.FC<WaitlistFormProps> = ({
  endpoint = siteConfig.waitlist.endpoint,
  turnstileSiteKey = siteConfig.waitlist.turnstileSiteKey,
  submit = submitWaitlist,
  initialStatus = { kind: 'idle' },
}) => {
  const id = useId()
  const [startedAt] = useState(() => Date.now())
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<FormStatus>(initialStatus)

  const emailError = status.kind === 'error' && status.code === 'invalid_email'
  const consentError = status.kind === 'error' && status.code === 'consent_required'
  const busy = status.kind === 'submitting'

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (!isValidEmail(email)) return setStatus({ kind: 'error', code: 'invalid_email' })
    if (!consent) return setStatus({ kind: 'error', code: 'consent_required' })
    setStatus({ kind: 'submitting' })
    const result: SubmitResult = await submit(endpoint, {
      email,
      consent,
      website,
      startedAt,
      source: 'pro-news',
      ...(token ? { turnstileToken: token } : {}),
    })
    setStatus(result.ok ? { kind: 'success' } : { kind: 'error', code: result.error })
  }

  if (status.kind === 'success') {
    return (
      <div role="status" className="rounded-card border border-emerald-400/30 bg-emerald-400/[0.07] p-6" data-waitlist-state="success">
        <div className="flex items-center gap-2 font-semibold text-emerald-200">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          Đã ghi nhận email của bạn
        </div>
        <p className="mt-2 text-sm text-emerald-100/80">
          Chúng tôi sẽ gửi thông báo khi có tin về AI Desk Pro. Nếu email đã có trong danh sách, bạn sẽ không bị đăng
          ký trùng.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative card p-6 sm:p-8" data-waitlist-state={status.kind}>
      <h3 className="text-lg font-semibold text-white">Đăng ký nhận tin khi có AI Desk Pro</h3>
      <p className="mt-1 text-sm text-muted">Chỉ một email thông báo khi có tin mới. Không cần tạo tài khoản.</p>

      <label htmlFor={`${id}-email`} className="mt-5 block text-sm font-medium text-ink">
        Email
      </label>
      <input
        id={`${id}-email`}
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={emailError}
        aria-describedby={emailError ? `${id}-error` : undefined}
        placeholder="ban@vidu.com"
        className="field mt-1.5 aria-[invalid=true]:border-red-400"
      />

      {/* Honeypot: hidden from people and assistive tech, bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <div className="mt-4 flex items-start gap-2.5">
        <input
          id={`${id}-consent`}
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          aria-invalid={consentError}
          aria-describedby={consentError ? `${id}-error` : undefined}
          className="mt-0.5 h-4 w-4 rounded border-line bg-navy-900 accent-[#2F7BF5]"
        />
        <label htmlFor={`${id}-consent`} className="text-sm leading-relaxed text-muted">
          Tôi đồng ý nhận email thông báo về AI Desk Pro và đã đọc{' '}
          <a href="/privacy" className="font-medium text-accent-light hover:underline">
            Chính sách quyền riêng tư
          </a>
          .
        </label>
      </div>

      {turnstileSiteKey && (
        <div className="mt-4">
          <TurnstileWidget siteKey={turnstileSiteKey} onToken={setToken} />
        </div>
      )}

      <div aria-live="polite" className="min-h-0">
        {status.kind === 'error' && (
          <p id={`${id}-error`} className="mt-4 flex items-start gap-2 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {WAITLIST_MESSAGES[status.code]}
          </p>
        )}
      </div>

      <button type="submit" className="btn-primary mt-5 w-full" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
        {busy ? 'Đang gửi…' : 'Đăng ký nhận tin'}
      </button>
    </form>
  )
}
