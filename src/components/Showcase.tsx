import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { AppPreview, type PreviewScreen } from './AppPreview'
import { SECTION_IDS } from '../config/navigation'

const TABS: Array<{ id: PreviewScreen; label: string; points: string[] }> = [
  {
    id: 'monitor',
    label: 'Monitor',
    points: [
      'Timeline sự kiện cho từng yêu cầu: nhận lệnh, chuyển cho worker, thu kết quả, trả về GPT.',
      'Lọc theo loại sự kiện và theo worker khi cần tìm lại một bước.',
      'Bảng Multi-Session chạy ở chế độ quan sát (shadow), không can thiệp luồng thật.',
    ],
  },
  {
    id: 'sessions',
    label: 'Phiên',
    points: [
      'Mỗi worker có danh sách phiên riêng; phiên GPT chính được khóa và chỉ đổi khi bạn xác nhận.',
      'AI Desk lưu gợi ý cửa sổ của phiên, không lưu mã cửa sổ hệ thống.',
      'Khi phiên đang mở không khớp phiên đã gắn, AI Desk dừng thay vì gửi nhầm.',
    ],
  },
]

export const Showcase: React.FC = () => {
  const [active, setActive] = useState<PreviewScreen>('monitor')
  const tab = TABS.find((t) => t.id === active) ?? TABS[0]

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const index = TABS.findIndex((t) => t.id === active)
    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
    setActive(next.id)
    document.getElementById(`product-tab-${next.id}`)?.focus()
  }

  return (
    <section id={SECTION_IDS.showcase} aria-labelledby="showcase-title" className="section bg-navy">
      <div className="container-content grid items-center gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:gap-14">
        <div id={`product-panel-${tab.id}`} role="tabpanel" aria-labelledby={`product-tab-${tab.id}`} className="lg:order-1">
          <AppPreview screen={tab.id} />
        </div>

        <div className="lg:order-2">
          <p className="eyebrow">Trải nghiệm sản phẩm</p>
          <h2 id="showcase-title" className="section-title mt-3">
            Được thiết kế để làm việc thật, mỗi ngày
          </h2>
          <p className="section-lead">
            AI Desk chạy cạnh trình duyệt và công cụ lập trình bạn đang dùng. Mọi bước điều phối đều nhìn thấy được.
          </p>

          <div role="tablist" aria-label="Màn hình minh họa" className="mt-7 inline-flex rounded-[10px] border border-line bg-navy-900 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                id={`product-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={t.id === active}
                aria-controls={`product-panel-${t.id}`}
                tabIndex={t.id === active ? 0 : -1}
                onClick={() => setActive(t.id)}
                onKeyDown={onKeyDown}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  t.id === active ? 'bg-white/10 text-white' : 'text-muted hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <ul className="mt-6 space-y-3.5">
            {tab.points.map((point) => (
              <li key={point} className="flex gap-3 text-slate-300">
                <Check className="mt-1 h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
