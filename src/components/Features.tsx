import React, { useEffect, useState } from 'react'
import { Activity, Archive, ArrowRight, CheckCircle2, CircleStop, Link2, LockKeyhole, Play, RotateCcw, ShieldAlert, Workflow } from 'lucide-react'
import { SECTION_IDS } from '../config/navigation'
import './features.css'

const WORKFLOW_STEPS = [
  { id: 'manager', label: 'GPT Manager', detail: 'Phân tích yêu cầu và tạo action theo schema.' },
  { id: 'desk', label: 'AI Desk', detail: 'Kiểm tra action, phiên đã gắn và điều kiện gửi.' },
  { id: 'worker', label: 'Worker', detail: 'Codex hoặc Claude Code thực hiện trong phiên đã chọn.' },
  { id: 'result', label: 'Result', detail: 'Kết quả mẫu được đóng gói để Manager xem xét.' },
] as const

const MONITOR_EVENTS = [
  { time: '00:00', title: 'Nhận yêu cầu', detail: 'Mẫu sự kiện: action đã qua bước kiểm tra cấu trúc.' },
  { time: '00:02', title: 'Xác minh phiên', detail: 'Mẫu sự kiện: worker khớp với phiên người dùng đã gắn.' },
  { time: '00:04', title: 'Chuyển tới worker', detail: 'Mẫu sự kiện: yêu cầu được đưa vào hàng chờ điều phối.' },
  { time: '00:18', title: 'Thu kết quả', detail: 'Mẫu sự kiện: kết quả đã quay lại luồng theo dõi.' },
] as const

const RESULT_PAGES = [
  ['Tóm tắt thay đổi', 'Danh sách tệp tác động', 'Trạng thái kiểm tra'],
  ['Chi tiết tác vụ', 'Ghi chú từ worker', 'Điểm cần người dùng duyệt'],
  ['Kết quả cuối', 'Tham chiếu phiên', 'Bước tiếp theo đề xuất'],
] as const

const FeatureHeading: React.FC<{ icon: typeof Workflow; title: string; body: string; badge?: string }> = ({ icon: Icon, title, body, badge }) => (
  <div>
    <div className="flex items-center gap-3">
      <span className="feature-icon"><Icon aria-hidden="true" /></span>
      <div className="flex flex-wrap items-center gap-2"><h3>{title}</h3>{badge && <span className="feature-badge">{badge}</span>}</div>
    </div>
    <p>{body}</p>
  </div>
)

const WorkflowShowcase: React.FC = () => {
  const [active, setActive] = useState(0)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    const timer = window.setTimeout(() => active >= WORKFLOW_STEPS.length - 1 ? setRunning(false) : setActive((current) => current + 1), 850)
    return () => window.clearTimeout(timer)
  }, [active, running])
  const start = () => { setActive(0); setRunning(true) }
  const reset = () => { setRunning(false); setActive(0) }
  return (
    <article className="feature-bento feature-bento-flow">
      <FeatureHeading icon={Workflow} title="Điều phối tác vụ" body="Theo dõi một yêu cầu mẫu đi từ Manager tới đúng worker và quay về dưới dạng kết quả có cấu trúc." />
      <div className="workflow-stage" aria-label="Mô phỏng luồng điều phối">
        <div className="workflow-track" aria-hidden="true" />
        {WORKFLOW_STEPS.map((step, index) => <React.Fragment key={step.id}>
          <button type="button" className="workflow-node" data-active={index === active || undefined} data-complete={index < active || undefined} aria-pressed={index === active}
            onPointerEnter={() => !running && setActive(index)} onFocus={() => !running && setActive(index)} onClick={() => { setActive(index); setRunning(false) }}>
            <span>{index + 1}</span><strong>{step.label}</strong>
          </button>
          {index < WORKFLOW_STEPS.length - 1 && <ArrowRight className="workflow-arrow" data-active={index < active || undefined} aria-hidden="true" />}
        </React.Fragment>)}
      </div>
      <div className="workflow-caption" aria-live="polite"><span>Mô phỏng · Bước {active + 1}/{WORKFLOW_STEPS.length}</span><strong>{WORKFLOW_STEPS[active].detail}</strong></div>
      <div className="feature-actions">
        <button type="button" className="feature-action-primary" onClick={start}>{active === WORKFLOW_STEPS.length - 1 && !running ? <RotateCcw aria-hidden="true" /> : <Play aria-hidden="true" />}{active === WORKFLOW_STEPS.length - 1 && !running ? 'Replay demo' : running ? 'Đang chạy…' : 'Chạy demo luồng'}</button>
        <button type="button" className="feature-action-secondary" onClick={reset}><CircleStop aria-hidden="true" />Reset</button>
      </div>
    </article>
  )
}

const MonitorShowcase: React.FC = () => {
  const [selected, setSelected] = useState(0)
  return <article className="feature-bento feature-bento-monitor">
    <FeatureHeading icon={Activity} title="Monitor" body="Timeline minh họa giúp bạn biết yêu cầu đang ở bước nào." />
    <div className="monitor-shell">
      <div className="monitor-list" role="list" aria-label="Sự kiện mô phỏng">{MONITOR_EVENTS.map((event, index) => <button key={event.title} type="button" role="listitem" data-active={selected === index || undefined} onClick={() => setSelected(index)}><span>{event.time}</span><i aria-hidden="true" /><strong>{event.title}</strong></button>)}</div>
      <div className="monitor-detail" aria-live="polite"><span>Sự kiện mẫu — không phải log thật</span><strong>{MONITOR_EVENTS[selected].title}</strong><p>{MONITOR_EVENTS[selected].detail}</p></div>
    </div>
  </article>
}

const BindingShowcase: React.FC = () => {
  const [valid, setValid] = useState(true)
  return <article className="feature-bento feature-bento-binding">
    <FeatureHeading icon={Link2} title="Session Binding" body="Mô phỏng kiểm tra đúng phiên trước khi chuyển yêu cầu." />
    <div className="binding-toggle" role="group" aria-label="Trạng thái phiên mô phỏng"><button type="button" aria-pressed={valid} onClick={() => setValid(true)}>Đúng phiên</button><button type="button" aria-pressed={!valid} onClick={() => setValid(false)}>Sai phiên</button></div>
    <div className="binding-visual" data-valid={valid}><span className="binding-app">AI Desk</span><ArrowRight aria-hidden="true" /><span className="binding-session">Codex · feature-auth</span><span className="binding-state">{valid ? <CheckCircle2 aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}{valid ? 'Khớp phiên — sẵn sàng gửi' : 'Sai phiên — đã chặn gửi'}</span></div>
    <p className="feature-disclaimer"><LockKeyhole aria-hidden="true" />Chỉ là mô phỏng trạng thái, không điều khiển ứng dụng thật.</p>
  </article>
}

const ResultStoreShowcase: React.FC = () => {
  const [page, setPage] = useState(0)
  return <article className="feature-bento feature-bento-results">
    <FeatureHeading icon={Archive} title="Result Store" badge="Đang phát triển" body="Minh họa cách một kết quả dài có thể được chia trang để đọc theo từng phần." />
    <div className="result-browser"><div className="result-tabs" role="tablist" aria-label="Trang kết quả mẫu">{RESULT_PAGES.map((_, index) => <button key={index} type="button" role="tab" aria-selected={page === index} onClick={() => setPage(index)}>Trang {index + 1}</button>)}</div>
      <div className="result-page" role="tabpanel" aria-live="polite"><span>Kết quả mẫu {page + 1}/3</span>{RESULT_PAGES[page].map((line, index) => <p key={line}><i style={{ width: `${88 - index * 13}%` }} />{line}</p>)}</div></div>
  </article>
}

export const Features: React.FC = () => <section id={SECTION_IDS.features} aria-labelledby="features-title" className="section feature-showcase">
  <div className="container-content"><div className="max-w-3xl"><p className="premium-kicker">Tính năng</p><h2 id="features-title" className="premium-title mt-3">Một quy trình rõ ràng, nhìn thấy được</h2><p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">Khám phá cách AI Desk điều phối, theo dõi phiên và chuẩn bị kết quả — qua các mô phỏng ngắn, không kết nối AI thật.</p></div>
    <div className="feature-bento-grid"><WorkflowShowcase /><MonitorShowcase /><BindingShowcase /><ResultStoreShowcase /></div>
  </div>
</section>
