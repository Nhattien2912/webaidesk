import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface PageLayoutProps {
  title: string
  intro?: string
  /** Shown for legal drafts that have not been reviewed yet. */
  needsReview?: boolean
  updated?: string
  children: React.ReactNode
}

export const PageLayout: React.FC<PageLayoutProps> = ({ title, intro, needsReview, updated, children }) => (
  <div className="bg-navy">
    <div className="border-b border-white/[0.06] bg-navy-950">
      <div className="container-content py-14 sm:py-16">
        <a href="/" className="text-sm font-medium text-accent-light hover:underline">
          ← Về trang chủ
        </a>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 max-w-2xl text-lg text-muted">{intro}</p>}
        {updated && <p className="mt-3 text-sm text-subtle">Cập nhật: {updated}</p>}
      </div>
    </div>
    <div className="container-content py-12">
      {needsReview && (
        <div role="note" className="mb-10 flex max-w-3xl gap-3 rounded-card border border-amber-400/30 bg-amber-400/[0.07] p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            <strong>Bản nháp — cần duyệt.</strong> Nội dung này được soạn từ hiện trạng kỹ thuật của AI Desk và chưa
            được rà soát pháp lý. Các mục ghi <em>[cần cấu hình]</em> sẽ được bổ sung trước khi phát hành công khai.
          </p>
        </div>
      )}
      <div className="prose-content max-w-3xl space-y-8 text-[15px] leading-relaxed text-muted">{children}</div>
    </div>
  </div>
)

export const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold text-ink">{title}</h2>
    {children}
  </section>
)
