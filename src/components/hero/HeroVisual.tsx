import React, { useEffect, useMemo, useReducer, useState } from 'react'
import { Play } from 'lucide-react'
import mark from '../../assets/brand/aidesk-mark.png'
import cleanWorkspace from '../../assets/hero/aidesk-hero-workspace-clean.webp'
import { DEMO_STEPS, INITIAL_DEMO_STATE, heroDemoReducer } from '../../data/heroDemo'
import { HERO_VIEWBOX, HERO_WORKERS, getHeroWorker, type HeroWorkerId } from '../../data/heroWorkers'
import { ConnectionLayer } from './ConnectionLayer'
import { WorkerCard } from './WorkerCard'
import { WorkerDetailPanel } from './WorkerDetailPanel'
import { WorkflowDemo } from './WorkflowDemo'
import './hero.css'

export const HeroVisual: React.FC = () => {
  const [hovered, setHovered] = useState<HeroWorkerId | null>(null)
  const [selected, setSelected] = useState<HeroWorkerId | null>(null)
  const [demoOpen, setDemoOpen] = useState(false)
  const [demo, dispatch] = useReducer(heroDemoReducer, INITIAL_DEMO_STATE)
  const demoStep = DEMO_STEPS[demo.step]
  const demoWorker = demo.status === 'idle' || demoStep.activeNode === 'hub' ? null : demoStep.activeNode
  const activeId = hovered ?? selected ?? demoWorker
  const selectedWorker = useMemo(() => getHeroWorker(selected), [selected])
  const activeConnector = demoStep.activeNode === 'hub' && demo.status !== 'idle' ? 'codex' : activeId

  useEffect(() => {
    if (demo.status !== 'running') return
    const timer = window.setTimeout(() => dispatch({ type: 'next' }), 1750)
    return () => window.clearTimeout(timer)
  }, [demo])

  const closeDetail = () => {
    setHovered(null)
    setSelected(null)
  }

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDetail()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [])

  return (
    <div
      className="hero-visual"
      style={{ '--hub-x': `${HERO_VIEWBOX.hubX / 10}%`, '--hub-y': `${HERO_VIEWBOX.hubY / 6.8}%` } as React.CSSProperties}
      onPointerLeave={() => setHovered(null)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') closeDetail()
      }}
    >
      <div className="hero-scene">
        <img className="hero-artwork" src={cleanWorkspace} alt="" width={1536} height={1024} fetchPriority="high" />
        <ConnectionLayer activeConnector={activeConnector} demoRunning={demo.status === 'running'} />
        <div className="hero-hub" data-active={demoStep.activeNode === 'hub' && demo.status !== 'idle' || undefined}>
          <span aria-hidden="true" />
          <img src={mark} alt="AI Desk Hub" width={64} height={64} />
        </div>
        <div className="hero-nodes" data-has-active={Boolean(activeId) || undefined}>
          {HERO_WORKERS.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              active={activeId === worker.id}
              selected={selected === worker.id}
              dimmed={Boolean(activeId && activeId !== worker.id)}
              onHover={setHovered}
              onSelect={(id) => {
                setHovered(id)
                setSelected((current) => current === id ? null : id)
              }}
            />
          ))}
        </div>
      </div>
      <WorkerDetailPanel worker={selectedWorker} selected={Boolean(selected)} onClose={closeDetail} />
      {demoOpen ? (
        <WorkflowDemo state={demo} dispatch={dispatch} onClose={() => {
          dispatch({ type: 'reset' })
          setDemoOpen(false)
        }} />
      ) : (
        <div className="hero-demo-launch">
          <span>Demo mô phỏng — không kết nối AI thật</span>
          <button type="button" onClick={() => setDemoOpen(true)}><Play aria-hidden="true" />Thử demo điều phối</button>
        </div>
      )}
    </div>
  )
}
