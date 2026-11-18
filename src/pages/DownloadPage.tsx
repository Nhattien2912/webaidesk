import React, { useState } from 'react'
import { AlertTriangle, Check, Copy, Download, ExternalLink, Globe2, Loader2, Monitor, ShieldCheck } from 'lucide-react'
import { publicAlphaRelease } from '../data/publicAlphaRelease'
import { siteConfig } from '../config/site'
import { formatReleaseFileSize, formatReleaseVersion, validateReleaseManifest } from '../lib/releaseManifest'
import { useDownloadState } from '../lib/useDownloadState'
import { RAR_CONTENTS, directDisplayLabel, type DownloadView, type DirectRelease } from '../lib/directDownload'
import { DirectDownloadNotice, DirectExtensionDownload } from '../components/DownloadSection'

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

const ChecksumCopy: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button type="button" onClick={copy} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brand-primary hover:bg-brand-ice" aria-label="Sao chép SHA-256">
      <Copy className="h-3 w-3" aria-hidden="true" />
      {copied ? 'Đã sao chép' : 'Sao chép SHA-256'}
    </button>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN')
}

/** Direct R2 download card: same single primary button, with the unsigned/AV risk notice. */
const DirectDownloadCard: React.FC<{ release: DirectRelease }> = ({ release }) => (
  <div className="card border-amber-300/20 p-6 text-center sm:p-7" data-release-gate="direct" data-manifest-state="direct">
    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200">
      <Download className="h-7 w-7" aria-hidden="true" />
    </span>
    <p className="mt-4 text-sm font-medium text-amber-200">Beta · chưa ký số</p>
    <p className="mt-1 text-sm text-muted">Windows x64 · phiên bản {release.versionLabel} · {release.format}</p>
    <a href={release.url} download={release.fileName} className="btn-primary mt-5 w-full" rel="noopener" data-direct-download="true">
      <Download className="h-4 w-4" aria-hidden="true" />
      Tải AI Desk {directDisplayLabel(release)}
    </a>
    <DirectDownloadNotice release={release} className="mt-4 text-left text-xs" />
    {release.extension && <DirectExtensionDownload extension={release.extension} className="mt-4" />}
    <dl className="mt-5 space-y-2 border-t border-line pt-4 text-left text-xs">
      <div className="flex justify-between gap-3">
        <dt className="text-subtle">Phiên bản</dt>
        <dd className="text-ink">{release.versionLabel}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-subtle">Dung lượng</dt>
        <dd className="text-ink">{formatReleaseFileSize({ kind: release.format === 'RAR' ? 'archive' : 'installer', sizeBytes: release.sizeBytes })}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-subtle">Định dạng</dt>
        <dd className="text-ink">{release.format}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-subtle">Tệp</dt>
        <dd className="break-all text-right text-ink">{release.fileName}</dd>
      </div>
      {release.format === 'RAR' && (
        <div className="flex justify-between gap-3">
          <dt className="text-subtle">Gồm</dt>
          <dd className="text-right text-ink">{RAR_CONTENTS}</dd>
        </div>
      )}
      <div>
        <dt className="text-subtle">SHA-256</dt>
        <dd className="mt-1 break-all font-mono text-[11px] leading-relaxed text-ink">{release.sha256}</dd>
        <ChecksumCopy value={release.sha256} />
      </div>
    </dl>
  </div>
)

/** The only opening path is a DownloadState that already passed validateReleaseManifest. */
export const PublicAlphaDownloadCard: React.FC<{ state: DownloadView; fallbackVersion: string }> = ({ state, fallbackVersion }) => {
  if (state.kind === 'direct') return <DirectDownloadCard release={state.release} />
  const checked =
    state.kind === 'available'
      ? validateReleaseManifest(state.manifest, { allowedHosts: siteConfig.release.allowedHosts, allowUnsigned: false })
      : null
  const manifest = checked?.ok ? checked.manifest : null
  const installer = checked?.ok ? checked.primary : null
  const available = manifest !== null && installer !== null

  return (
    <div
      className={`card p-6 text-center sm:p-7 ${available ? 'border-emerald-300/20' : 'border-amber-300/20'}`}
      data-release-gate={available ? 'open' : 'closed'}
      data-manifest-state={state.kind}
      aria-busy={state.kind === 'loading'}
    >
      <span
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
          available ? 'bg-emerald-300/10 text-emerald-200' : 'bg-amber-300/10 text-amber-200'
        }`}
      >
        {state.kind === 'loading' ? (
          <Loader2 className="h-7 w-7 motion-safe:animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-7 w-7" aria-hidden="true" />
        )}
      </span>
      <p className={`mt-4 text-sm font-medium ${available ? 'text-emerald-200' : 'text-amber-200'}`}>
        {available ? 'Sẵn sàng tải' : 'Coming Soon'}
      </p>
      <p className="mt-1 text-sm text-muted">
        Windows x64 · v{manifest && installer ? formatReleaseVersion(manifest.version, installer.kind) : fallbackVersion}
      </p>

      {installer && manifest ? (
        <>
          <a href={installer.url} className="btn-primary mt-5 w-full" rel="noopener">
            <Download className="h-4 w-4" aria-hidden="true" />
            Tải AI Desk cho Windows
          </a>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-left text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">Dung lượng</dt>
              <dd className="text-ink">{formatReleaseFileSize(installer)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">Định dạng</dt>
              <dd className="text-ink">{installer.kind === 'archive' ? 'RAR' : 'EXE'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">Phát hành</dt>
              <dd className="text-ink">{formatDate(manifest.releasedAt)}</dd>
            </div>
            <div>
              <dt className="text-subtle">SHA-256</dt>
              <dd className="mt-1 break-all font-mono text-[11px] leading-relaxed text-ink">{installer.sha256}</dd>
              <ChecksumCopy value={installer.sha256} />
            </div>
          </dl>
        </>
      ) : (
        <>
          <button type="button" className="btn-primary mt-5 w-full" disabled>
            Chưa mở tải
          </button>
          <p className="mt-3 text-xs leading-relaxed text-subtle">
            {state.kind === 'loading'
              ? 'Đang kiểm tra bản phát hành đã ký và được phê duyệt…'
              : 'Chưa có bản phát hành hợp lệ. Không dùng tệp hoặc liên kết thay thế.'}
          </p>
        </>
      )}
    </div>
  )
}

export const DownloadPage: React.FC = () => {
  const release = publicAlphaRelease
  const download = useDownloadState()

  return (
    <div className="premium-page">
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
                {download.kind === 'direct'
                  ? `AI Desk ${directDisplayLabel(download.release)}`
                  : `AI Desk Public Alpha v${release.version}`}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
                Một bản Beta nội bộ có kiểm soát dành cho luồng Manual và Assisted. Gồm bộ cài Windows (.exe) và GPT Bridge
                Extension (.zip) tải riêng; bộ cài chưa ký số — hãy đối chiếu SHA-256 và đọc cảnh báo bảo mật trước khi dùng.
              </p>
            </div>

            <PublicAlphaDownloadCard state={download} fallbackVersion={release.version} />
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
              GPT Bridge kết nối AI Desk với đúng cuộc trò chuyện GPT Manager đã liên kết. Trong Beta, người dùng tải
              riêng tệp extension (.zip), giải nén và nạp thư mục AI-Desk-Extension bằng{' '}
              <strong className="text-ink">Load unpacked</strong> (Developer mode). Native host và extension chỉ được dùng
              sau khi kiểm tra danh tính và toàn vẹn thành công.
            </p>
          </Card>
        </div>

        <section className="mt-6 card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-white">Cài đặt bản {download.kind === 'direct' ? directDisplayLabel(download.release) : `v${release.version}`}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Tải bộ cài .exe, đối chiếu SHA-256 rồi chạy bộ cài cho tài khoản Windows hiện tại. Sau đó tải tệp GPT Bridge
            Extension (.zip), đối chiếu SHA-256, giải nén và nạp thư mục AI-Desk-Extension bằng Load unpacked (bật
            Developer mode). Bộ cài chưa được ký số hay chứng nhận bảo mật độc lập, nên Windows SmartScreen hoặc phần mềm
            diệt virus (ví dụ Kaspersky) có thể cảnh báo “nhà phát hành không xác định”. Nếu SHA-256 không khớp hoặc phần
            mềm bảo mật phát hiện mối đe dọa, hãy dừng lại; không tắt bảo vệ hay thêm ngoại lệ để ép chạy tệp.
          </p>
          {download.kind === 'direct' && download.release.innerInstaller && (
            <p className="mt-3 text-xs leading-relaxed text-muted" data-inner-installer>
              Sau khi giải nén, có thể kiểm tra thêm <span className="text-ink">{download.release.innerInstaller.fileName}</span>{' '}
              (SHA-256 của riêng bộ cài, khác SHA-256 của gói RAR):{' '}
              <code className="break-all font-mono text-[11px] text-ink">{download.release.innerInstaller.sha256}</code>
            </p>
          )}
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
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              <a href="/changelog" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-light hover:underline">
                Xem changelog <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              {download.kind === 'direct' && download.release.notesUrl && (
                <a href={download.release.notesUrl} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-light hover:underline" rel="noopener" data-release-notes>
                  Ghi chú phát hành {download.release.versionLabel} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
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
