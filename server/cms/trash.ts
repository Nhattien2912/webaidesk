// Trash (soft delete), restore and guarded permanent delete for Articles, Guides, Videos and Applications.
//
// States, kept strictly separate:
//   Archived  status='archived', deleted_at IS NULL  -> still listed in Studio, never public.      (existing behaviour, untouched)
//   Trashed   deleted_at IS NOT NULL                 -> hidden from every list and public API; row, status, revisions, media kept.
//   Purged    row removed                            -> only through `purge`, owner confirmation, flag, and zero dependencies.
//
// Fixed website pages (/install, /prompts, /tutorials, FAQ, Changelog) are `section='page'` records: they can never be trashed or purged.
// Authentication, Origin and CSRF checks for every POST are performed by `authorize()` in handler.ts before this module runs.
import { mapRow } from './repository.ts'
import { sectionOf } from './validation.ts'
import { slugify } from '../../src/lib/studio.ts'
import type { AccessIdentity, CmsContent, CmsEnv, ContentKind } from './types.ts'

export const PURGE_CONFIRMATION = 'XOA VINH VIEN'
export type TrashType = 'article' | 'guide' | 'video' | 'app'

const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; frame-ancestors 'none'", 'referrer-policy': 'no-referrer' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
const fail = (code: string, status: number, extra?: Record<string, unknown>) => json({ error: { code, message: code, ...extra, requestId: crypto.randomUUID() } }, status)

const typeOf = (item: CmsContent): TrashType => (item.kind === 'article' ? (sectionOf(item) === 'guide' ? 'guide' : 'article') : item.kind)
const RESOURCE_TYPES: Record<string, TrashType> = { articles: 'article', guides: 'guide', videos: 'video', apps: 'app' }
const TYPES: TrashType[] = ['article', 'guide', 'video', 'app']
const MAX_BODY = 4096

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_BODY) throw new Error('payload_too_large')
  if (!text.trim()) return {}
  const value = JSON.parse(text) as unknown
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

interface TrashRow { item: CmsContent; deletedAt: number | null }
async function load(env: CmsEnv, id: string): Promise<TrashRow | null> {
  const row = await env.CMS_DB!.prepare('SELECT * FROM cms_contents WHERE id=?1').bind(id).first<Record<string, unknown>>()
  return row ? { item: mapRow(row), deletedAt: row.deleted_at == null ? null : Number(row.deleted_at) } : null
}
const summary = (item: CmsContent, deletedAt: number | null) => ({
  id: item.id,
  type: typeOf(item),
  slug: item.slug,
  title: item.title,
  category: item.category,
  originalStatus: item.status,
  version: item.version,
  updatedAt: item.updatedAt,
  deletedAt,
})
const isSlugConflict = (error: unknown) => error instanceof Error && /UNIQUE constraint failed|ux_cms_contents_kind_slug_active/i.test(error.message)

function mediaIds(item: CmsContent): string[] {
  const ids = new Set<string>()
  const data = item.data as Record<string, unknown>
  for (const key of ['coverMediaId', 'logoMediaId']) if (typeof data[key] === 'string' && data[key]) ids.add(data[key] as string)
  for (const match of item.bodyMarkdown.matchAll(/\/api\/(?:admin|content)\/media\/([0-9a-f-]{36})/gi)) ids.add(match[1]!)
  return [...ids]
}

async function list(request: Request, env: CmsEnv): Promise<Response> {
  const url = new URL(request.url)
  const type = url.searchParams.get('type') ?? 'all'
  if (type !== 'all' && !TYPES.includes(type as TrashType)) return fail('invalid_type', 400)
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? 20) || 20))
  const query = (url.searchParams.get('q') ?? '').slice(0, 100)
  const clauses = ["deleted_at IS NOT NULL", "COALESCE(json_extract(data_json,'$.section'),'blog') <> 'page'"]
  const values: unknown[] = []
  const bind = (value: unknown) => { values.push(value); return `?${values.length}` }
  if (type === 'guide') clauses.push("json_extract(data_json,'$.section') = 'guide'")
  else if (type === 'article') clauses.push("kind = 'article' AND COALESCE(json_extract(data_json,'$.section'),'blog') = 'blog'")
  else if (type !== 'all') clauses.push(`kind = ${bind(type)}`)
  if (query) {
    const like = bind(`%${query.replace(/[\\%_]/g, '\\$&')}%`)
    clauses.push(`(title LIKE ${like} ESCAPE '\\' OR slug LIKE ${like} ESCAPE '\\')`)
  }
  const total = Number((await env.CMS_DB!.prepare(`SELECT COUNT(*) c FROM cms_contents WHERE ${clauses.join(' AND ')}`).bind(...values).first<{ c: number }>())?.c ?? 0)
  const cursor = url.searchParams.get('cursor')
  if (cursor) {
    const match = /^(\d{1,16})\.([0-9a-f-]{36})$/i.exec(cursor)
    if (!match) return fail('invalid_cursor', 400)
    const at = bind(Number(match[1]))
    const id = bind(match[2])
    clauses.push(`(deleted_at < ${at} OR (deleted_at = ${at} AND id < ${id}))`)
  }
  const result = await env.CMS_DB!.prepare(`SELECT * FROM cms_contents WHERE ${clauses.join(' AND ')} ORDER BY deleted_at DESC, id DESC LIMIT ${bind(limit + 1)}`).bind(...values).all<Record<string, unknown>>()
  const rows = result.results ?? []
  const page = rows.slice(0, limit)
  const items = page.map((row) => summary(mapRow(row), Number(row.deleted_at)))
  const last = page.at(-1)
  return json({ data: items, meta: { total, nextCursor: rows.length > limit && last ? `${Number(last.deleted_at)}.${String(last.id)}` : null, permanentDeleteEnabled: env.CMS_PERMANENT_DELETE_ENABLED === 'true' } })
}

async function trash(env: CmsEnv, id: string, expected: TrashType | null, version: number, actor: string, now: number): Promise<Response> {
  const found = await load(env, id)
  if (!found) return fail('not_found', 404)
  const { item } = found
  if (sectionOf(item) === 'page') return fail('page_protected', 403)
  if (expected && typeOf(item) !== expected) return fail('not_found', 404)
  if (found.deletedAt !== null) return json({ data: summary(item, found.deletedAt), meta: { alreadyTrashed: true } })
  if (item.version !== version) return fail('version_conflict', 409)
  const mutationId = crypto.randomUUID()
  const nextVersion = item.version + 1
  const snapshot = JSON.stringify({ ...item, version: nextVersion, updatedAt: now, deletedAt: now })
  const result = await env.CMS_DB!.batch([
    env.CMS_DB!.prepare("UPDATE cms_contents SET deleted_at=?1,version=version+1,updated_at=?1,last_mutation_id=?2 WHERE id=?3 AND version=?4 AND deleted_at IS NULL AND COALESCE(json_extract(data_json,'$.section'),'blog') <> 'page'").bind(now, mutationId, id, version),
    env.CMS_DB!.prepare('INSERT INTO cms_content_revisions (id,content_id,version,snapshot_json,actor,created_at) SELECT ?1,?2,?3,?4,?5,?6 WHERE EXISTS (SELECT 1 FROM cms_contents WHERE id=?2 AND last_mutation_id=?7)').bind(crypto.randomUUID(), id, nextVersion, snapshot, actor, now, mutationId),
    env.CMS_DB!.prepare("INSERT INTO cms_audit_events (id,actor,operation,entity_type,entity_id,outcome,metadata_json,created_at) SELECT ?1,?2,'trash',?3,?4,'success',?5,?6 WHERE EXISTS (SELECT 1 FROM cms_contents WHERE id=?4 AND last_mutation_id=?7)").bind(crypto.randomUUID(), actor, item.kind, id, JSON.stringify({ fromVersion: version, toVersion: nextVersion, originalStatus: item.status }), now, mutationId),
  ])
  if (Number(result[0]?.meta?.changes ?? 0) !== 1) return fail('version_conflict', 409)
  return json({ data: summary({ ...item, version: nextVersion, updatedAt: now }, now), meta: { alreadyTrashed: false } })
}

async function restore(env: CmsEnv, id: string, version: number, slugInput: unknown, actor: string, now: number): Promise<Response> {
  const found = await load(env, id)
  if (!found) return fail('not_found', 404)
  const { item } = found
  if (sectionOf(item) === 'page') return fail('page_protected', 403)
  if (found.deletedAt === null) return json({ data: summary(item, null), meta: { alreadyRestored: true } })
  if (item.version !== version) return fail('version_conflict', 409)
  let slug = item.slug
  if (slugInput !== undefined && slugInput !== null && slugInput !== '') {
    if (typeof slugInput !== 'string') return fail('invalid_slug', 400)
    slug = slugify(slugInput)
    if (!slug || slug.length > 180) return fail('invalid_slug', 400)
  }
  // A restored item never silently becomes public again: it returns as a draft and needs an explicit Publish.
  const mutationId = crypto.randomUUID()
  const nextVersion = item.version + 1
  const restored: CmsContent = { ...item, slug, status: 'draft', version: nextVersion, updatedAt: now, archivedAt: null }
  try {
    const result = await env.CMS_DB!.batch([
      env.CMS_DB!.prepare("UPDATE cms_contents SET deleted_at=NULL,slug=?1,status='draft',archived_at=NULL,version=version+1,updated_at=?2,last_mutation_id=?3 WHERE id=?4 AND version=?5 AND deleted_at IS NOT NULL").bind(slug, now, mutationId, id, version),
      env.CMS_DB!.prepare('INSERT INTO cms_content_revisions (id,content_id,version,snapshot_json,actor,created_at) SELECT ?1,?2,?3,?4,?5,?6 WHERE EXISTS (SELECT 1 FROM cms_contents WHERE id=?2 AND last_mutation_id=?7)').bind(crypto.randomUUID(), id, nextVersion, JSON.stringify(restored), actor, now, mutationId),
      env.CMS_DB!.prepare("INSERT INTO cms_audit_events (id,actor,operation,entity_type,entity_id,outcome,metadata_json,created_at) SELECT ?1,?2,'restore',?3,?4,'success',?5,?6 WHERE EXISTS (SELECT 1 FROM cms_contents WHERE id=?4 AND last_mutation_id=?7)").bind(crypto.randomUUID(), actor, item.kind, id, JSON.stringify({ fromVersion: version, toVersion: nextVersion, originalStatus: item.status, restoredStatus: 'draft', slugChanged: slug !== item.slug }), now, mutationId),
    ])
    if (Number(result[0]?.meta?.changes ?? 0) !== 1) return fail('version_conflict', 409)
  } catch (error) {
    if (!isSlugConflict(error)) throw error
    let suggestion = ''
    for (let n = 2; n < 50 && !suggestion; n++) {
      const candidate = `${slug}-${n}`.slice(0, 180)
      const taken = await env.CMS_DB!.prepare('SELECT 1 x FROM cms_contents WHERE kind=?1 AND slug=?2 AND deleted_at IS NULL').bind(item.kind, candidate).first()
      if (!taken) suggestion = candidate
    }
    return fail('slug_conflict', 409, { suggestedSlug: suggestion })
  }
  const missing: string[] = []
  for (const mediaId of mediaIds(item)) {
    const row = await env.CMS_DB!.prepare('SELECT 1 x FROM cms_media WHERE id=?1 AND deleted_at IS NULL').bind(mediaId).first()
    if (!row) missing.push(mediaId)
  }
  return json({ data: summary(restored, null), meta: { alreadyRestored: false, restoredStatus: 'draft', missingMediaIds: missing } })
}

async function purge(env: CmsEnv, id: string, version: number, body: Record<string, unknown>, actor: string, now: number): Promise<Response> {
  if (env.CMS_PERMANENT_DELETE_ENABLED !== 'true') return fail('permanent_delete_disabled', 403)
  const found = await load(env, id)
  if (!found) return fail('not_found', 404)
  const { item } = found
  if (sectionOf(item) === 'page') return fail('page_protected', 403)
  if (found.deletedAt === null) return fail('not_in_trash', 409)
  if (body.confirm !== PURGE_CONFIRMATION) return fail('confirmation_required', 400)
  if (body.slug !== item.slug) return fail('slug_confirmation_mismatch', 400)
  if (item.version !== version) return fail('version_conflict', 409)
  const comments = Number((await env.CMS_DB!.prepare('SELECT COUNT(*) c FROM cms_comments WHERE content_id=?1').bind(id).first<{ c: number }>())?.c ?? 0)
  if (comments > 0) return fail('has_comments', 409, { comments })
  const guard = 'EXISTS (SELECT 1 FROM cms_contents WHERE id=?1 AND version=?2 AND deleted_at IS NOT NULL)'
  try {
    const result = await env.CMS_DB!.batch([
      // The audit record keeps only non-sensitive identifiers (kind, slug, last version) — no title, body or media.
      env.CMS_DB!.prepare(`INSERT INTO cms_audit_events (id,actor,operation,entity_type,entity_id,outcome,metadata_json,created_at) SELECT ?3,?4,'purge',?5,?1,'success',?6,?7 WHERE ${guard}`).bind(id, version, crypto.randomUUID(), actor, item.kind, JSON.stringify({ kind: item.kind, slug: item.slug, lastVersion: version }), now),
      env.CMS_DB!.prepare(`DELETE FROM cms_content_media WHERE content_id=?1 AND ${guard}`).bind(id, version),
      env.CMS_DB!.prepare(`DELETE FROM cms_videos WHERE content_id=?1 AND ${guard}`).bind(id, version),
      env.CMS_DB!.prepare(`DELETE FROM cms_applications WHERE content_id=?1 AND ${guard}`).bind(id, version),
      env.CMS_DB!.prepare(`DELETE FROM cms_content_revisions WHERE content_id=?1 AND ${guard}`).bind(id, version),
      env.CMS_DB!.prepare('DELETE FROM cms_contents WHERE id=?1 AND version=?2 AND deleted_at IS NOT NULL').bind(id, version),
    ])
    if (Number(result[5]?.meta?.changes ?? 0) !== 1) return fail('version_conflict', 409)
  } catch {
    // Foreign keys are RESTRICT: anything unexpected rolls the whole batch back and leaves the item in Trash.
    return fail('purge_blocked', 409)
  }
  // R2 objects and cms_media rows are never touched: media may be shared with other content.
  return json({ data: { id, purged: true, mediaKept: true } })
}

export async function handleTrash(request: Request, env: CmsEnv, path: string[], identity: AccessIdentity, now: number): Promise<Response> {
  if (path[0] === 'trash' && !path[1] && request.method === 'GET') return list(request, env)
  if (request.method !== 'POST') return fail('method_not_allowed', 405)
  let body: Record<string, unknown> | null
  try { body = await readBody(request) } catch (error) { return fail(error instanceof Error && error.message === 'payload_too_large' ? 'payload_too_large' : 'invalid_json', error instanceof Error && error.message === 'payload_too_large' ? 413 : 400) }
  if (!body) return fail('invalid_json', 400)
  const version = Number(body.version)
  if (!Number.isInteger(version) || version < 1) return fail('version_required', 400)
  const id = path[1]
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return fail('not_found', 404)
  if (path[0] !== 'trash' && path[2] === 'trash') {
    if (path[0] === 'pages') return fail('page_protected', 403)
    const expected = RESOURCE_TYPES[path[0] ?? '']
    if (!expected) return fail('not_found', 404)
    return trash(env, id, expected, version, identity.email, now)
  }
  if (path[0] === 'trash' && path[2] === 'restore') return restore(env, id, version, body.slug, identity.email, now)
  if (path[0] === 'trash' && path[2] === 'purge') return purge(env, id, version, body, identity.email, now)
  return fail('not_found', 404)
}

export type { ContentKind }
