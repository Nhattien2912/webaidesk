// Client for the Studio bug report API (reports sent from the AI Desk desktop app). Same-origin, behind Cloudflare Access, GET only.
export interface BugReport {
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
export interface BugReportFilters { appVersion: string; channel: string; errorCode: string; worker: string }
export interface BugReportPage { items: BugReport[]; nextCursor: string | null }
export interface Facet { value: string; count: number }
export interface BugReportFacets { appVersions: Facet[]; errorCodes: Facet[]; workers: Facet[]; channels: string[] }

export class BugReportsError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

const BASE = '/api/admin/bug-reports'
export const CHANNEL_NAME: Record<string, string> = { stable: 'Stable', beta: 'Beta', dev: 'Dev' }

async function parse<T>(response: Response): Promise<{ data: T; meta: Record<string, unknown> }> {
  let body: { data?: T; meta?: Record<string, unknown>; error?: { code?: string } } = {}
  try { body = await response.json() } catch { /* non-JSON error page */ }
  if (!response.ok) throw new BugReportsError(response.status, body.error?.code ?? 'request_failed')
  return { data: body.data as T, meta: body.meta ?? {} }
}

export function bugReportQuery(filters: BugReportFilters, cursor: string | null, limit = 20): string {
  const query = new URLSearchParams({ limit: String(limit) })
  for (const key of ['appVersion', 'channel', 'errorCode', 'worker'] as const) if (filters[key].trim()) query.set(key, filters[key].trim())
  if (cursor) query.set('cursor', cursor)
  return query.toString()
}

export async function listBugReports(filters: BugReportFilters, cursor: string | null): Promise<BugReportPage> {
  const result = await parse<BugReport[]>(await fetch(`${BASE}?${bugReportQuery(filters, cursor)}`, { credentials: 'same-origin' }))
  return { items: result.data, nextCursor: (result.meta.nextCursor as string | null) ?? null }
}

export async function bugReportFacets(): Promise<BugReportFacets> {
  return (await parse<BugReportFacets>(await fetch(`${BASE}/facets`, { credentials: 'same-origin' }))).data
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** Vietnamese, actionable text for a failed request. */
export function describeBugReportsError(error: unknown): string {
  if (!(error instanceof BugReportsError)) return 'Lỗi mạng — không tải được danh sách báo lỗi. Hãy thử lại.'
  switch (error.code) {
    case 'cms_not_configured': return 'Máy chủ chưa gắn cơ sở dữ liệu (CMS_DB).'
    case 'invalid_channel':
    case 'invalid_cursor': return 'Bộ lọc không hợp lệ. Hãy xóa bộ lọc rồi thử lại.'
    case 'rate_limited': return 'Bạn thao tác quá nhanh. Hãy đợi một phút rồi thử lại.'
    case 'authentication_required':
    case 'access_invalid': return 'Phiên đăng nhập đã hết hạn. Hãy tải lại trang để đăng nhập lại.'
    default: return `Không tải được (${error.status}: ${error.code}).`
  }
}
