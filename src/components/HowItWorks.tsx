import React from 'react'
import { Archive, Bot, ChevronRight, Layers, Sparkles } from 'lucide-react'
import { SECTION_IDS } from '../config/navigation'

const STEPS = [
  {
    icon: Sparkles,
    title: 'GPT Manager',
    body: 'Bạn mô tả mục tiêu trong ChatGPT. GPT Manager lập kế hoạch và viết yêu cầu cho worker.',
  },
  {
    icon: Layers,
    title: 'AI Desk',
    body: 'Nhận yêu cầu qua GPT Bridge, kiểm tra đúng worker và đúng phiên, rồi chuyển việc trên máy bạn.',
    highlight: true,
  },
  {
    icon: Bot,
    title: 'Worker',
    body: 'Codex hoặc Claude Code thực hiện trong dự án. Bước cần duyệt vẫn chờ bạn xác nhận.',
  },
  {
    icon: Archive,
    title: 'Result Store / GPT Return',
    body: 'Kết quả được thu lại và gửi về GPT Manager. Kết quả dài sẽ được lưu để đọc theo trang (đang phát triển).',
  },
]

export const HowItWorks: React.FC = () => (
  <section
    id={SECTION_IDS.howItWorks}
    aria-labelledby="how-title"
    className="section border-y border-white/[0.06] bg-navy-900"
  >
    <div className="container-content">
      <div className="max-w-3xl">
        <p className="eyebrow">Cách hoạt động</p>
        <h2 id="how-title" className="section-title mt-3">
          Từ ý tưởng đến kết quả trong một quy trình rõ ràng
        </h2>
        <p className="section-lead">
          Một GPT Manager điều phối. Mỗi việc đi qua AI Desk tới worker phù hợp và quay về để nghiệm thu.
        </p>
      </div>

      <ol className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {STEPS.map(({ icon: Icon, title, body, highlight }, index) => (
          <li key={title} className="relative flex lg:pr-6 lg:last:pr-0">
            <div
              className={`card w-full p-6 ${highlight ? 'border-blue-300 bg-blue-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${
                    highlight ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-blue-50 text-blue-700'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-xs font-medium text-slate-500">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{body}</p>
            </div>
            {index < STEPS.length - 1 && (
              <ChevronRight
                aria-hidden="true"
                className="absolute right-0.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-slate-500 lg:block"
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  </section>
)
