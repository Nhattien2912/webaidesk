// Studio admin: bug reports sent from the AI Desk desktop app ("Gửi báo lỗi"). Read-only, GET only, reached through
// handleAdminContent after the same Cloudflare Access authorization as the rest of the admin API.
//   GET bug-reports?appVersion=&channel=&errorCode=&worker=&limit=&cursor=   newest first, keyset pagination
//   GET bug-reports/facets                                                   values for the filter dropdowns
//   GET bug-reports/<BR-XXXXXX>                                              one report (metadata)
//   GET bug-reports/<BR-XXXXXX>/bundle                                       download the raw JSON from the private R2 bucket
import type { CmsEnv } from './types.ts'
import { CHANNELS, REPORT_ID_RE } from '../bugReportRules.ts'

interface Row {
  id: string
  created_at: number
  app_version: string
  channel: string
  os: string
  description: string
  bundle_key: string
  bundle_bytes: number
  error_codes: string
  workers: string
}
export interface BugReportSummary {
  id: string
  createdAt: number
  appVersion: string
  channel: string
  os: string
  description: string
  bundleBytes: number
  errorCodes: string[]
  workers: string[]
  bundleUrl: string
}

const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
const fail = (code: string, status: number) => json({ error: { code, message: code, requestId: crypto.randomUUID() } }, status)
const COLUMNS = 'id,created_at,app_version,channel,os,description,bundle_key,bundle_bytes,error_codes,workers'
const FILTER_MAX = 64

function parseList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

const toSummary = (row: Row): BugReportSummary => ({
  id: row.id,
  createdAt: row.created_at,
  appVersion: row.app_version,
  channel: row.channel,
  os: row.os,
  description: row.description,
  bundleBytes: row.bundle_bytes,
  errorCodes: parseList(row.error_codes),
  workers: parseList(row.workers),
  bundleUrl: `/api/admin/bug-reports/${row.id}/bundle`,
})

/** Cursor = "<created_at>.<id>" of the last row of the previous page. */
function parseCursor(value: string | null): { createdAt: number; id: string } | null {
  const match = /^(\d{1,16})\.(BR-[0-9A-HJKMNP-TV-Z]{6})$/.exec(value ?? '')
  return match ? { createdAt: Number(match[1]), id: match[2]! } : null
}

export async function handleAdminBugReports(request: Request, env: CmsEnv, path: string[]): Promise<Response> {
  if (request.method !== 'GET') return fail('method_not_allowed', 405)
  const db = env.BUG_REPORTS_DB ?? env.CMS_DB
  if (!db) return fail('cms_not_configured', 503)
  const [, id, sub] = path

  if (id === 'facets' && !sub) {
    const [versions, codes, workers] = await Promise.all([
      db.prepare('SELECT app_version AS v, COUNT(*) AS n FROM bug_reports GROUP BY app_version ORDER BY MAX(created_at) DESC LIMIT 50').all<{ v: string; n: number }>(),
      db.prepare('SELECT j.value AS v, COUNT(*) AS n FROM bug_reports, json_each(bug_reports.error_codes) AS j GROUP BY j.value ORDER BY n DESC, v LIMIT 100').all<{ v: string; n: number }>(),
      db.prepare('SELECT j.value AS v, COUNT(*) AS n FROM bug_reports, json_each(bug_reports.workers) AS j GROUP BY j.value ORDER BY n DESC, v LIMIT 50').all<{ v: string; n: number }>(),
    ])
    const facet = (result: { results?: Array<{ v: string; n: number }> }) => (result.results ?? []).map((row) => ({ value: row.v, count: Number(row.n) }))
    return json({ data: { appVersions: facet(versions), errorCodes: facet(codes), workers: facet(workers), channels: [...CHANNELS] } })
  }

  if (id) {
    if (!REPORT_ID_RE.test(id) || (sub && sub !== 'bundle') || path.length > 3) return fail('not_found', 404)
    const row = await db.prepare(`SELECT ${COLUMNS} FROM bug_reports WHERE id = ?1`).bind(id).first<Row>()
    if (!row) return fail('not_found', 404)
    if (!sub) return json({ data: toSummary(row) })
    if (!env.BUG_REPORTS) return fail('bug_reports_not_configured', 503)
    const object = await env.BUG_REPORTS.get(row.bundle_key)
    if (!object) return fail('bundle_missing', 404)
    return new Response(object.body, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="${row.id}.json"`,
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox",
        'referrer-policy': 'no-referrer',
      },
    })
  }

  const url = new URL(request.url)
  const where: string[] = []
  const binds: unknown[] = []
  const add = (clause: string, value: unknown) => { binds.push(value); where.push(clause.replace('?', `?${binds.length}`)) }
  const filter = (name: string) => (url.searchParams.get(name) ?? '').trim().slice(0, FILTER_MAX)
  const appVersion = filter('appVersion')
  const channel = filter('channel')
  const errorCode = filter('errorCode')
  const worker = filter('worker').toLowerCase()
  if (appVersion) add('app_version = ?', appVersion)
  if (channel) {
    if (!(CHANNELS as readonly string[]).includes(channel)) return fail('invalid_channel', 400)
    add('channel = ?', channel)
  }
  if (errorCode) add('EXISTS (SELECT 1 FROM json_each(bug_reports.error_codes) WHERE value = ?)', errorCode)
  if (worker) add('EXISTS (SELECT 1 FROM json_each(bug_reports.workers) WHERE value = ?)', worker)
  const rawCursor = url.searchParams.get('cursor')
  const cursor = parseCursor(rawCursor)
  if (rawCursor && !cursor) return fail('invalid_cursor', 400)
  if (cursor) {
    binds.push(cursor.createdAt, cursor.id)
    where.push(`(created_at < ?${binds.length - 1} OR (created_at = ?${binds.length - 1} AND id < ?${binds.length}))`)
  }
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 30) || 30))
  binds.push(limit + 1)
  const result = await db
    .prepare(`SELECT ${COLUMNS} FROM bug_reports${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC LIMIT ?${binds.length}`)
    .bind(...binds)
    .all<Row>()
  const rows = result.results ?? []
  const page = rows.slice(0, limit)
  const last = page[page.length - 1]
  return json({ data: page.map(toSummary), meta: { nextCursor: rows.length > limit && last ? `${last.created_at}.${last.id}` : null } })
}
