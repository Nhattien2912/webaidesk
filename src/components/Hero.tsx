import React from 'react'
import { ArrowRight, Download, Play, Sparkles } from 'lucide-react'
import { SECTION_IDS } from '../config/navigation'
import type { DownloadView } from '../lib/directDownload'
import { HeroVisual } from './hero/HeroVisual'

export const Hero: React.FC<{ download: DownloadView }> = ({ download }) => {
  const available = download.kind === 'available' || download.kind === 'direct'

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-slate-200 bg-white">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(147,197,253,.23),transparent_35%),linear-gradient(180deg,#fff_0%,#f8fbff_100%)]" />
      <div className="hero-layout container-content relative grid min-h-[720px] items-center gap-8 pb-12 pt-14 lg:gap-5 lg:py-12">
        <div className="relative z-30 max-w-[610px]">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            <span className="h-px w-8 bg-blue-300" aria-hidden="true" />
            Trợ lý AI toàn diện
          </p>
          <h1 id="hero-title" className="mt-5 text-balance text-[2.7rem] font-semibold leading-[1.06] tracking-[-0.045em] text-brand-navy sm:text-[3.25rem] lg:text-[3rem] xl:text-[3.25rem]">
            <span className="hero-title-gradient">AI Desk</span> giúp bạn<br className="hidden sm:block" /> làm việc thông minh<br className="hidden sm:block" /> hơn mỗi ngày
          </h1>
          <p className="mt-6 max-w-[570px] text-base leading-7 text-slate-700 sm:text-[17px]">
            GPT Web Manager lập kế hoạch và giao việc; AI Desk điều phối tới Codex hoặc Claude Code trên Windows, rồi thu kết quả để GPT Manager và bạn đánh giá.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={`#${SECTION_IDS.download}`} className="btn bg-brand-navy px-6 py-3.5 !text-white shadow-[0_14px_30px_-14px_rgba(11,31,77,.65)] hover:bg-blue-900">
              <Download className="h-4 w-4" aria-hidden="true" />
              Tải bản beta
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href={`#${SECTION_IDS.howItWorks}`} className="btn border border-slate-300 bg-white/85 px-5 py-3.5 text-brand-navy shadow-sm backdrop-blur hover:border-blue-300 hover:bg-brand-ice">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white" aria-hidden="true"><Play className="ml-0.5 h-3 w-3 fill-current" /></span>
              Xem cách hoạt động
            </a>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm font-medium text-slate-600">
            <Sparkles className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Không cần tài khoản AI Desk · {available ? 'Bản 0.2 Beta cho Windows hiện có' : 'Bản tải công khai đang được chuẩn bị'}
          </p>
        </div>
        <div className="relative z-10 min-w-0 lg:-mr-8 xl:-mr-[8vw]">
          <HeroVisual />
        </div>
      </div>
    </section>
  )
}
