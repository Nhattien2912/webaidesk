import React from 'react'
import { HERO_VIEWBOX, HERO_WORKERS, type HeroWorkerId } from '../../data/heroWorkers'

export const ConnectionLayer: React.FC<{ activeConnector: HeroWorkerId | null; demoRunning: boolean }> = ({ activeConnector, demoRunning }) => (
  <svg
    className="hero-connectors"
    viewBox={`0 0 ${HERO_VIEWBOX.width} ${HERO_VIEWBOX.height}`}
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="hero-connector-gradient" x1="0" x2="1">
        <stop offset="0" stopColor="#93c5fd" stopOpacity=".5" />
        <stop offset=".55" stopColor="#2563eb" stopOpacity=".9" />
        <stop offset="1" stopColor="#60a5fa" stopOpacity=".45" />
      </linearGradient>
      <filter id="hero-connector-glow" x="-.4" y="-.4" width="1.8" height="1.8">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    {HERO_WORKERS.map((worker) => {
      const active = activeConnector === worker.id
      return (
        <g key={worker.id} data-active={active || undefined}>
          <path className="hero-connector-base" d={worker.connectorPath} />
          <path className="hero-connector-energy" d={worker.connectorPath} pathLength="100" />
          {(active || demoRunning) && <circle className="hero-signal-dot" r="5" filter="url(#hero-connector-glow)"><animateMotion dur={active ? '1.35s' : '2.8s'} repeatCount="indefinite" path={worker.connectorPath} /></circle>}
        </g>
      )
    })}
  </svg>
)
