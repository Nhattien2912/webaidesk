import React from 'react'
import { Archive, Bot, ShieldCheck, Sparkles } from 'lucide-react'
import { SECTION_IDS } from '../config/navigation'

const ITEMS = [
  { icon: Sparkles, title: 'GPT Manager', body: 'ChatGPT web lập kế hoạch, giao việc và nghiệm thu.' },
  { icon: Bot, title: 'AI Workers', body: 'Codex và Claude Code thực hiện ngay trên máy bạn.' },
  { icon: Archive, title: 'Result Store', body: 'Kết quả dài được lưu cục bộ để đọc theo trang.', badge: 'Đang phát triển' },
  { icon: ShieldCheck, title: 'Session Safety', body: 'Kiểm tra đúng phiên trước khi gửi, dừng khi sai.' },
]

export const Capabilities: React.FC = () => (
  <section id={SECTION_IDS.capabilities} aria-label="Năng lực chính" className="border-b border-white/[0.06] bg-navy">
    <ul className="container-content grid divide-line sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
      {ITEMS.map(({ icon: Icon, title, body, badge }) => (
        <li key={title} className="flex gap-3.5 py-7 lg:px-6 lg:first:pl-0 lg:last:pr-0">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent-light" aria-hidden="true" />
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-white">
              {title}
              {badge && <span className="badge bg-amber-400/10 px-2 text-[11px] text-amber-300">{badge}</span>}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  </section>
)
