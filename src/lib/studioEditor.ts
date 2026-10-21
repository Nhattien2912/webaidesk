export interface ChangelogEntry { version: string; date: string; notes: string }

const VERSION = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,39}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** One release per line: `version | YYYY-MM-DD | notes`. Blank lines are ignored. */
export function parseChangelog(text: string): { ok: true; entries: ChangelogEntry[] } | { ok: false; line: number } {
  const entries: ChangelogEntry[] = []
  const lines = text.split(/\r?\n/)
  for (const [index, raw] of lines.entries()) {
    if (!raw.trim()) continue
    const [version = '', date = '', ...rest] = raw.split('|').map((part) => part.trim())
    const notes = rest.join(' | ').trim()
    if (!VERSION.test(version) || !DATE.test(date) || !notes || notes.length > 2000) return { ok: false, line: index + 1 }
    entries.push({ version, date, notes })
  }
  return entries.length <= 50 ? { ok: true, entries } : { ok: false, line: 51 }
}

export const formatChangelog = (entries: unknown): string =>
  Array.isArray(entries)
    ? (entries as ChangelogEntry[]).map((entry) => `${entry.version} | ${entry.date} | ${entry.notes}`).join('\n')
    : ''

export const splitList = (text: string, separator: RegExp): string[] =>
  text.split(separator).map((part) => part.trim()).filter(Boolean)

export const joinList = (value: unknown, separator: string): string =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').join(separator) : ''

export interface AppFields {
  websiteUrl: string
  githubUrl: string
  downloadUrl: string
  documentationUrl: string
  currentVersion: string
  platforms: string
  features: string
  changelog: string
}

/** Builds the `data` object for an app. Returns the 1-based invalid changelog line instead of a payload when the text is malformed. */
export function buildAppData(current: Record<string, unknown> | undefined, fields: AppFields): { ok: true; data: Record<string, unknown> } | { ok: false; changelogLine: number } {
  const changelog = parseChangelog(fields.changelog)
  if (!changelog.ok) return { ok: false, changelogLine: changelog.line }
  return {
    ok: true,
    data: {
      ...(current ?? {}),
      websiteUrl: fields.websiteUrl.trim(),
      githubUrl: fields.githubUrl.trim(),
      downloadUrl: fields.downloadUrl.trim(),
      documentationUrl: fields.documentationUrl.trim(),
      currentVersion: fields.currentVersion.trim(),
      platforms: splitList(fields.platforms, /,/),
      features: splitList(fields.features, /\r?\n/),
      changelog: changelog.entries,
    },
  }
}

export function buildVideoData(current: Record<string, unknown> | undefined, input: { youtubeId: string | null; thumbnailUrl: string; displayOrder: string }): Record<string, unknown> {
  const order = input.displayOrder.trim()
  return {
    ...(current ?? {}),
    youtubeId: input.youtubeId,
    thumbnailUrl: input.thumbnailUrl.trim(),
    displayOrder: order === '' ? null : Number(order),
  }
}

export interface GuideFields {
  coverMediaId: string
  order: string
  version: string
  platform: string
  relatedVideoSlugs: string[]
}

/** Builds the `data` object for a guide. The server forces `section: 'guide'` and rejects guide-only keys on blog articles. */
export function buildGuideData(current: Record<string, unknown> | undefined, fields: GuideFields): Record<string, unknown> {
  const order = fields.order.trim()
  return {
    ...(current ?? {}),
    section: 'guide',
    coverMediaId: fields.coverMediaId,
    order: order === '' ? null : Number(order),
    version: fields.version.trim(),
    platform: fields.platform.trim(),
    relatedVideoSlugs: fields.relatedVideoSlugs,
  }
}

/** Markdown for a media-library image. The public site serves it from /api/content/media/<id> once the guide is published. */
export const mediaMarkdown = (id: string, alt: string): string => `![${alt.replace(/[[\]]/g, ' ').replace(/\s+/g, ' ').trim() || 'Ảnh minh họa'}](/api/content/media/${id})`

export function insertAtCursor(text: string, start: number, end: number, snippet: string): { text: string; cursor: number } {
  const before = text.slice(0, start)
  const after = text.slice(end)
  // Always separate blocks with a blank line so lists, quotes and images never merge with the previous block.
  const lead = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const trail = after === '' ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'
  const inserted = `${lead}${snippet}${trail}`
  return { text: `${before}${inserted}${after}`, cursor: before.length + inserted.length }
}

export const MARKDOWN_SNIPPETS: Array<{ id: string; label: string; markdown: string }> = [
  { id: 'step', label: 'Các bước', markdown: '1. Bước một\n2. Bước hai\n3. Bước ba' },
  { id: 'note', label: 'Ghi chú', markdown: '> [!NOTE]\n> Nội dung ghi chú.' },
  { id: 'tip', label: 'Mẹo', markdown: '> [!TIP]\n> Mẹo hữu ích.' },
  { id: 'warning', label: 'Cảnh báo', markdown: '> [!WARNING]\n> Điều cần lưu ý trước khi thực hiện.' },
  { id: 'check', label: 'Checklist', markdown: '- [ ] Việc cần làm một\n- [ ] Việc cần làm hai' },
  { id: 'code', label: 'Khối mã', markdown: '```\nlệnh hoặc đoạn mã\n```' },
]

const FIELD_LABELS: Record<string, string> = {
  title: 'Tiêu đề', slug: 'Slug', summary: 'Mô tả ngắn', bodyMarkdown: 'Nội dung', category: 'Danh mục', status: 'Trạng thái',
  'data.order': 'Thứ tự', 'data.version': 'Phiên bản', 'data.platform': 'Nền tảng', 'data.relatedVideoSlugs': 'Video liên quan',
  'data.coverMediaId': 'Ảnh bìa', 'data.downloadUrl': 'Link tải xuống', 'data.documentationUrl': 'Link tài liệu', 'data.websiteUrl': 'Website', 'data.githubUrl': 'GitHub',
  'data.thumbnailUrl': 'Thumbnail', 'data.youtubeUrl': 'URL YouTube', 'data.displayOrder': 'Thứ tự hiển thị', 'data.currentVersion': 'Phiên bản hiện tại', 'data.changelog': 'Changelog',
}
const FIELD_PROBLEMS: Record<string, string> = {
  required_max_180: 'bắt buộc, tối đa 180 ký tự', invalid_slug: 'không hợp lệ', max_600: 'tối đa 600 ký tự', max_200000: 'quá dài',
  integer_0_9999: 'phải là số nguyên từ 0 đến 9999', integer_0_10000: 'phải là số nguyên từ 0 đến 10000', invalid_version: 'định dạng phiên bản không hợp lệ (ví dụ 1.0.0)',
  max_80: 'tối đa 80 ký tự', video_slug_list_max_6: 'tối đa 6 video đã có trong Studio', uuid_required: 'ảnh không hợp lệ',
  trusted_https_url_required: 'phải là HTTPS và thuộc host đã được duyệt', canonical_https_url_required: 'phải là URL HTTPS hợp lệ', invalid_youtube_url: 'URL YouTube không hợp lệ',
  guide_only: 'chỉ dành cho hướng dẫn', section_not_allowed: 'không được phép với bài viết', section_immutable: 'không thể đổi loại nội dung', unknown_field: 'trường không được hỗ trợ',
  changelog_entries_invalid: 'định dạng sai', string_array_required: 'danh sách không hợp lệ',
}
const API_PROBLEMS: Record<string, string> = {
  version_conflict: 'Nội dung đã được sửa ở nơi khác — hãy tải lại trang trước khi lưu.', slug_conflict: 'Slug này đã được dùng — hãy đổi tiêu đề hoặc slug.',
  media_not_found: 'Một ảnh được tham chiếu không còn trong Thư viện Media.', invalid_status_transition: 'Không thể chuyển trạng thái này (ví dụ từ Lưu trữ sang Xuất bản — hãy đưa về Bản nháp trước).',
  payload_too_large: 'Nội dung quá lớn.', invalid_json: 'Dữ liệu gửi lên không hợp lệ.', csrf_invalid: 'Phiên làm việc đã hết hạn — hãy tải lại trang.', origin_forbidden: 'Yêu cầu bị từ chối vì nguồn không hợp lệ.',
  rate_limited: 'Thao tác quá nhanh — hãy thử lại sau ít phút.', authentication_required: 'Cần đăng nhập lại.', access_forbidden: 'Tài khoản này không có quyền.', database_error: 'Lỗi cơ sở dữ liệu — chưa có thay đổi nào được lưu.',
  not_found: 'Không tìm thấy nội dung.', admin_disabled: 'Khu vực quản trị đang tắt.',
}

/** Human-readable message for a failed save: field-level problems in Vietnamese, with the raw code as fallback. */
export function describeSaveError(status: number, code: string, fields?: Record<string, string>): string {
  if (code === 'validation_failed' && fields && Object.keys(fields).length) {
    const lines = Object.entries(fields).map(([key, problem]) => `${FIELD_LABELS[key] ?? key}: ${FIELD_PROBLEMS[problem] ?? problem}`)
    return `Chưa lưu được — ${lines.join('; ')}.`
  }
  return API_PROBLEMS[code] ?? `Lỗi máy chủ (${status}: ${code}).`
}
