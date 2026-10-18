import React from 'react'
import { AlertTriangle, Check, Download, ExternalLink, Globe2, Monitor, ShieldCheck } from 'lucide-react'
import { publicAlphaRelease, publicDownloadIsOpen } from '../data/publicAlphaRelease'

const List: React.FC<{ items: readonly string[]; tone?: 'positive' | 'warning' }> = ({ items, tone = 'positive' }) => (
  <ul className="mt-5 space-y-3">
    {items.map((item) => (
      <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
        {tone === 'positive' ? (
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
        )}
        <span>{item}</span>
      </li>
    ))}
  </ul>
)

const Card: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactNode }> = ({ title, children, icon }) => (
  <section className="card p-6 sm:p-7">
    <div className="flex items-center gap-3">
      {icon && <span className="text-accent-light">{icon}</span>}
      <h2 className="text-xl font-semibold text-white">{title}</h2>
    </div>
    {children}
  </section>
)

export const DownloadPage: React.FC = () => {
  const release = publicAlphaRelease
  const canDownload = publicDownloadIsOpen(release)

  return (
    <div className="bg-navy">
      <div className="border-b border-white/[0.06] bg-navy-950">
        <div className="container-content py-14 sm:py-20">
          <a href="/" className="text-sm font-medium text-accent-light hover:underline">
            ← Về trang chủ
          </a>
          <div className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="badge bg-accent/15 text-accent-light ring-1 ring-accent/30">{release.channel}</span>
                <span className="badge bg-white/[0.05] text-muted ring-1 ring-line">{release.platform}</span>
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                AI Desk Public Alpha v{release.version}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
                Một bản Alpha có kiểm soát dành cho luồng Manual và Assisted. Bản tải chỉ mở sau khi bộ cài được ký,
                kiểm tra hash và phê duyệt phát hành rõ ràng.
              </p>
            </div>

            <div className="card border-amber-300/20 p-6 text-center sm:p-7" data-release-gate={canDownload ? 'open' : 'closed'}>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200">
                <Download className="h-7 w-7" aria-hidden="true" />
              </span>
              <p className="mt-4 text-sm font-medium text-amber-200">Coming Soon</p>
              <p className="mt-1 text-sm text-muted">Windows x64 · v{release.version}</p>
              <button type="button" className="btn-primary mt-5 w-full" disabled={!canDownload}>
                Chưa mở tải
              </button>
              <p className="mt-3 text-xs leading-relaxed text-subtle">
                Không có tệp thay thế hoặc liên kết tải chưa được xác minh.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-content py-12 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Có trong Public Alpha" icon={<Monitor className="h-5 w-5" aria-hidden="true" />}>
            <List items={release.supportedFeatures} />
          </Card>
          <Card title="Chưa có trong Public Alpha" icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}>
            <List items={release.unavailableFeatures} tone="warning" />
          </Card>
          <Card title="Yêu cầu hệ thống">
            <List items={release.requirements} />
          </Card>
          <Card title="Chrome / Brave và GPT Bridge" icon={<Globe2 className="h-5 w-5" aria-hidden="true" />}>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              GPT Bridge kết nối AI Desk với đúng cuộc trò chuyện GPT Manager đã liên kết. Trong Alpha, người dùng tự
              chạy thiết lập trong ứng dụng và nạp extension được tạo bằng <strong className="text-ink">Load unpacked</strong>.
              Native host và extension chỉ được dùng sau khi kiểm tra danh tính và toàn vẹn thành công.
            </p>
          </Card>
        </div>

        <section className="mt-6 card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-white">Bắt đầu sau khi bản tải được duyệt</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {release.onboardingSteps.map((step, index) => (
              <li key={step} className="rounded-[12px] border border-line bg-navy-900 p-4 text-sm leading-relaxed text-muted">
                <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent-light">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Ghi chú phát hành">
            <List items={release.releaseNotes} />
            <a href="/changelog" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent-light hover:underline">
              Xem changelog <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </Card>
          <Card title="Giới hạn Alpha">
            <List items={release.knownLimitations} tone="warning" />
          </Card>
        </div>

        <aside className="mt-6 rounded-card border border-accent/25 bg-accent/[0.07] p-5 text-sm leading-relaxed text-muted">
          <strong className="text-white">Release gate:</strong> trang này không tự mở tải theo số phiên bản. Cần đồng
          thời có approval, HTTPS artifact URL và SHA-256 hợp lệ; pipeline server vẫn yêu cầu release đã publish, được
          duyệt và ký trước khi phục vụ tệp.
        </aside>
      </div>
    </div>
  )
}
