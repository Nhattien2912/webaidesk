import React from 'react'
import type { HeroWorker, HeroWorkerId } from '../../data/heroWorkers'

type Props = {
  worker: HeroWorker
  active: boolean
  selected: boolean
  dimmed: boolean
  onHover: (id: HeroWorkerId) => void
  onSelect: (id: HeroWorkerId) => void
}

export const WorkerCard: React.FC<Props> = ({ worker, active, selected, dimmed, onHover, onSelect }) => {
  const Icon = worker.icon
  return (
    <button
      type="button"
      className="hero-worker-card"
      style={{ '--node-x': `${worker.position.x / 10}%`, '--node-y': `${worker.position.y / 6.8}%` } as React.CSSProperties}
      data-tone={worker.tone}
      data-active={active || undefined}
      data-selected={selected || undefined}
      data-dimmed={dimmed || undefined}
      aria-pressed={selected}
      aria-label={`${worker.title} — ${worker.role}. Nhấn để xem chi tiết.`}
      onPointerEnter={() => onHover(worker.id)}
      onFocus={() => onHover(worker.id)}
      onClick={() => onSelect(worker.id)}
    >
      <span className="hero-worker-icon"><Icon aria-hidden="true" /></span>
      <span>
        <strong>{worker.title}</strong>
        <small>{worker.role}</small>
      </span>
      <span className="hero-worker-state" aria-hidden="true">{selected ? 'Đã chọn' : 'Xem'}</span>
      <span className="hero-worker-tooltip" role="tooltip">{worker.hoverLabel}</span>
    </button>
  )
}
