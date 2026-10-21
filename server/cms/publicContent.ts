import { listPublicComments } from './comments.ts'
import type { CmsEnv, ContentKind, D1Like } from './types.ts'
import { PAGE_IDS, validateDoc, type PageDoc } from '../../src/content/pageContent.ts'

/**
 * Read-only public content path. This module is the only CMS code the public Pages bundle needs for content:
 * it contains SELECT statements only, never imports admin/Access code, and returns an explicit allow-list DTO
 * (no status, version, audit or internal fields). Draft, archived and soft-deleted rows can never be selected.
 */

type Row = Record<string, unknown>
const parseJson = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(String(value)) as T } catch { return fallback } }
type Section = 'blog' | 'guide'
const KINDS: Record<string, { kind: ContentKind; section?: Section }> = {
  articles: { kind: 'article', section: 'blog' },
  guides: { kind: 'article', section: 'guide' },
  videos: { kind: 'video' },
  apps: { kind: 'app' },
}
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'referrer-policy': 'no-referrer',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
const fail = (code: string, status: number) => json({ error: { code, message: code } }, status)

export interface PublicContentItem {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  tags: string[]
  seoTitle: string
  metaDescription: string
  featured: boolean
  publishedAt: number | null
  updatedAt: number
  coverUrl: string | null
  data: Record<string, unknown>
  bodyMarkdown?: string
  relatedVideos?: Array<{ slug: string; title: string; youtubeId: string }>
}

const LIST_COLUMNS = 'id,slug,title,summary,category,tags_json,seo_title,meta_description,featured,data_json,published_at,updated_at'
const SORT_KEY = 'COALESCE(published_at, updated_at)'
const sectionClause = (section?: Section) =>
  section === 'guide' ? " AND json_extract(data_json, '$.section') = 'guide'" : section === 'blog' ? " AND COALESCE(json_extract(data_json, '$.section'), 'blog') = 'blog'" : ''

function toPublic(row: Row, withBody: boolean): PublicContentItem {
  const data = parseJson<Record<string, unknown>>(row.data_json, {})
  const cover = typeof data.coverMediaId === 'string' && UUID.test(data.coverMediaId) ? data.coverMediaId.toLowerCase() : null
  const item: PublicContentItem = {
    id: String(row.id), slug: String(row.slug), title: String(row.title), summary: String(row.summary), category: String(row.category),
    tags: parseJson<string[]>(row.tags_json, []).filter(tag => typeof tag === 'string').slice(0, 20),
    seoTitle: String(row.seo_title ?? ''), metaDescription: String(row.meta_description ?? ''), featured: Number(row.featured) === 1,
    publishedAt: row.published_at == null ? null : Number(row.published_at), updatedAt: Number(row.updated_at),
    coverUrl: cover ? `/api/content/media/${cover}` : null, data,
  }
  if (withBody) item.bodyMarkdown = String(row.body_markdown ?? '')
  return item
}

export async function listPublished(db: D1Like, kind: ContentKind, limit: number, cursor?: number, section?: Section): Promise<{ items: PublicContentItem[]; nextCursor: number | null }> {
  const values: unknown[] = [kind]
  let cursorClause = ''
  // Guides are an ordered curriculum (explicit `order`, then newest); they are returned in one page, without a cursor.
  if (cursor && section !== 'guide') { cursorClause = ` AND ${SORT_KEY} < ?2`; values.push(cursor) }
  values.push(limit + 1)
  const orderBy = section === 'guide' ? `COALESCE(json_extract(data_json, '$.order'), 9999) ASC, ${SORT_KEY} DESC, id DESC` : `${SORT_KEY} DESC, id DESC`
  const result = await db.prepare(
    `SELECT ${LIST_COLUMNS} FROM cms_contents WHERE kind = ?1 AND status = 'published' AND deleted_at IS NULL${sectionClause(section)}${cursorClause} ORDER BY ${orderBy} LIMIT ?${values.length}`,
  ).bind(...values).all<Row>()
  const rows = result.results ?? []
  const items = rows.slice(0, limit).map(row => toPublic(row, false))
  const last = items.at(-1)
  return { items, nextCursor: section !== 'guide' && rows.length > limit && last ? (last.publishedAt ?? last.updatedAt) : null }
}

export async function publishedBySlug(db: D1Like, kind: ContentKind, slug: string, section?: Section): Promise<PublicContentItem | null> {
  const row = await db.prepare(
    `SELECT ${LIST_COLUMNS},body_markdown FROM cms_contents WHERE kind = ?1 AND slug = ?2 AND status = 'published' AND deleted_at IS NULL${sectionClause(section)}`,
  ).bind(kind, slug).first<Row>()
  if (!row) return null
  const item = toPublic(row, true)
  if (section === 'guide') item.relatedVideos = await relatedVideos(db, item.data.relatedVideoSlugs)
  return item
}

/** Linked Studio videos, resolved at read time: only PUBLISHED, non-deleted videos with a valid YouTube id are exposed. */
async function relatedVideos(db: D1Like, slugs: unknown): Promise<Array<{ slug: string; title: string; youtubeId: string }>> {
  if (!Array.isArray(slugs)) return []
  const wanted = slugs.filter((value): value is string => typeof value === 'string' && value.length <= 180 && SLUG.test(value)).slice(0, 6)
  if (!wanted.length) return []
  const marks = wanted.map((_, index) => `?${index + 1}`).join(',')
  const result = await db.prepare(
    `SELECT slug, title, data_json FROM cms_contents WHERE kind = 'video' AND status = 'published' AND deleted_at IS NULL AND slug IN (${marks})`,
  ).bind(...wanted).all<Row>()
  const byslug = new Map((result.results ?? []).map(row => [String(row.slug), row]))
  const out: Array<{ slug: string; title: string; youtubeId: string }> = []
  for (const slug of wanted) {
    const row = byslug.get(slug)
    const youtubeId = row ? String(parseJson<Record<string, unknown>>(row.data_json, {}).youtubeId ?? '') : ''
    if (row && YOUTUBE_ID.test(youtubeId)) out.push({ slug, title: String(row.title), youtubeId })
  }
  return out
}

/**
 * Serves an image only when it is referenced as the cover/logo of, or embedded in the body of, a PUBLISHED and non-deleted item.
 * Arbitrary media ids (drafts, unreferenced uploads, other buckets keys) are never readable through this route.
 */
export async function servePublicMedia(env: CmsEnv, id: string, method: string): Promise<Response> {
  if (!env.CMS_DB || !env.CMS_MEDIA) return fail('not_found', 404)
  if (!UUID.test(id)) return fail('not_found', 404)
  const mediaId = id.toLowerCase()
  const row = await env.CMS_DB.prepare(
    `SELECT m.storage_key, m.mime FROM cms_media m WHERE m.id = ?1 AND m.deleted_at IS NULL AND EXISTS (SELECT 1 FROM cms_contents c WHERE c.status = 'published' AND c.deleted_at IS NULL AND (json_extract(c.data_json, '$.coverMediaId') = m.id OR json_extract(c.data_json, '$.logoMediaId') = m.id OR instr(c.body_markdown, '/api/content/media/' || m.id) > 0 OR (json_extract(c.data_json, '$.section') = 'page' AND instr(COALESCE(json_extract(c.data_json, '$.page.published'), ''), m.id) > 0)))`,
  ).bind(mediaId).first<{ storage_key: string; mime: string }>()
  if (!row || !IMAGE_MIME.has(row.mime)) return fail('not_found', 404)
  const object = await env.CMS_MEDIA.get(row.storage_key)
  if (!object) return fail('not_found', 404)
  return new Response(method === 'HEAD' ? null : object.body, {
    headers: {
      'content-type': row.mime,
      'cache-control': 'public, max-age=300',
      etag: object.httpEtag,
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
      'cross-origin-resource-policy': 'same-origin',
    },
  })
}

/**
 * Published editorial content for /install, /prompts and /tutorials. Only the PUBLISHED document of a record whose status is `published`
 * is returned (never the draft); 404 means "nothing published" and the website keeps its built-in content.
 */
export async function publishedPage(db: D1Like, id: string): Promise<{ id: string; content: PageDoc; updatedAt: number } | null> {
  const row = await db.prepare(
    "SELECT json_extract(data_json, '$.page.published') AS doc, updated_at FROM cms_contents WHERE kind = 'article' AND slug = ?1 AND status = 'published' AND deleted_at IS NULL AND json_extract(data_json, '$.section') = 'page'",
  ).bind(id).first<Row>()
  if (!row || row.doc == null) return null
  const checked = validateDoc(id, parseJson<unknown>(row.doc, null))
  return checked.ok ? { id, content: checked.doc, updatedAt: Number(row.updated_at) } : null
}

export async function handlePublicContent(request: Request, env: CmsEnv, path: string[]): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return fail('method_not_allowed', 405)
  if (!env.CMS_DB) return fail('cms_not_configured', 503)
  if (path[0] === 'pages') {
    const id = path[1]
    if (path.length !== 2 || !id || !(PAGE_IDS as readonly string[]).includes(id)) return fail('not_found', 404)
    const page = await publishedPage(env.CMS_DB, id)
    return page ? json({ data: page }) : fail('not_found', 404)
  }
  if (path[0] === 'media') return path.length === 2 ? servePublicMedia(env, path[1]!, request.method) : fail('not_found', 404)
  const target = Object.hasOwn(KINDS, path[0] ?? '') ? KINDS[path[0]!] : undefined
  if (!target || path.length > 3) return fail('not_found', 404)
  const { kind, section } = target
  const slug = path[1]
  if (slug !== undefined && (slug.length > 180 || !SLUG.test(slug))) return fail('not_found', 404)
  if (slug && path[2]) {
    if (path[2] !== 'comments' || section === 'guide' || (kind !== 'article' && kind !== 'app')) return fail('not_found', 404)
    return listPublicComments(request, env.CMS_DB, kind, slug)
  }
  if (slug) {
    const item = await publishedBySlug(env.CMS_DB, kind, slug, section)
    return item ? json({ data: item }) : fail('not_found', 404)
  }
  const url = new URL(request.url)
  const maxLimit = section === 'guide' ? 100 : 50
  const limit = Math.min(maxLimit, Math.max(1, Math.trunc(Number(url.searchParams.get('limit') ?? (section === 'guide' ? 100 : 20))) || 20))
  const rawCursor = Number(url.searchParams.get('cursor') ?? 0)
  const cursor = Number.isSafeInteger(rawCursor) && rawCursor > 0 ? rawCursor : undefined
  const result = await listPublished(env.CMS_DB, kind, limit, cursor, section)
  return json({ data: result.items, meta: { nextCursor: result.nextCursor } })
}
