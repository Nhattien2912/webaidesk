import React from 'react'
import { ArrowRight, Check, MonitorDown, Network, Orbit, Workflow, type LucideIcon } from 'lucide-react'
import { SECTION_IDS } from '../config/navigation'
import { homepageRoadmap } from '../data/homepageRoadmap'
import type { RoadmapPhaseStage } from '../data/roadmapV2'
import './homepage-roadmap.css'

const ICONS: Record<RoadmapPhaseStage, LucideIcon> = {
  internal: Network,
  refining: Workflow,
  beta: MonitorDown,
  direction: Orbit,
}

export const Roadmap: React.FC = () => (
  <section id={SECTION_IDS.roadmap} aria-labelledby="roadmap-title" className="home-roadmap-v3">
    <div className="container-content">
      <div className="home-roadmap-heading">
        <p className="home-roadmap-eyebrow">LỘ TRÌNH PHÁT TRIỂN</p>
        <h2 id="roadmap-title">AI Desk đã đi đến đâu?</h2>
        <p>Từ nền tảng điều phối AI trên Windows đến hệ sinh thái đa AI, đa môi trường. Khám phá những gì đã được xây dựng, đang hoàn thiện và những định hướng tiếp theo.</p>
      </div>

      <ol className="home-roadmap-track" aria-label="Bốn giai đoạn phát triển AI Desk">
        {homepageRoadmap.map((phase) => {
          const Icon = ICONS[phase.stage]
          return (
            <li key={phase.id} className={`home-roadmap-phase home-roadmap-${phase.stage}`} data-phase={phase.id} data-stage={phase.stage}>
              <div className="home-roadmap-milestone"><span>{phase.number}</span><span className="home-roadmap-milestone-label">GIAI ĐOẠN {phase.number}</span></div>
              <article className="home-roadmap-card" aria-labelledby={`home-phase-${phase.id}`}>
                <div className="home-roadmap-card-title"><span className="home-roadmap-icon"><Icon aria-hidden="true" /></span><h3 id={`home-phase-${phase.id}`}>{phase.title}</h3></div>
                <p className="home-roadmap-status">{phase.status}</p>
                <p className="home-roadmap-description">{phase.description}</p>
                <ul className="home-roadmap-highlights">
                  {phase.highlights.map((item) => <li key={item}><Check aria-hidden="true" /><span>{item}</span></li>)}
                </ul>
                {phase.note && <p className="home-roadmap-note">{phase.note}</p>}
              </article>
            </li>
          )
        })}
      </ol>

      <div className="home-roadmap-cta">
        <p>Xem chi tiết từng giai đoạn và kế hoạch mở rộng AI Desk sang Web, Desktop, CLI, IDE, API và Local AI.</p>
        <a href="/roadmap">Khám phá toàn bộ lộ trình<ArrowRight aria-hidden="true" /></a>
      </div>
    </div>
  </section>
)
