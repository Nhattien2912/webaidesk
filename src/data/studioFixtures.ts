import type { ContentStatus } from '../lib/studio'

export interface StudioItem {
  id: string
  type: 'video' | 'article' | 'app' | 'guide' | 'page'
  title: string
  status: ContentStatus
  category: string
  updatedAt: string
  updatedAtMs?: number
  featured?: boolean
  version?: number
  slug?: string
  summary?: string
  bodyMarkdown?: string
  tags?: string[]
  seoTitle?: string
  metaDescription?: string
  data?: Record<string, unknown>
}

export const studioFixtures: StudioItem[] = [
  { id: 'v-01', type: 'video', title: 'Làm quen với AI Desk', status: 'draft', category: 'Bắt đầu', updatedAt: '19/10/2026', featured: true },
  { id: 'a-01', type: 'article', title: 'Thiết kế quy trình làm việc đa AI', status: 'draft', category: 'Workflow', updatedAt: '18/10/2026' },
  { id: 'p-01', type: 'app', title: 'Hũ — Sổ Chi Tiêu AI', status: 'draft', category: 'Ứng dụng', updatedAt: '17/10/2026' },
]

export const mediaFixtures = [
  { id: 'm1', name: 'ai-desk-workspace.webp', type: 'WEBP', dimensions: '1600 × 900', size: '248 KB', color: '#dbeafe', usage: 'Bản nháp bài viết' },
  { id: 'm2', name: 'workflow-cover.webp', type: 'WEBP', dimensions: '1200 × 675', size: '182 KB', color: '#e0e7ff', usage: 'Chưa sử dụng' },
  { id: 'm3', name: 'hu-app-preview.webp', type: 'WEBP', dimensions: '1200 × 900', size: '316 KB', color: '#dcfce7', usage: 'Bản nháp ứng dụng' },
]
