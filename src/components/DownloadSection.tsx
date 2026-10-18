import React, { useState } from 'react'
import { AlertTriangle, Check, Copy, Download, Loader2, Monitor } from 'lucide-react'
import { SECTION_IDS } from '../config/navigation'
import { formatBytes, type DownloadState } from '../lib/releaseManifest'

const REQUIREMENTS = ['Windows 10 hoặc 11, 64-bit', 'ChatGPT web cho GPT Manager', 'Codex hoặc Claude Code làm worker']

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN')
}

const CopyButton: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-line px-2 text-xs font-medium text-muted hover:bg-white/5"
      aria-label="Sao chép mã SHA-256"
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Đã chép' : 'Chép'}</span>
    </button>
  )
}

const Fact: React.FC<{ label: string; children: React.ReactNode; wide?: boolean }> = ({ label, children, wide }) => (
  <div className={`rounded-[10px] border border-line bg-navy-900 p-4 ${wide ? 'sm:col-span-2 lg:col-span-4' : ''}`}>
    <dt className="text-xs text-subtle">{label}</dt>
    <dd className="mt-1 min-w-0 text-sm font-medium text-ink">{children}</dd>
  </div>
)

/** Renders exactly what the validated manifest says, or a closed state with no fabricated values. */
export const DownloadCard: React.FC<{ state: DownloadState }> = ({ state }) => {
  const available = state.kind === 'available'
  const loading = state.kind === 'loading'
  const primary = available ? state.primary : null
  const manifest = available ? state.manifest : null

  return (
    <div className="card p-6 sm:p-8" data-download-state={state.kind} aria-busy={loading}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-navy-900 text-accent-light">
            <Monitor className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-xl font-semibold text-white">
              {manifest ? `AI Desk ${manifest.version}` : 'AI Desk cho Windows'}
            </h3>
            <p className="mt-0.5 text-sm text-muted">Bộ cài Windows (.exe)</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:items-end">
          {primary ? (
            <a href={primary.url} className="btn-primary px-7" rel="noopener">
              <Download className="h-4 w-4" aria-hidden="true" />
              Tải bộ cài cho Windows
            </a>
          ) : (
            <button type="button" className="btn-primary px-7" disabled>
              {loading ? (
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              {loading ? 'Đang kiểm tra bản phát hành…' : 'Đang chuẩn bị phát hành'}
            </button>
          )}
          {!available && (
            <a href={`#${SECTION_IDS.waitlist}`} className="text-sm text-accent-light hover:underline">
              Nhận thông báo khi mở tải
            </a>
          )}
        </div>
      </div>

      <dl className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Trạng thái phát hành">
          {manifest ? (
            <span className="text-emerald-300">Đã phát hành · {manifest.channel}</span>
          ) : loading ? (
            'Đang kiểm tra…'
          ) : (
            <span className="text-amber-300">Đang chuẩn bị phát hành</span>
          )}
        </Fact>
        <Fact label="Phiên bản">{manifest ? manifest.version : '—'}</Fact>
        <Fact label="Dung lượng">{primary ? formatBytes(primary.sizeBytes) : '—'}</Fact>
        <Fact label="Hệ điều hành">{manifest ? manifest.minOs : 'Windows 10/11, 64-bit'}</Fact>
        {manifest && primary && (
          <>
            <Fact label="Ngày phát hành">{formatDate(manifest.releasedAt)}</Fact>
            <Fact label="Tệp">
              <span className="break-all">{primary.fileName}</span>
            </Fact>
            <Fact label="Chữ ký số">
              {primary.signature === 'signed' ? (
                `Đã ký${primary.signer ? ` — ${primary.signer}` : ''}`
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Chưa ký số
                </span>
              )}
            </Fact>
            <Fact label="Ghi chú phát hành">
              {manifest.notesUrl ? (
                <a href={manifest.notesUrl} className="text-accent-light hover:underline" rel="noopener">
                  Xem ghi chú
                </a>
              ) : (
                '—'
              )}
            </Fact>
          </>
        )}
        <Fact label="SHA-256" wide>
          {primary ? (
            <div className="flex items-start gap-2">
              <code className="min-w-0 break-all font-mono text-xs leading-relaxed text-muted">{primary.sha256}</code>
              <CopyButton value={primary.sha256} />
            </div>
          ) : (
            <span className="text-muted">Sẽ được công bố cùng bản phát hành đã duyệt.</span>
          )}
        </Fact>
      </dl>
    </div>
  )
}

export const DownloadSection: React.FC<{ state: DownloadState }> = ({ state }) => (
  <section id={SECTION_IDS.download} aria-labelledby="download-title" className="section border-y border-white/[0.06] bg-navy-900">
    <div className="container-content">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="eyebrow">Tải về</p>
          <h2 id="download-title" className="section-title mt-3">
            Tải AI Desk cho Windows
          </h2>
          <p className="section-lead">
            Miễn phí trong giai đoạn Public Beta, không cần đăng nhập. Bộ cài được phân phối qua Cloudflare kèm mã
            SHA-256 để bạn tự kiểm tra tệp tải về.
          </p>
        </div>
        <ul className="space-y-2 text-sm">
          {REQUIREMENTS.map((item) => (
            <li key={item} className="flex gap-2 text-muted">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-10">
        <DownloadCard state={state} />
      </div>
      <p className="mt-4 text-sm text-subtle">
        Kiểm tra checksum bằng PowerShell:{' '}
        <code className="whitespace-nowrap rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-xs text-ink">
          Get-FileHash .\tên-tệp.exe
        </code>
      </p>
      <a href="/download" className="mt-5 inline-flex text-sm font-medium text-accent-light hover:underline">
        Xem phạm vi, yêu cầu và hướng dẫn Public Alpha →
      </a>
    </div>
  </section>
)
