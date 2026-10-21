export type ContentStatus = 'draft' | 'published' | 'archived'

export function parseYouTubeId(value: string): string | null {
  const input = value.trim()
  if (/^[\w-]{11}$/.test(input)) return input
  try {
    const url = new URL(input)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    let id = ''
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? ''
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v') ?? ''
      else id = url.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})/)?.[1] ?? ''
    }
    return /^[\w-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const transitions: Record<ContentStatus, ContentStatus[]> = {
  draft: ['published', 'archived'],
  published: ['draft', 'archived'],
  archived: ['draft'],
}

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return from === to || transitions[from].includes(to)
}

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}
