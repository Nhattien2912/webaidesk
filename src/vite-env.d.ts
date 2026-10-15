/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string
  readonly VITE_CONTACT_EMAIL?: string
  readonly VITE_INTRO_VIDEO_URL?: string
  readonly VITE_SOCIAL_YOUTUBE_URL?: string
  readonly VITE_SOCIAL_FACEBOOK_URL?: string
  readonly VITE_SOCIAL_GITHUB_URL?: string
  readonly VITE_RELEASE_MANIFEST_URL?: string
  readonly VITE_DOWNLOAD_ALLOWED_HOSTS?: string
  readonly VITE_ALLOW_UNSIGNED_DOWNLOAD?: string
  readonly VITE_WAITLIST_ENDPOINT?: string
  readonly VITE_TURNSTILE_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
