import React, { useState } from 'react'
import {
  ArrowRight, Bell, BookOpen, Bot, Check, ChevronDown, Code2,
  Database, Globe, Info, Layers3, Link2, Monitor,
  Network, Puzzle, Settings2, ShieldCheck, Sparkles, TerminalSquare, Users,
  type LucideIcon,
} from 'lucide-react'
import mark from '../assets/brand/aidesk-mark.png'
import { ecosystemGroups, roadmapPhases, type RoadmapPhase } from '../data/roadmapV2'
import './roadmap.css'

const FEATURE_ICONS: LucideIcon[] = [Link2, Monitor, Layers3, Settings2, ShieldCheck, Network, Puzzle]
const ENVIRONMENTS: Array<{ label: string; group: string; icon: LucideIcon }> = [
  { label: 'Web', group: 'managers', icon: Globe },
  { label: 'Desktop', group: 'desktop', icon: Monitor },
  { label: 'CLI', group: 'cli', icon: TerminalSquare },
  { label: 'IDE', group: 'ide', icon: Code2 },
  { label: 'API & MCP', group: 'api-local', icon: Link2 },
  { label: 'Local AI', group: 'api-local', icon: Database },
]

const HubArtwork: React.FC = () => (
  <div className="rm-artwork" role="img" aria-label="AI Desk Hub kết nối Web, Desktop, CLI, IDE và API">
    <div className="rm-art-glow" />
    <div className="rm-glass-plane rm-glass-plane-back" />
    <div className="rm-glass-plane rm-glass-plane-front" />
    <svg className="rm-art-connections" viewBox="0 0 500 360" fill="none" aria-hidden="true">
      <path d="M250 180 C140 180 150 65 120 65 M250 180 C340 190 380 100 410 80 M250 180 C130 220 95 165 65 155 M250 180 C360 180 390 240 440 240 M250 180 C150 180 100 270 85 290 M250 180 C250 240 265 270 270 315" />
      <path d="M120 65 C80 170 300 210 410 80 M85 290 C250 340 440 340 440 240" />
    </svg>
    <div className="rm-art-logo"><img src={mark} alt="" /></div>
    {[Monitor, Code2, Globe, Settings2, TerminalSquare, Database].map((Icon, index) => (
      <div key={index} className={`rm-art-tile rm-art-tile-${index}`}><Icon aria-hidden="true" /></div>
    ))}
  </div>
)

const PhaseRow: React.FC<{ phase: RoadmapPhase }> = ({ phase }) => {
  const [expanded, setExpanded] = useState(false)
  const [activeFeature, setActiveFeature] = useState<number | null>(null)

  return (
    <article className={`rm-phase rm-phase-${phase.stage}`}>
      <span className="rm-phase-marker" aria-hidden="true">{phase.number}</span>
      <div className="rm-phase-shell">
        <div className="rm-phase-intro">
          <div className="rm-phase-heading">
            <p className="rm-kicker">{phase.eyebrow}</p>
            <h3>{phase.title}</h3>
            <button className="rm-phase-toggle" type="button" aria-expanded={expanded} aria-controls={`phase-${phase.id}-content`} onClick={() => setExpanded(!expanded)} aria-label={`${expanded ? 'Thu gọn' : 'Mở'} giai đoạn ${phase.number}: ${phase.title}`}>
              <ChevronDown className={expanded ? 'rm-rotated' : ''} aria-hidden="true" />
            </button>
          </div>
          <div className="rm-phase-summary">
            <span className="rm-status">{phase.status}</span>
            <p>{phase.description}</p>
          </div>
        </div>
        <div id={`phase-${phase.id}-content`} className={`rm-phase-content ${expanded ? 'is-expanded' : ''}`}>
          <p className="rm-mobile-description">{phase.description}</p>
          <div className="rm-feature-grid">
            {phase.features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length]
              const isActive = activeFeature === index
              return (
                <div key={feature.title} className="rm-feature-wrap">
                <button type="button" className={`rm-feature ${isActive ? 'is-active' : ''}`} aria-expanded={isActive} aria-controls={`phase-${phase.id}-detail-${index}`} onClick={() => setActiveFeature(isActive ? null : index)}>
                  <Icon className="rm-feature-icon" aria-hidden="true" />
                  <span className="rm-feature-text"><strong>{feature.title}</strong><span>{feature.summary}</span></span>
                  <ChevronDown className={`rm-feature-chevron ${isActive ? 'rm-rotated' : ''}`} aria-hidden="true" />
                </button>
                <div id={`phase-${phase.id}-detail-${index}`} className="rm-feature-detail" hidden={!isActive}>
                  {isActive && <>
                    <h4>{feature.title}</h4>
                    {feature.label && <p className="rm-detail-label">{feature.label}</p>}
                    <ul>{feature.details.map((detail) => <li key={detail}><Check aria-hidden="true" /><span>{detail}</span></li>)}</ul>
                    {phase.note && <p className="rm-release-note"><Info aria-hidden="true" /><span>{phase.note}</span></p>}
                  </>}
                </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </article>
  )
}

const FutureEcosystem: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const selected = ecosystemGroups.find((group) => group.id === activeGroup)

  const selectGroup = (id: string) => {
    setActiveGroup(id)
  }

  return (
    <section className="rm-ecosystem rm-container" aria-labelledby="ecosystem-title">
      <div className="rm-ecosystem-overview">
        <div className="rm-ecosystem-heading">
          <p className="rm-kicker">MỘT LỚP ĐIỀU PHỐI CHO NHIỀU AI MANAGER</p>
          <h2 id="ecosystem-title">Tương lai của AI Desk</h2>
          <p>Một lớp điều phối chung cho nhiều AI Manager và nhiều cách thực thi — Web, Desktop, CLI, IDE, API và Local AI.</p>
        </div>
        <div className="rm-diagram" aria-label="Sơ đồ hệ sinh thái AI Desk tương lai">
          <div className="rm-diagram-flow">
            <div className="rm-managers">
              <p className="rm-diagram-caption">CÁC AI MANAGER</p>
              <button type="button" onClick={() => selectGroup('managers')}><Bot aria-hidden="true" /><span>ChatGPT Web<small>Đang sử dụng</small></span></button>
              <button type="button" onClick={() => selectGroup('managers')}><Sparkles aria-hidden="true" /><span>Claude · Gemini · Grok<small>Nghiên cứu</small></span></button>
              <button type="button" onClick={() => selectGroup('managers')}><Puzzle aria-hidden="true" /><span>Perplexity · AI Web khác<small>Nghiên cứu / Dự kiến</small></span></button>
            </div>
            <ArrowRight className="rm-flow-arrow" aria-hidden="true" />
            <div className="rm-core"><Network aria-hidden="true" /><strong>AI Desk Core</strong><span>Điều phối · Theo dõi · Kiểm soát</span></div>
            <ArrowRight className="rm-flow-arrow" aria-hidden="true" />
            <div className="rm-environments">
              <p className="rm-diagram-caption">CÁC MÔI TRƯỜNG THỰC THI</p>
              <div>{ENVIRONMENTS.map(({ label, group, icon: Icon }) => <button key={label} type="button" onClick={() => selectGroup(group)} className={activeGroup === group ? 'is-selected' : ''}><Icon aria-hidden="true" /><span>{label}</span></button>)}</div>
            </div>
          </div>
          <p className="rm-diagram-note">Sơ đồ định hướng. Chọn một nhóm để xem phạm vi và trạng thái; các nhánh tương lai chưa phải tích hợp đã phát hành.</p>
        </div>
      </div>
      <div className="rm-group-selector" role="group" aria-label="Nhóm hệ sinh thái tương lai" onKeyDown={(event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return
        if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        const buttons = Array.from(event.currentTarget.querySelectorAll('button'))
        const current = buttons.indexOf(event.target as HTMLButtonElement)
        if (current < 0) return
        event.preventDefault()
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + buttons.length) % buttons.length
        setActiveGroup(ecosystemGroups[next].id)
        buttons[next].focus()
      }}>
        {ecosystemGroups.map((group) => <button key={group.id} type="button" id={`ecosystem-trigger-${group.id}`} aria-expanded={activeGroup === group.id} aria-controls="ecosystem-detail" onClick={() => setActiveGroup(activeGroup === group.id ? null : group.id)} className={activeGroup === group.id ? 'is-selected' : ''}>{group.label}<ChevronDown className={activeGroup === group.id ? 'rm-rotated' : ''} aria-hidden="true" /></button>)}
      </div>
      <div id="ecosystem-detail" className="rm-ecosystem-detail" role="region" aria-label="Chi tiết hệ sinh thái" hidden={!selected}>
        {selected && <>
          <div className="rm-detail-heading"><div><p className="rm-kicker">{selected.label}</p><h3>{selected.title}</h3></div><span className="rm-future-status">{selected.status}</span></div>
          <p className="rm-detail-intro">{selected.intro}</p>
          {selected.platforms && <ul className="rm-platforms">{selected.platforms.map((platform) => <li key={platform.name}><strong>{platform.name}</strong><span>{platform.status ?? selected.status}</span></li>)}</ul>}
          <div className="rm-directions">{selected.directions.map((direction) => <div key={direction.title}><h4>{direction.title}</h4><p>{direction.description}</p></div>)}</div>
        </>}
      </div>
    </section>
  )
}

const PRINCIPLES: Array<{ title: string; description: string; icon: LucideIcon }> = [
  { title: 'Minh bạch', description: 'Phân biệt triển khai nội bộ, Beta công khai và các hướng phát triển.', icon: ShieldCheck },
  { title: 'Có thể kiểm soát', description: 'Ưu tiên theo dõi, xác nhận và phục hồi trong quá trình điều phối.', icon: Settings2 },
  { title: 'Tương thích và mở rộng', description: 'Mở rộng nhiều AI và môi trường theo khả năng đã được kiểm tra.', icon: Link2 },
  { title: 'Theo nhu cầu thực tế', description: 'Cải thiện tính năng từ công việc hằng ngày và phản hồi người dùng.', icon: Users },
]

export const RoadmapPage: React.FC = () => (
  <div className="premium-page roadmap-v2 rm-approved">
    <header className="rm-hero">
      <div className="rm-container rm-hero-layout">
        <div className="rm-hero-copy">
          <a href="/" className="rm-back">← Về trang chủ</a>
          <p className="rm-kicker">LỘ TRÌNH PHÁT TRIỂN</p>
          <h1>AI Desk đang phát triển đến đâu?</h1>
          <p>Từ một công cụ giúp chuyển giao nhiệm vụ giữa ChatGPT và các ứng dụng AI trên Windows, AI Desk đang từng bước trở thành một môi trường điều phối AI có thể theo dõi, kiểm soát và mở rộng.</p>
          <p>Khám phá những gì đã được xây dựng, đang hoàn thiện và những hướng phát triển tiếp theo.</p>
          <div className="rm-update"><Info aria-hidden="true" /><p>Cập nhật: 19/10/2026. Trạng thái dựa trên tiến độ phát triển và kiểm thử nội bộ; không đồng nghĩa tất cả tính năng đã có trong phiên bản tải xuống.</p></div>
        </div>
        <HubArtwork />
      </div>
    </header>

    <section className="rm-timeline-section" aria-labelledby="timeline-title">
      <div className="rm-container">
        <div className="rm-section-heading"><p className="rm-kicker">TỪ NỀN TẢNG ĐẾN HỆ SINH THÁI</p><h2 id="timeline-title">Bốn giai đoạn phát triển</h2><p>Mỗi giai đoạn mở ra những khả năng mới, hướng tới một nền tảng điều phối AI linh hoạt hơn. Chọn một tính năng để xem phạm vi và trạng thái hiện tại.</p></div>
        <div className="rm-timeline">{roadmapPhases.map((phase) => <PhaseRow key={phase.id} phase={phase} />)}</div>
      </div>
    </section>

    <FutureEcosystem />

    <div className="rm-bottom">
      <section className="rm-container rm-principles" aria-labelledby="principles-title">
        <div><p className="rm-kicker">NGUYÊN TẮC PHÁT TRIỂN</p><h2 id="principles-title">Mở rộng nhưng không đánh đổi tính minh bạch</h2><p>AI Desk được xây dựng trên những nguyên tắc rõ ràng, hướng tới trải nghiệm an toàn, linh hoạt và bền vững cho người dùng.</p></div>
        <div className="rm-principle-grid">{PRINCIPLES.map(({title, description, icon: Icon}) => <div key={title} className="rm-principle"><span><Icon aria-hidden="true" /></span><div><h3>{title}</h3><p>{description}</p></div></div>)}</div>
      </section>
      <section className="rm-container rm-pro" aria-labelledby="pro-title"><Sparkles aria-hidden="true" /><div><span className="rm-kicker">ĐỊNH HƯỚNG THƯƠNG MẠI · DỰ KIẾN</span><h2 id="pro-title">AI Desk Pro</h2><p>Sau giai đoạn Free Public Beta, AI Desk dự kiến phát triển phiên bản Pro với những khả năng nâng cao, nhằm duy trì và tiếp tục đầu tư vào sản phẩm.</p></div></section>
      <section className="rm-container rm-cta" aria-labelledby="roadmap-cta-title"><Sparkles className="rm-cta-spark" aria-hidden="true" /><div className="rm-cta-copy"><p className="rm-kicker">SẴN SÀNG KHÁM PHÁ?</p><h2 id="roadmap-cta-title">Tiếp tục khám phá AI Desk</h2><p>Tìm hiểu về tính năng, hướng dẫn cài đặt hoặc theo dõi những cập nhật mới nhất.</p></div><div className="rm-cta-actions"><a href="/why-ai-desk" className="rm-button rm-button-primary">Tìm hiểu AI Desk<ArrowRight aria-hidden="true" /></a><a href="/install" className="rm-button"><BookOpen aria-hidden="true" />Hướng dẫn cài đặt</a><a href="/#community" className="rm-button"><Bell aria-hidden="true" />Theo dõi cập nhật</a></div></section>
    </div>
  </div>
)
