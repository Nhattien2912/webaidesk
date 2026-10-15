import React from 'react'
import { CheckCircle2, CircleDashed, Clock } from 'lucide-react'
import { SECTION_IDS } from '../config/navigation'
import { roadmap, type RoadmapStage } from '../data/roadmap'

const STAGE_STYLE: Record<RoadmapStage, { icon: typeof CheckCircle2; className: string; ring: string }> = {
  released: { icon: CheckCircle2, className: 'text-emerald-300', ring: 'border-t-emerald-400/60' },
  'in-progress': { icon: Clock, className: 'text-accent-light', ring: 'border-t-accent/70' },
  planned: { icon: CircleDashed, className: 'text-subtle', ring: 'border-t-white/20' },
}

export const Roadmap: React.FC = () => (
  <section id={SECTION_IDS.roadmap} aria-labelledby="roadmap-title" className="section bg-navy">
    <div className="container-content">
      <div className="max-w-3xl">
        <p className="eyebrow">Roadmap</p>
        <h2 id="roadmap-title" className="section-title mt-3">
          Đã làm được gì, và tiếp theo là gì
        </h2>
        <p className="section-lead">Chỉ những gì đã có trong bản build thật mới nằm ở cột đầu tiên.</p>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {roadmap.map((column) => {
          const { icon: Icon, className, ring } = STAGE_STYLE[column.stage]
          return (
            <div key={column.stage} className={`card border-t-2 p-6 ${ring}`} data-stage={column.stage}>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Icon className={`h-5 w-5 ${className}`} aria-hidden="true" />
                {column.title}
              </h3>
              <p className="mt-2 text-sm text-subtle">{column.note}</p>
              <ul className="mt-5 space-y-4">
                {column.items.map((item) => (
                  <li key={item.title} className="border-t border-line pt-4">
                    <div className="font-medium text-ink">{item.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  </section>
)
