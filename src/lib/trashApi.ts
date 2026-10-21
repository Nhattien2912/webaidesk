// Client for the Studio Trash API (soft delete, restore, guarded permanent delete). Same-origin, behind Cloudflare Access.
export type TrashType = 'article' | 'guide' | 'video' | 'app'
export type OriginalStatus = 'draft' | 'published' | 'archived'

export interface TrashEntry {
  id: string
  type: TrashType
  slug: string
  title: string
  category: string
  originalStatus: OriginalStatus
  version: number
  updatedAt: number
  deletedAt: number
}

export class TrashError extends Error {
  readonly status: number
  readonly code: string
  readonly suggestedSlug?: string
  constructor(status: number, code: string, suggestedSlug?: string) {
    super(code)
    this.status = status
    this.code = code
    this.suggestedSlug = suggestedSlug
  }
}

export const PURGE_PHRASE = 'XOA VINH VIEN'
export const RESOURCE: Record<TrashType, string> = { article: 'articles', guide: 'guides', video: 'videos', app: 'apps' }
export const TYPE_NAME: Record<TrashType, string> = { article: 'Bài viết', guide: 'Hướng dẫn', video: 'Video', app: 'Ứng dụng' }

const BASE = '/api/admin'
let csrf = ''

async function csrfToken(): Promise<string> {
  if (!csrf) {
    const response = await fetch(`${BASE}/session`, { credentials: 'same-origin' })
    const body = (await response.json()) as { data?: { csrfToken?: string } }
    if (!response.ok || !body.data?.csrfToken) throw new TrashError(response.status, 'session_unavailable')
    csrf = body.data.csrfToken
  }
  return csrf
}

async function parse<T>(response: Response): Promise<{ data: T; meta: Record<string, unknown> }> {
  let body: { data?: T; meta?: Record<string, unknown>; error?: { code?: string; suggestedSlug?: string } } = {}
  try { body = await response.json() } catch { /* non-JSON error page */ }
  if (!response.ok) throw new TrashError(response.status, body.error?.code ?? 'request_failed', body.error?.suggestedSlug)
  return { data: body.data as T, meta: body.meta ?? {} }
}

async function post<T>(path: string, payload: Record<string, unknown>) {
  const token = await csrfToken()
  return parse<T>(await fetch(`${BASE}/${path}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-csrf-token': token }, body: JSON.stringify(payload) }))
}

export async function moveToTrash(type: TrashType, id: string, version: number): Promise<TrashEntry> {
  return (await post<TrashEntry>(`${RESOURCE[type]}/${encodeURIComponent(id)}/trash`, { version })).data
}

export interface TrashPage { items: TrashEntry[]; total: number; nextCursor: string | null; permanentDeleteEnabled: boolean }
export async function listTrash(params: { type: TrashType | 'all'; q: string; cursor?: string | null; limit?: number }): Promise<TrashPage> {
  const query = new URLSearchParams({ limit: String(params.limit ?? 10) })
  if (params.type !== 'all') query.set('type', params.type)
  if (params.q.trim()) query.set('q', params.q.trim())
  if (params.cursor) query.set('cursor', params.cursor)
  const result = await parse<TrashEntry[]>(await fetch(`${BASE}/trash?${query}`, { credentials: 'same-origin' }))
  return { items: result.data, total: Number(result.meta.total ?? 0), nextCursor: (result.meta.nextCursor as string | null) ?? null, permanentDeleteEnabled: result.meta.permanentDeleteEnabled === true }
}

export async function restoreFromTrash(id: string, version: number, slug?: string): Promise<{ missingMediaIds: string[] }> {
  const result = await post<TrashEntry>(`trash/${encodeURIComponent(id)}/restore`, slug ? { version, slug } : { version })
  return { missingMediaIds: (result.meta.missingMediaIds as string[] | undefined) ?? [] }
}

export async function purgeFromTrash(id: string, version: number, slug: string, confirm: string): Promise<void> {
  await post(`trash/${encodeURIComponent(id)}/purge`, { version, slug, confirm })
}

/** Vietnamese, actionable text for a failed trash operation. */
export function describeTrashError(error: unknown): string {
  if (!(error instanceof TrashError)) return 'Lỗi mạng — chưa có thay đổi nào được xác nhận. Hãy tải lại trang rồi thử lại.'
  switch (error.code) {
    case 'version_conflict': return 'Nội dung vừa được thay đổi ở nơi khác. Hãy tải lại danh sách rồi thử lại.'
    case 'not_found': return 'Không tìm thấy nội dung (có thể đã được xóa vĩnh viễn).'
    case 'slug_conflict': return `Đường dẫn (slug) đã được dùng bởi nội dung khác.${error.suggestedSlug ? ` Gợi ý: ${error.suggestedSlug}.` : ''}`
    case 'page_protected': return 'Trang cố định của website không thể xóa. Hãy dùng "Gỡ khỏi website" để quay về nội dung mặc định.'
    case 'permanent_delete_disabled': return 'Xóa vĩnh viễn đang bị tắt trên máy chủ.'
    case 'has_comments': return 'Nội dung này còn bình luận. Hãy xử lý bình luận trước khi xóa vĩnh viễn.'
    case 'not_in_trash': return 'Chỉ nội dung đang ở Thùng rác mới có thể xóa vĩnh viễn.'
    case 'confirmation_required':
    case 'slug_confirmation_mismatch': return 'Cụm xác nhận hoặc slug chưa khớp.'
    case 'purge_blocked': return 'Không thể xóa vĩnh viễn vì còn dữ liệu liên quan. Nội dung vẫn nằm trong Thùng rác.'
    case 'rate_limited': return 'Bạn thao tác quá nhanh. Hãy đợi một phút rồi thử lại.'
    case 'csrf_invalid':
    case 'origin_forbidden':
    case 'authentication_required':
    case 'access_invalid': return 'Phiên đăng nhập đã hết hạn. Hãy tải lại trang để đăng nhập lại.'
    default: return `Không thực hiện được (${error.status}: ${error.code}).`
  }
}
