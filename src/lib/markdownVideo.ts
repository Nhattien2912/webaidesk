// Safe YouTube embeds for CMS Markdown. Authors paste a YouTube URL on a line of its own (a bare autolink); the renderer turns
// exactly that into a privacy-enhanced player. The video id is validated strictly and the iframe host is fixed, so Markdown can never
// inject an arbitrary iframe, script or third-party embed domain.
const ID = /^[A-Za-z0-9_-]{11}$/
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'])

export interface YouTubeRef {
  id: string
  /** YouTube Shorts are vertical (9:16); everything else is shown at 16:9 */
  vertical: boolean
  embedUrl: string
  watchUrl: string
}

export function youtubeFromUrl(value: string): YouTubeRef | null {
  let url: URL
  try { url = new URL(value.trim()) } catch { return null }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !HOSTS.has(url.hostname.toLowerCase())) return null
  let id = ''
  let vertical = false
  if (url.hostname.toLowerCase() === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? ''
  else if (url.pathname === '/watch') id = url.searchParams.get('v') ?? ''
  else {
    const match = /^\/(shorts|embed|live)\/([^/]+)\/?$/.exec(url.pathname)
    if (match) { id = match[2]!; vertical = match[1] === 'shorts' }
  }
  if (!ID.test(id)) return null
  return { id, vertical, embedUrl: `https://www.youtube-nocookie.com/embed/${id}`, watchUrl: vertical ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}` }
}
