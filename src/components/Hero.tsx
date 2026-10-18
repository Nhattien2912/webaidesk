import React from 'react'
import { ArrowRight, Bot, CheckCircle2, Download, Globe2, MonitorCog, Sparkles } from 'lucide-react'
import mark from '../assets/brand/aidesk-mark.png'
import { SECTION_IDS } from '../config/navigation'
import type { DownloadView } from '../lib/directDownload'

const Node: React.FC<{ icon: typeof Bot; title: string; subtitle: string; className: string }> = ({ icon: Icon, title, subtitle, className }) => (
  <div className={`absolute z-10 hidden items-center gap-3 rounded-2xl border border-white/90 bg-white/90 p-3 shadow-[0_18px_45px_-20px_rgba(30,64,175,.45)] backdrop-blur sm:flex ${className}`}>
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-ice text-brand-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
    <span><strong className="block text-sm text-brand-navy">{title}</strong><small className="text-xs text-brand-muted">{subtitle}</small></span>
  </div>
)

const HubIllustration: React.FC = () => (
  <div role="img" aria-label="Minh họa luồng User đến GPT Web Manager, qua AI Desk và worker, rồi trả kết quả về Manager" className="relative mx-auto aspect-square w-full max-w-[560px]">
    <div className="absolute inset-[8%] rounded-full border border-blue-200/70 bg-[radial-gradient(circle_at_50%_45%,white_0%,#eff6ff_52%,#dbeafe_100%)] shadow-[0_40px_100px_-30px_rgba(37,99,235,.45)]" />
    <svg aria-hidden="true" viewBox="0 0 560 560" className="absolute inset-0 h-full w-full"><defs><linearGradient id="flow" x1="0" x2="1"><stop stopColor="#93C5FD"/><stop offset="1" stopColor="#2563EB"/></linearGradient></defs><path d="M94 280 C160 280 170 190 248 190 M312 190 C390 190 400 280 466 280 M466 326 C390 326 390 390 314 390 M246 390 C170 390 170 326 94 326" fill="none" stroke="url(#flow)" strokeWidth="3" strokeDasharray="7 9" /></svg>
    <div className="absolute left-1/2 top-1/2 z-20 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[30px] border border-white bg-white shadow-[0_28px_65px_-22px_rgba(37,99,235,.55)]"><img src={mark} alt="" width={58} height={58} className="h-14 w-14 object-contain" /><strong className="mt-1 text-sm text-brand-navy">AI Desk Hub</strong></div>
    <Node icon={Globe2} title="GPT Web Manager" subtitle="Lập kế hoạch · giao việc" className="left-[1%] top-[18%]" />
    <Node icon={MonitorCog} title="Desktop workers" subtitle="Codex · Claude Code" className="right-[0%] top-[18%]" />
    <Node icon={Sparkles} title="Assisted workflow" subtitle="Bạn vẫn kiểm soát" className="bottom-[12%] left-[4%]" />
    <Node icon={CheckCircle2} title="Result to Manager" subtitle="Xem lại · nghiệm thu" className="bottom-[12%] right-[1%]" />
  </div>
)

export const Hero: React.FC<{ download: DownloadView }> = ({ download }) => {
  const available = download.kind === 'available' || download.kind === 'direct'
  return <section aria-labelledby="hero-title" className="relative overflow-hidden bg-white"><div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(96,165,250,.24),transparent_32%),linear-gradient(180deg,#fff_0%,#f8fbff_100%)]" /><div className="container-content relative grid min-h-[690px] items-center gap-8 py-16 lg:grid-cols-[.92fr_1.08fr] lg:py-20"><div className="relative z-10"><p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-brand-ice px-3.5 py-1.5 text-xs font-semibold text-brand-primary"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Windows · AI workflow orchestration</p><h1 id="hero-title" className="mt-6 max-w-2xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-brand-navy sm:text-6xl lg:text-[4.2rem]">AI Desk điều phối <span className="bg-gradient-to-r from-brand-primary to-brand-sky bg-clip-text text-transparent">mọi AI của bạn</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-brand-muted">GPT Web Manager lập kế hoạch; AI Desk chuyển yêu cầu tới Codex hoặc Claude Code trên máy Windows, kiểm tra đúng phiên và đưa kết quả trở lại để bạn nghiệm thu.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href={`#${SECTION_IDS.download}`} className="btn-primary px-6 py-3.5 shadow-lg shadow-blue-600/20"><Download className="h-4 w-4" aria-hidden="true" />Tải bản beta</a><a href={`#${SECTION_IDS.howItWorks}`} className="btn border border-slate-300 bg-white px-6 py-3.5 text-brand-navy hover:border-blue-300 hover:bg-brand-ice">Xem cách hoạt động<ArrowRight className="h-4 w-4" aria-hidden="true" /></a></div><p className="mt-5 text-sm text-brand-muted">Không cần tài khoản AI Desk · {available ? 'Bản 0.2 Beta cho Windows hiện có' : 'Bản tải công khai đang được chuẩn bị'}</p></div><HubIllustration /></div></section>
}
