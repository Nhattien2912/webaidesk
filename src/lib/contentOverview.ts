// "Tất cả nội dung": one inventory of everything the public website shows, joined with what the CMS (D1) knows.
//
// Sources of truth:
//  - CMS records (D1) are the managed content: Blog / Guides / Videos / Apps and the page records (/install, /prompts, /tutorials, FAQ, changelog).
//  - CODE_INVENTORY lists the editorial/technical pieces that live in React source. Pages that the CMS can override show their code
//    default until a page record is published; the rest are reported as "needs migration" or as a deliberate code-only exception.
// This module is pure (no network, no DOM) so the classification is unit-tested.
import type { StudioItem } from '../data/studioFixtures.ts'
import { PAGES, PAGE_IDS, type PageId } from '../content/pageContent.ts'

export type RowType = 'article' | 'guide' | 'video' | 'app' | 'page' | 'code'
export type RowSource = 'cms' | 'code-default' | 'code-only'
/**
 * published        CMS record published (live from CMS)
 * draft            CMS record saved as draft (not live)
 * archived         CMS record archived (not live; for pages the code default is live)
 * default          page the CMS can manage but nothing is published: the code default is live
 * needs-migration  editorial text still only in React source
 * exception        deliberately code-only (release integrity, legal text, behaviour, site structure)
 */
export type RowStatus = 'published' | 'draft' | 'archived' | 'default' | 'needs-migration' | 'exception'
export type LiveFrom = 'cms' | 'code' | 'none'

export interface OverviewRow {
  key: string
  title: string
  type: RowType
  area: string
  publicUrl: string | null
  source: RowSource
  status: RowStatus
  liveFrom: LiveFrom
  updatedAtMs: number | null
  note?: string
  item?: StudioItem
  pageId?: PageId
  /** page the CMS can manage but has no record for yet: the Studio offers "create draft from default" */
  canCreateDraft?: boolean
}

export const TYPE_LABEL: Record<RowType, string> = { article: 'Bài viết', guide: 'Hướng dẫn', video: 'Video', app: 'Ứng dụng', page: 'Trang nội dung', code: 'Nội dung trong code' }
export const SOURCE_LABEL: Record<RowSource, string> = { cms: 'CMS (D1)', 'code-default': 'Mặc định từ code', 'code-only': 'Chỉ trong code' }
export const STATUS_LABEL: Record<RowStatus, string> = {
  published: 'Đã xuất bản',
  draft: 'Bản nháp',
  archived: 'Lưu trữ',
  default: 'Mặc định từ code',
  'needs-migration': 'Cần chuyển vào CMS',
  exception: 'Chỉ trong code (có chủ đích)',
}
export const LIVE_LABEL: Record<LiveFrom, string> = { cms: 'Từ CMS', code: 'Mặc định trong code', none: 'Không công khai' }

export interface CodeEntry {
  key: string
  title: string
  area: string
  publicUrl: string
  status: 'needs-migration' | 'exception'
  note: string
}

/** Editorial/technical content defined in React source and NOT editable in the CMS. Kept honest: every entry names why. */
export const CODE_INVENTORY: CodeEntry[] = [
  { key: 'home-hero', title: 'Trang chủ — Hero và mô phỏng giao diện', area: 'Trang chủ', publicUrl: '/', status: 'needs-migration', note: 'Tiêu đề, mô tả và dữ liệu minh họa nằm trong Hero.tsx, heroDemo.ts, heroWorkers.ts.' },
  { key: 'home-value-strip', title: 'Trang chủ — Dải giá trị / kiến thức / minh bạch', area: 'Trang chủ', publicUrl: '/', status: 'needs-migration', note: 'HomepageExtras.tsx.' },
  { key: 'home-features', title: 'Trang chủ — Tính năng và khả năng', area: 'Trang chủ', publicUrl: '/#features', status: 'needs-migration', note: 'Features.tsx, Capabilities.tsx.' },
  { key: 'home-how', title: 'Trang chủ — Cách hoạt động', area: 'Trang chủ', publicUrl: '/#how-it-works', status: 'needs-migration', note: 'HowItWorks.tsx.' },
  { key: 'home-showcase', title: 'Trang chủ — Giới thiệu sản phẩm', area: 'Trang chủ', publicUrl: '/#product', status: 'needs-migration', note: 'Showcase.tsx, AppPreview.tsx (hình minh họa dựng bằng mã).' },
  { key: 'home-roadmap', title: 'Trang chủ — Lộ trình rút gọn', area: 'Trang chủ', publicUrl: '/#roadmap', status: 'needs-migration', note: 'Roadmap.tsx, homepageRoadmap.ts.' },
  { key: 'home-community', title: 'Trang chủ — Cộng đồng và liên kết xã hội', area: 'Trang chủ', publicUrl: '/#community', status: 'needs-migration', note: 'SocialLinks.tsx, Community.' },
  { key: 'roadmap-page', title: 'Lộ trình phát triển', area: '/roadmap', publicUrl: '/roadmap', status: 'needs-migration', note: 'RoadmapPage.tsx, roadmapV2.ts.' },
  { key: 'why-page', title: 'Vì sao tôi xây dựng AI Desk?', area: '/why-ai-desk', publicUrl: '/why-ai-desk', status: 'needs-migration', note: 'WhyAiDeskPage.tsx (bài dài, có FAQ riêng).' },
  { key: 'download-page', title: 'Tải về (bản phát hành, SHA-256, tệp tải)', area: '/download', publicUrl: '/download', status: 'exception', note: 'Toàn vẹn bản phát hành và liên kết tải không được chỉnh sửa từ CMS.' },
  { key: 'home-download', title: 'Trang chủ — Khối tải về', area: 'Trang chủ', publicUrl: '/#download', status: 'exception', note: 'Trạng thái tải và xác minh bản phát hành do code điều khiển.' },
  { key: 'privacy-page', title: 'Chính sách quyền riêng tư', area: '/privacy', publicUrl: '/privacy', status: 'exception', note: 'Văn bản pháp lý, cần duyệt có chủ đích trước khi đưa vào CMS.' },
  { key: 'terms-page', title: 'Điều khoản sử dụng', area: '/terms', publicUrl: '/terms', status: 'exception', note: 'Văn bản pháp lý, cần duyệt có chủ đích trước khi đưa vào CMS.' },
  { key: 'waitlist', title: 'Biểu mẫu nhận tin AI Desk Pro', area: 'Trang chủ', publicUrl: '/#pro-news', status: 'exception', note: 'Hành vi biểu mẫu, Turnstile và API là kỹ thuật.' },
  { key: 'nav-footer', title: 'Điều hướng và chân trang', area: 'Toàn site', publicUrl: '/', status: 'exception', note: 'Cấu trúc điều hướng nằm trong config/navigation.ts.' },
]

const PAGE_AREA: Record<PageId, string> = { install: '/install', prompts: '/prompts', tutorials: '/tutorials', faq: 'Trang chủ', changelog: '/changelog' }

function publicUrl(item: StudioItem): string | null {
  const slug = item.slug
  if (!slug) return null
  switch (item.type) {
    case 'article': return `/blog/${slug}`
    case 'guide': return `/guides/${slug}`
    case 'app': return `/apps/${slug}`
    case 'video': return '/tutorials'
    default: return null
  }
}

function pageRecordState(item: StudioItem | undefined): { hasRecord: boolean; liveFromCms: boolean } {
  if (!item) return { hasRecord: false, liveFromCms: false }
  const data = item.data as { page?: { published?: unknown } } | undefined
  return { hasRecord: true, liveFromCms: item.status === 'published' && Boolean(data?.page?.published) }
}

export function buildOverview(items: StudioItem[]): OverviewRow[] {
  const rows: OverviewRow[] = []
  const pageItems = new Map<string, StudioItem>()
  for (const item of items) {
    if (item.type === 'page') {
      if (item.slug) pageItems.set(item.slug, item)
      continue
    }
    const live = item.status === 'published'
    rows.push({
      key: `${item.type}:${item.id}`,
      title: item.title,
      type: item.type,
      area: item.type === 'article' ? '/blog' : item.type === 'guide' ? '/guides' : item.type === 'app' ? '/apps' : '/tutorials',
      publicUrl: publicUrl(item),
      source: 'cms',
      status: item.status,
      liveFrom: live ? 'cms' : 'none',
      updatedAtMs: item.updatedAtMs ?? null,
      item,
    })
  }
  for (const id of PAGE_IDS) {
    const def = PAGES[id]
    const item = pageItems.get(id)
    const state = pageRecordState(item)
    rows.push({
      key: `page:${id}`,
      title: def.label,
      type: 'page',
      area: PAGE_AREA[id],
      publicUrl: def.path,
      source: state.liveFromCms ? 'cms' : 'code-default',
      status: !state.hasRecord ? 'default' : state.liveFromCms ? 'published' : item!.status === 'archived' ? 'archived' : 'draft',
      liveFrom: state.liveFromCms ? 'cms' : 'code',
      updatedAtMs: item?.updatedAtMs ?? null,
      note: !state.hasRecord ? 'Chưa có bản ghi CMS — website đang dùng nội dung mặc định trong code.' : state.liveFromCms ? undefined : 'Website đang dùng nội dung mặc định trong code.',
      item,
      pageId: id,
      canCreateDraft: !state.hasRecord,
    })
  }
  for (const entry of CODE_INVENTORY) {
    rows.push({
      key: `code:${entry.key}`,
      title: entry.title,
      type: 'code',
      area: entry.area,
      publicUrl: entry.publicUrl,
      source: 'code-only',
      status: entry.status,
      liveFrom: 'code',
      updatedAtMs: null,
      note: entry.note,
    })
  }
  return rows
}

export interface OverviewFilter {
  query: string
  type: RowType | 'all'
  source: RowSource | 'all'
  status: RowStatus | 'all'
  area: string
  showArchived: boolean
}

export const DEFAULT_FILTER: OverviewFilter = { query: '', type: 'all', source: 'all', status: 'all', area: 'all', showArchived: false }

const fold = (value: string) => value.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd')

export function filterOverview(rows: OverviewRow[], filter: OverviewFilter): OverviewRow[] {
  const q = fold(filter.query.trim())
  return rows.filter((row) => {
    if (!filter.showArchived && filter.status === 'all' && row.status === 'archived' && row.type !== 'page') return false
    if (filter.type !== 'all' && row.type !== filter.type) return false
    if (filter.source !== 'all' && row.source !== filter.source) return false
    if (filter.status !== 'all' && row.status !== filter.status) return false
    if (filter.area !== 'all' && row.area !== filter.area) return false
    if (q && !fold(`${row.title} ${row.publicUrl ?? ''} ${row.area} ${row.note ?? ''} ${row.item?.slug ?? ''}`).includes(q)) return false
    return true
  })
}

export function summarize(rows: OverviewRow[]): Record<RowStatus | 'liveCms' | 'liveCode', number> {
  const base = { published: 0, draft: 0, archived: 0, default: 0, 'needs-migration': 0, exception: 0, liveCms: 0, liveCode: 0 }
  for (const row of rows) {
    base[row.status] += 1
    if (row.liveFrom === 'cms') base.liveCms += 1
    if (row.liveFrom === 'code' && row.type === 'page') base.liveCode += 1
  }
  return base
}
