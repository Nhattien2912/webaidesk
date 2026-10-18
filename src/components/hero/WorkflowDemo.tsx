import React from 'react'
import { Pause, Play, RotateCcw, SkipForward, Square, X } from 'lucide-react'
import { DEMO_STEPS, type DemoAction, type DemoState } from '../../data/heroDemo'

export const WorkflowDemo: React.FC<{ state: DemoState; dispatch: React.Dispatch<DemoAction>; onClose: () => void }> = ({ state, dispatch, onClose }) => {
  const current = DEMO_STEPS[state.step]
  return (
    <section className="hero-demo" aria-label="Demo luồng điều phối">
      <button type="button" className="hero-demo-close" onClick={onClose} aria-label="Đóng demo điều phối"><X aria-hidden="true" /></button>
      <div className="hero-demo-copy">
        <span>Demo mô phỏng — không kết nối AI thật</span>
        <strong>{current.title}</strong>
        <p>{current.description}</p>
      </div>
      <div className="hero-demo-progress" aria-label={`Bước ${state.step + 1} trên ${DEMO_STEPS.length}`}>
        <span>{state.step + 1}/{DEMO_STEPS.length}</span>
        <div>{DEMO_STEPS.map((step, index) => <i key={step.label} data-complete={index <= state.step || undefined} />)}</div>
      </div>
      <div className="hero-demo-controls">
        {state.status === 'running' ? (
          <button type="button" onClick={() => dispatch({ type: 'pause' })}><Pause aria-hidden="true" />Tạm dừng</button>
        ) : (
          <button type="button" onClick={() => dispatch({ type: state.status === 'complete' ? 'replay' : 'play' })}><Play aria-hidden="true" />{state.status === 'idle' ? 'Thử luồng điều phối' : state.status === 'complete' ? 'Phát lại' : 'Tiếp tục'}</button>
        )}
        <button type="button" onClick={() => dispatch({ type: 'next' })} disabled={state.status === 'complete'}><SkipForward aria-hidden="true" /><span className="sr-only">Bước tiếp theo</span></button>
        <button type="button" onClick={() => dispatch({ type: 'replay' })}><RotateCcw aria-hidden="true" /><span className="sr-only">Phát lại từ đầu</span></button>
        <button type="button" onClick={() => dispatch({ type: 'reset' })}><Square aria-hidden="true" /><span className="sr-only">Đặt lại demo</span></button>
      </div>
    </section>
  )
}
