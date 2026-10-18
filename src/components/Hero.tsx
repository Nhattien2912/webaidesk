import React, { useState } from 'react'
import { ArrowRight, Download, PlayCircle } from 'lucide-react'
import { AppPreview } from './AppPreview'
import { VideoDialog } from './VideoDialog'
import { SECTION_IDS } from '../config/navigation'
import { siteConfig } from '../config/site'
import { toYouTubeEmbedUrl } from '../lib/video'
import type { DownloadView } from '../lib/directDownload'

export const Hero: React.FC<{ download: DownloadView }> = ({ download }) => {
  const [videoOpen, setVideoOpen] = useState(false)
  const embedUrl = toYouTubeEmbedUrl(siteConfig.introVideoUrl)
  const available = download.kind === 'available'

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-white/[0.06] bg-navy-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(60%_60%_at_70%_0%,rgba(47,123,245,0.14),transparent)]"
      />
      <div className="container-content relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:py-24">
        <div>
          <p className="badge bg-white/[0.06] text-slate-300 ring-1 ring-white/10">
            Ứng dụng Windows · 0.2 Beta hiện có dưới dạng RAR chưa ký số
          </p>
          <h1 id="hero-title" className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[2.6rem] xl:text-[2.9rem]">
            Một bàn làm việc.
            <br />
            <span className="text-accent-light">Nhiều AI cùng phối hợp.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            GPT Manager lập kế hoạch và giao việc. AI Desk chuyển yêu cầu tới Codex hoặc Claude Code ngay trên máy của
            bạn, kiểm tra đúng phiên, rồi đưa kết quả trở lại để nghiệm thu.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={`#${SECTION_IDS.download}`} className="btn-primary px-6">
              <Download className="h-4 w-4" aria-hidden="true" />
              Tải AI Desk cho Windows
            </a>
            {embedUrl ? (
              <button type="button" className="btn-secondary-dark px-6" onClick={() => setVideoOpen(true)}>
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                Xem video giới thiệu
              </button>
            ) : (
              <a href={`#${SECTION_IDS.howItWorks}`} className="btn-secondary-dark px-6">
                Xem cách hoạt động
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>

          <p className="mt-5 text-sm text-subtle">
            Không cần tài khoản AI Desk ·{' '}
            {available ? 'Miễn phí trong giai đoạn Public Beta' : 'Bản tải công khai đang được chuẩn bị'}
          </p>
        </div>

        <AppPreview screen="desk" />
      </div>

      {embedUrl && <VideoDialog open={videoOpen} embedUrl={embedUrl} onClose={() => setVideoOpen(false)} />}
    </section>
  )
}
