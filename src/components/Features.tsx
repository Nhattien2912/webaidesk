import React from 'react'
import { Activity, Archive, ArrowRight, Link2, Workflow } from 'lucide-react'
import { SECTION_IDS } from '../config/navigation'

const Tile: React.FC<{
  icon: typeof Workflow
  title: string
  body: string
  badge?: string
  className?: string
  children?: React.ReactNode
}> = ({ icon: Icon, title, body, badge, className = '', children }) => (
  <article className={`card flex flex-col overflow-hidden p-6 sm:p-7 ${className}`}>
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-slate-200 bg-blue-50 text-blue-700">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      {badge && <span className="badge bg-amber-50 text-amber-800 ring-1 ring-amber-200">{badge}</span>}
    </div>
    <h3 className="mt-5 text-xl font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 max-w-lg leading-relaxed text-slate-700">{body}</p>
    {children && (
      <div className="mt-6 flex-1" aria-hidden="true">
        {children}
      </div>
    )}
  </article>
)

const FlowVisual: React.FC = () => (
  <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 p-4 text-xs">
    {['GPT Manager', 'AI Desk', 'Codex', 'Kết quả'].map((step, i, all) => (
      <React.Fragment key={step}>
        <span
          className={`rounded-md px-2.5 py-1.5 font-medium ${
            step === 'AI Desk' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300' : 'bg-white text-slate-700 ring-1 ring-slate-300'
          }`}
        >
          {step}
        </span>
        {i < all.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-500" />}
      </React.Fragment>
    ))}
  </div>
)

const PagesVisual: React.FC = () => (
  <div className="grid grid-cols-3 gap-2 rounded-[10px] border border-slate-200 bg-slate-50 p-4">
    {['Trang 1', 'Trang 2', 'Trang 3'].map((page, i) => (
      <div key={page} className={`rounded-md border bg-white p-2 ${i === 0 ? 'border-blue-400' : 'border-slate-300'}`}>
        <div className="mb-2 text-[10px] font-medium text-slate-600">{page}</div>
        <div className="space-y-1">
          <div className="h-1.5 w-11/12 rounded bg-slate-300" />
          <div className="h-1.5 w-8/12 rounded bg-slate-300" />
          <div className="h-1.5 w-10/12 rounded bg-slate-300" />
        </div>
      </div>
    ))}
  </div>
)

const TimelineVisual: React.FC = () => (
  <ol className="space-y-1.5 rounded-[10px] border border-slate-200 bg-slate-50 p-4 text-xs">
    {['Nhận yêu cầu', 'Chuyển cho Codex', 'Đã thu kết quả'].map((event, i) => (
      <li key={event} className="flex items-center gap-2.5 text-slate-700">
        <span className={`h-2 w-2 rounded-full ${i === 2 ? 'bg-emerald-600' : 'bg-blue-600'}`} />
        {event}
      </li>
    ))}
  </ol>
)

const BindingVisual: React.FC = () => (
  <div className="grid gap-2 rounded-[10px] border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-2">
    {[
      ['Codex', 'Phiên đã gắn: feature-auth', 'Đúng phiên', 'text-emerald-700'],
      ['Claude', 'Phiên đang mở khác phiên đã gắn', 'Dừng, không gửi', 'text-amber-800'],
    ].map(([worker, detail, state, tone]) => (
      <div key={worker} className="rounded-md border border-slate-300 bg-white p-2.5">
        <div className="font-semibold text-slate-900">{worker}</div>
        <div className="mt-0.5 text-slate-600">{detail}</div>
        <div className={`mt-1.5 font-medium ${tone}`}>{state}</div>
      </div>
    ))}
  </div>
)

export const Features: React.FC = () => (
  <section id={SECTION_IDS.features} aria-labelledby="features-title" className="section bg-navy">
    <div className="container-content">
      <div className="max-w-3xl">
        <p className="eyebrow">Tính năng</p>
        <h2 id="features-title" className="section-title mt-3">
          Điều phối nhiều AI mà không phải copy qua lại
        </h2>
        <p className="section-lead">
          AI Desk lo phần chuyển giao giữa các công cụ để bạn tập trung vào quyết định kỹ thuật.
        </p>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-5">
        <Tile
          icon={Workflow}
          title="Điều phối tác vụ"
          body="GPT Manager viết yêu cầu, AI Desk đưa nó vào đúng cửa sổ worker trên máy bạn, chờ worker làm xong và thu kết quả. Các bước cần duyệt vẫn chờ bạn xác nhận."
          className="lg:col-span-3"
        >
          <FlowVisual />
        </Tile>
        <Tile
          icon={Archive}
          title="Result Store"
          badge="Đang phát triển"
          body="Kết quả dài được lưu cục bộ để GPT Manager đọc theo từng trang, thay vì dán cả khối văn bản lớn vào cuộc trò chuyện."
          className="lg:col-span-2"
        >
          <PagesVisual />
        </Tile>
        <Tile
          icon={Activity}
          title="Monitor"
          body="Timeline sự kiện cho thấy yêu cầu đi tới đâu, worker nào đang chạy và lúc nào kết quả được trả về."
          className="lg:col-span-2"
        >
          <TimelineVisual />
        </Tile>
        <Tile
          icon={Link2}
          title="Session Binding"
          body="Mỗi worker gắn với một phiên bạn đã chọn. AI Desk kiểm tra phiên trước khi gửi và dừng lại khi phát hiện sai cuộc trò chuyện, để yêu cầu không bị gửi nhầm chỗ."
          className="lg:col-span-3"
        >
          <BindingVisual />
        </Tile>
      </div>
    </div>
  </section>
)
