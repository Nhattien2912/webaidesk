// Central site configuration. Every external value here must be verified before it is filled in:
// an empty string means "not configured yet" and the UI renders it as unavailable instead of
// inventing a link. Deployment-specific values come from Vite env vars (see .env.example).

import { OFFICIAL_SOCIAL_URLS, socialUrl } from '../lib/social'

const env = import.meta.env

/** Verified production host (Cloudflare Pages project `webaidesk`). */
export const DEFAULT_DOWNLOAD_HOSTS = ['webaidesk.pages.dev'] as const

function list(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

export type SocialId = 'youtube' | 'facebook' | 'github'

export interface SocialLink {
  id: SocialId
  label: string
  /** Empty until a real, verified URL exists. */
  url: string
}

// YouTube and Facebook default to the official channels; a non-empty VITE_* value overrides them.
// GitHub has no official URL yet and stays empty unless configured.
export const socialLinks: SocialLink[] = [
  { id: 'youtube', label: 'YouTube', url: socialUrl(env.VITE_SOCIAL_YOUTUBE_URL, OFFICIAL_SOCIAL_URLS.youtube) },
  { id: 'facebook', label: 'Facebook', url: socialUrl(env.VITE_SOCIAL_FACEBOOK_URL, OFFICIAL_SOCIAL_URLS.facebook) },
  { id: 'github', label: 'GitHub', url: env.VITE_SOCIAL_GITHUB_URL ?? '' },
]

export const siteConfig = {
  name: 'AI Desk',
  /** Public origin, e.g. https://example.com — used for canonical links only when set. */
  siteUrl: env.VITE_SITE_URL ?? '',
  /** Support / privacy contact. Empty = not published yet. */
  contactEmail: env.VITE_CONTACT_EMAIL ?? '',
  /** Product intro video (YouTube URL). Empty = button shows "sắp có". */
  introVideoUrl: env.VITE_INTRO_VIDEO_URL ?? '',
  release: {
    /**
     * Release manifest. Default: the Pages Function built from server/releaseCatalog.ts.
     * A static JSON manifest (legacy, e.g. /releases/latest.json) still works via the env var.
     * Missing or invalid manifest => download stays closed.
     */
    manifestUrl: env.VITE_RELEASE_MANIFEST_URL?.trim() || '/api/releases/latest',
    /**
     * Hosts allowed for installer URLs. Default: the verified Pages production host, whose
     * /api/download/* streams from the private R2 bucket. Preview hosts stay closed unless listed.
     */
    allowedHosts: list(env.VITE_DOWNLOAD_ALLOWED_HOSTS).length > 0 ? list(env.VITE_DOWNLOAD_ALLOWED_HOSTS) : [...DEFAULT_DOWNLOAD_HOSTS],
    /** Unsigned binaries stay blocked unless this is explicitly "true". */
    allowUnsigned: env.VITE_ALLOW_UNSIGNED_DOWNLOAD === 'true',
  },
  waitlist: {
    endpoint: env.VITE_WAITLIST_ENDPOINT ?? '/api/waitlist',
    /** Optional Cloudflare Turnstile site key; the widget is only loaded when set. */
    turnstileSiteKey: env.VITE_TURNSTILE_SITE_KEY ?? '',
  },
}
