import React, { useEffect, useRef } from 'react'
import type { CaptchaEvent } from '../lib/captchaState'

// Optional Cloudflare Turnstile widget (explicit render). Rendered only when VITE_TURNSTILE_SITE_KEY
// is set; the server enforces it only when TURNSTILE_SECRET_KEY + TURNSTILE_ALLOWED_HOSTNAMES are set.
// To reset, the parent changes the React `key`, which removes this widget and renders a new one.

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
// Must equal TURNSTILE_ACTION in server/turnstile.ts (siteverify checks it).
const TURNSTILE_ACTION = 'waitlist'
let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_SRC
    script.async = true
    script.onload = () => (window.turnstile ? resolve() : reject(new Error('turnstile api missing')))
    script.onerror = () => {
      script.remove()
      scriptPromise = null
      reject(new Error('turnstile script failed'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export const TurnstileWidget: React.FC<{ siteKey: string; onEvent: (event: CaptchaEvent) => void }> = ({ siteKey, onEvent }) => {
  const ref = useRef<HTMLDivElement>(null)
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    let widgetId: string | null = null
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return
        widgetId = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          action: TURNSTILE_ACTION,
          'refresh-expired': 'auto',
          callback: (token: string) => onEventRef.current({ type: 'token', token }),
          'expired-callback': () => onEventRef.current({ type: 'expired' }),
          'timeout-callback': () => onEventRef.current({ type: 'expired' }),
          'error-callback': () => {
            onEventRef.current({ type: 'challenge-error' })
            return true // handled: no console noise, the form shows a retry button
          },
        })
      })
      .catch(() => {
        if (!cancelled) onEventRef.current({ type: 'script-failed' })
      })
    return () => {
      cancelled = true
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [siteKey])

  return <div ref={ref} className="min-h-[65px]" data-turnstile-widget="" />
}
