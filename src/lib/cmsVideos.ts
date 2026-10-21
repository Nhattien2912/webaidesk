import type { TutorialVideo } from '../data/tutorials.ts'
import { parseYouTubeId } from './studio.ts'

export interface CmsVideoRecord {
  slug: string
  title: string
  summary: string
  bodyMarkdown?: string
  category: string
  publishedAt: number | null
  data: Record<string, unknown>
}

/** Public API video -> tutorial card. Returns null unless the record carries a real, well-formed YouTube id. */
export function toTutorialVideo(record: CmsVideoRecord): TutorialVideo | null {
  const youtubeId = parseYouTubeId(String(record.data?.youtubeId ?? ''))
  if (!youtubeId || !record.title) return null
  // Only YouTube's image host is allowed by the public CSP; any other custom thumbnail falls back to the derived one.
  const custom = typeof record.data.thumbnailUrl === 'string' ? record.data.thumbnailUrl : ''
  const thumbnail = /^https:\/\/i\.ytimg\.com\//.test(custom) ? custom : ''
  return {
    id: `cms-${record.slug}`,
    title: record.title,
    description: record.summary,
    category: record.category,
    youtubeId,
    thumbnail,
    duration: '',
    publishedAt: record.publishedAt ? new Date(record.publishedAt).toISOString() : '',
    status: 'published',
  }
}

export function orderCmsVideos(records: CmsVideoRecord[]): CmsVideoRecord[] {
  const rank = (record: CmsVideoRecord) => (Number.isInteger(record.data?.displayOrder) ? Number(record.data.displayOrder) : 10_001)
  return [...records].sort((a, b) => rank(a) - rank(b) || (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
}
