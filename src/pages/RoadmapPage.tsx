import React, { useState } from 'react'
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  Filter,
} from 'lucide-react'
import { roadmap, type RoadmapStage } from '../data/roadmap'

const STAGE_CONFIG: Record<
  RoadmapStage,
  {
    icon: typeof CheckCircle2
    label: string
    badgeClass: string
    borderClass: string
    iconClass: string
    filterClass: string
    activeFilterClass: string
  }
> = {
  released: {
    icon: CheckCircle2,
    label: 'Đã triển khai',
    badgeClass: 'bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/30',
    borderClass: 'border-t-emerald-400/60',
    iconClass: 'text-emerald-300',
    filterClass: 'hover:border-emerald-400/40 hover:text-emerald-300',
    activeFilterClass: 'border-emerald-400/40 bg-emerald-400/[0.06] text-emerald-300',
  },
  'in-progress': {
    icon: Clock,
    label: 'Đang phát triển',
    badgeClass: 'bg-accent/10 text-accent-light ring-1 ring-accent/30',
    borderClass: 'border-t-accent/70',
    iconClass: 'text-accent-light',
    filterClass: 'hover:border-accent/40 hover:text-accent-light',
    activeFilterClass: 'border-accent/40 bg-accent/[0.06] text-accent-light',
  },
  planned: {
    icon: CircleDashed,
    label: 'Sắp tới',
    badgeClass: 'bg-white/[0.04] text-subtle ring-1 ring-white/10',
    borderClass: 'border-t-white/20',
    iconClass: 'text-subtle',
    filterClass: 'hover:border-white/20 hover:text-muted',
    activeFilterClass: 'border-white/20 bg-white/[0.04] text-muted',
  },
}

const RoadmapCard: React.FC<{ column: (typeof roadmap)[0] }> = ({ column }) => {
  const config = STAGE_CONFIG[column.stage]
  const Icon = config.icon

  return (
    <div className={`card border-t-2 p-6 ${config.borderClass}`} data-stage={column.stage}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Icon className={`h-5 w-5 ${config.iconClass}`} aria-hidden="true" />
          {column.title}
        </h3>
        <span className={`badge shrink-0 ${config.badgeClass}`}>{config.label}</span>
      </div>
      <p className="mt-2 text-sm text-subtle">{column.note}</p>
      <ul className="mt-5 space-y-4">
        {column.items.map((item) => (
          <li key={item.title} className="border-t border-line pt-4">
            <div className="flex items-start gap-2">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconClass}`} aria-hidden="true" />
              <div>
                <div className="font-medium text-ink">{item.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.detail}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
// Timeline view (vertical)
const TimelineView: React.FC<{ stages: RoadmapStage[] }> = ({ stages }) => {
  const filteredRoadmap = stages.length === 3
    ? roadmap
    : roadmap.filter((col) => stages.includes(col.stage))

  return (
    <div className="relative">
      {/* Vertical line */}
      <div
        className="absolute left-[22px] top-4 bottom-4 w-px bg-gradient-to-b from-emerald-400/30 via-accent/30 to-white/10 lg:hidden"
        aria-hidden="true"
      />
      <div className="space-y-6 pl-12 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0 lg:pl-0">
        {filteredRoadmap.map((column) => {
          const config = STAGE_CONFIG[column.stage]
          const Icon = config.icon
          return (
            <div key={column.stage} className="relative">
              {/* Timeline dot (mobile only) */}
              <div
                className={`absolute -left-12 top-4 flex h-6 w-6 items-center justify-center rounded-full border ${config.badgeClass} lg:hidden`}
                aria-hidden="true"
              >
                <Icon className="h-3 w-3" />
              </div>
              <RoadmapCard column={column} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
// Stats summary
const StatsSummary: React.FC = () => {
  const released = roadmap.find((c) => c.stage === 'released')?.items.length ?? 0
  const inProgress = roadmap.find((c) => c.stage === 'in-progress')?.items.length ?? 0
  const planned = roadmap.find((c) => c.stage === 'planned')?.items.length ?? 0

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Đã triển khai', count: released, config: STAGE_CONFIG.released },
        { label: 'Đang phát triển', count: inProgress, config: STAGE_CONFIG['in-progress'] },
        { label: 'Sắp tới', count: planned, config: STAGE_CONFIG.planned },
      ].map(({ label, count, config }) => {
        const Icon = config.icon
        return (
          <div key={label} className="card p-4 text-center">
            <Icon className={`mx-auto h-6 w-6 ${config.iconClass}`} aria-hidden="true" />
            <div className="mt-2 text-2xl font-bold text-white">{count}</div>
            <div className="mt-1 text-xs text-subtle">{label}</div>
          </div>
        )
      })}
    </div>
  )
}
type StageFilter = RoadmapStage | 'all'

export const RoadmapPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<StageFilter>('all')

  const visibleStages: RoadmapStage[] =
    activeFilter === 'all'
      ? ['released', 'in-progress', 'planned']
      : [activeFilter]

  const filters: { id: StageFilter; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'released', label: 'Đã triển khai' },
    { id: 'in-progress', label: 'Đang phát triển' },
    { id: 'planned', label: 'Sắp tới' },
  ]

  return (
    <div className="bg-navy">
      {/* Hero */}
      <div className="border-b border-white/[0.06] bg-navy-950">
        <div className="container-content py-16 sm:py-20">
          <a href="/" className="text-sm font-medium text-accent-light hover:underline">
            ← Về trang chủ
          </a>
          <p className="eyebrow mt-6">Minh bạch và công khai</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Lộ trình phát triển AI Desk
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Những gì AI Desk đã xác minh trong build nội bộ, đang làm và dự kiến phát triển.
            Trạng thái nội bộ không đồng nghĩa với một release công khai đã qua đầy đủ release gate.
          </p>
          <div className="mt-4 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-subtle inline-block">
            Cập nhật lần cuối: 14/10/2026 · Private Alpha RC1
          </div>
        </div>
      </div>

      <div className="container-content py-12 space-y-10">
        {/* Stats */}
        <StatsSummary />

        {/* Integrity note */}
        <div className="flex gap-3 rounded-card border border-accent/20 bg-accent/[0.04] p-4 text-sm text-muted">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
          <p>
            <strong className="text-accent-light">Cam kết minh bạch:</strong> Cột{' '}
            <span className="text-emerald-300">Đã triển khai</span> chỉ nói về build nội bộ được ghi
            rõ trong dữ liệu roadmap; không khẳng định installer đã được ký hoặc phát hành qua pipeline.
            Không tự đặt phần trăm hay ngày ra mắt chưa chắc chắn.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
          {filters.map((f) => {
            const isActive = activeFilter === f.id
            const stageConfig = f.id !== 'all' ? STAGE_CONFIG[f.id as RoadmapStage] : null
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                aria-pressed={isActive}
                className={`badge whitespace-nowrap px-3 py-1.5 text-[13px] font-medium transition-colors border ${
                  isActive
                    ? stageConfig?.activeFilterClass ?? 'border-accent/40 bg-accent/[0.06] text-accent-light'
                    : `border-white/[0.08] text-subtle ${stageConfig?.filterClass ?? 'hover:border-white/20 hover:text-muted'}`
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Roadmap cards */}
        <section aria-label="Lộ trình phát triển">
          <TimelineView stages={visibleStages} />
        </section>

        {/* Bottom CTA */}
        <div className="border-t border-line pt-8 text-center">
          <p className="text-muted">Muốn đóng góp ý kiến cho lộ trình phát triển?</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a href="/#community" className="btn-primary">
              Theo dõi AI Desk
            </a>
            <a href="/install" className="btn-secondary-dark">
              Bắt đầu sử dụng
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
