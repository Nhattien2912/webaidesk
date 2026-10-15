/** Official AI Desk social channels, provided by the project owner (2026-10-15). */
export const OFFICIAL_SOCIAL_URLS = {
  youtube: 'https://www.youtube.com/@NhattienIT',
  facebook: 'https://www.facebook.com/profile.php?id=61595065515012',
} as const

/** A non-empty override wins; an empty or missing env value falls back to the official default. */
export function socialUrl(override: string | undefined, fallback: string): string {
  const value = override?.trim()
  return value ? value : fallback
}

/** Only https URLs are usable as links; anything else counts as "not configured". */
export function usableUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}
