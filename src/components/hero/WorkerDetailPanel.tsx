import React from 'react'
import { X } from 'lucide-react'
import type { HeroWorker } from '../../data/heroWorkers'

export const WorkerDetailPanel: React.FC<{ worker: HeroWorker | null; selected: boolean; onClose: () => void }> = ({ worker, selected, onClose }) => (
  <aside className="hero-detail-panel" data-visible={Boolean(worker) || undefined} aria-live="polite" aria-label="Chi tiết worker">
    {worker && (
      <>
        <div>
          <p>{worker.title} — {worker.role}</p>
          <span>{worker.summary}</span>
        </div>
        <ul>{worker.capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>
        {selected && <button type="button" onClick={onClose} aria-label="Đóng chi tiết worker"><X aria-hidden="true" /></button>}
      </>
    )}
  </aside>
)
