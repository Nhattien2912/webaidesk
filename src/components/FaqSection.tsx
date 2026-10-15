import React, { useId, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { SECTION_IDS } from '../config/navigation'
import type { FaqItem } from '../types'

const FAQS: FaqItem[] = [
  {
    category: 'Tổng quan',
    question: 'AI Desk là gì?',
    answer:
      'AI Desk là ứng dụng Windows điều phối nhiều công cụ AI lập trình. GPT Manager (ChatGPT web) lập kế hoạch và giao việc; AI Desk chuyển yêu cầu tới worker như Codex hoặc Claude Code trên máy bạn, rồi đưa kết quả về GPT Manager.',
  },
  {
    category: 'Bản quyền & Chi phí',
    question: 'Có cần tài khoản không?',
    answer:
      'Không cần tài khoản AI Desk. Bạn vẫn cần tài khoản hợp lệ của các dịch vụ muốn dùng (ví dụ ChatGPT, Codex, Claude). AI Desk không bán lại tài khoản hay hạn mức của bên thứ ba.',
  },
  {
    category: 'Bản quyền & Chi phí',
    question: 'AI Desk có mất phí không?',
    answer:
      'AI Desk sẽ miễn phí trong giai đoạn Public Beta. AI Desk Pro là phiên bản trả phí dự kiến ra mắt sau đó; giá và thời điểm chưa được chốt.',
  },
  {
    category: 'Tổng quan',
    question: 'Khi nào tôi tải được AI Desk?',
    answer:
      'Bản Public Beta sẽ mở tải khi bộ cài đã được ký số và kiểm tra. Hiện chưa có ngày cụ thể; bạn có thể đăng ký nhận tin ở mục Cộng đồng.',
  },
  {
    category: 'Tổng quan',
    question: 'Thiết lập AI Desk gồm những bước nào?',
    answer:
      'Cài AI Desk, cài extension đồng hành cho trình duyệt và liên kết với cuộc trò chuyện ChatGPT dùng làm GPT Manager, rồi mở Codex hoặc Claude Code, chọn thư mục dự án và gắn phiên cho từng worker. Hướng dẫn chi tiết sẽ được công bố cùng bản Public Beta.',
  },
  {
    category: 'Kỹ thuật',
    question: 'AI Desk chạy trên hệ điều hành nào?',
    answer: 'Hiện chỉ hỗ trợ Windows 10 và Windows 11 bản 64-bit. Chưa có kế hoạch cụ thể cho macOS hoặc Linux.',
  },
  {
    category: 'Bảo mật',
    question: 'Dữ liệu của tôi được xử lý thế nào?',
    answer:
      'Việc điều phối chạy trên máy của bạn. Nội dung bạn giao cho GPT Manager và worker được gửi tới các dịch vụ AI đó qua ứng dụng và tài khoản của chính bạn, theo chính sách của từng dịch vụ. Extension đồng hành chỉ hoạt động trên chatgpt.com. Một số kết nối mạng tùy chọn chỉ chạy khi bạn tự cấu hình. Xem thêm trang Quyền riêng tư.',
  },
  {
    category: 'Kỹ thuật',
    question: 'AI Desk có tự ý sửa mã nguồn của tôi không?',
    answer:
      'Thay đổi mã do worker bạn chọn thực hiện, không phải do AI Desk. Với các job Claude Code, AI Desk hỏi xác nhận trước khi cho phép sửa file trong dự án. Bạn nên dùng Git để xem lại mọi thay đổi.',
  },
  {
    category: 'Bản quyền & Chi phí',
    question: 'AI Desk có phải đối tác của OpenAI, Anthropic hay Google không?',
    answer:
      'Không. AI Desk là công cụ độc lập. Các tên ChatGPT, Codex, Claude, Antigravity thuộc về chủ sở hữu tương ứng.',
  },
]

export const FaqSection: React.FC = () => {
  const [openQuestion, setOpenQuestion] = useState<string | null>(FAQS[0].question)
  const [query, setQuery] = useState('')
  const baseId = useId()

  const needle = query.trim().toLowerCase()
  const filtered = needle
    ? FAQS.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(needle))
    : FAQS

  return (
    <section id={SECTION_IDS.faq} aria-labelledby="faq-title" className="section border-y border-white/[0.06] bg-navy-900">
      <div className="container-content grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="eyebrow">FAQ</p>
          <h2 id="faq-title" className="section-title mt-3">
            Câu hỏi thường gặp
          </h2>
          <p className="section-lead">Những điều cần biết trước khi cài AI Desk.</p>
          <div className="relative mt-8">
            <label htmlFor={`${baseId}-search`} className="sr-only">
              Tìm câu hỏi
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
            <input
              id={`${baseId}-search`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm câu hỏi (Windows, tài khoản, dữ liệu…)"
              className="field pl-10"
            />
          </div>
        </div>

        <div className="card divide-y divide-line">
          {filtered.length === 0 && <p className="p-5 text-sm text-muted">Không tìm thấy câu hỏi phù hợp.</p>}
          {filtered.map((faq, index) => {
            const open = openQuestion === faq.question
            const panelId = `${baseId}-faq-${index}`
            return (
              <div key={faq.question}>
                <h3>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-ink hover:bg-white/[0.03]"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenQuestion(open ? null : faq.question)}
                  >
                    {faq.question}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-subtle transition-transform ${open ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <div id={panelId} hidden={!open} className="px-5 pb-5 text-sm leading-relaxed text-muted">
                  {faq.answer}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
