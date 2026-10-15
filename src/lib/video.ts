// Turns a configured YouTube URL into a privacy-enhanced embed URL. Anything else => null,
// so an unknown or malformed URL never gets embedded.

export function toYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:') return null
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
  let id: string | null = null
  if (host === 'youtu.be') id = parsed.pathname.slice(1)
  else if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') id = parsed.searchParams.get('v')
    else if (parsed.pathname.startsWith('/embed/') || parsed.pathname.startsWith('/shorts/')) {
      id = parsed.pathname.split('/')[2] ?? null
    }
  }
  if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null
  return `https://www.youtube-nocookie.com/embed/${id}`
}
