import { roadmapPhases } from './roadmapV2.ts'

// Editorial summaries only. Phase identity and release state come from the full roadmap.
const summaries: Record<string, { description: string; highlights: string[]; note?: string }> = {
  foundation: {
    description: 'Kết nối GPT Web Manager với AI Desk và các worker như Codex, Claude Code; hỗ trợ theo dõi nhiệm vụ và quản lý phiên làm việc.',
    highlights: ['GPT Manager & GPT Bridge', 'Codex / Claude Code', 'Session Binding', 'Monitor & Local Control API'],
  },
  automation: {
    description: 'Phát triển các luồng chuyển giao tự động, quản lý kết quả dài và cơ chế xử lý lỗi để giảm thao tác thủ công.',
    highlights: ['Auto Handoff', 'Result Store V1', 'Recovery & Error Handling', 'Mở rộng worker và session'],
    note: 'Nguyên mẫu nội bộ; không đồng nghĩa tất cả đã có trong Beta công khai.',
  },
  'public-beta': {
    description: 'AI Desk đã có bản Beta dành cho Windows để người dùng tải về trải nghiệm. Sản phẩm tiếp tục được cải thiện về tính ổn định, tương thích và trải nghiệm sử dụng.',
    highlights: ['Bản tải Windows Beta', 'Hướng dẫn cài đặt', 'Prompt Library', 'Cải thiện tương thích và sửa lỗi'],
  },
  ecosystem: {
    description: 'Mở rộng AI Desk sang nhiều AI Manager, Desktop Worker, CLI, IDE, API và Local AI; từng bước phát triển khả năng điều phối đa tác nhân.',
    highlights: ['ChatGPT, Claude, Gemini và các AI Web khác làm Manager', 'Desktop / CLI / IDE Agents', 'API, MCP & Local AI', 'Multi-Agent & Full Autonomous'],
    note: 'Các hạng mục là định hướng, chưa phải tính năng đã phát hành.',
  },
}

export const homepageRoadmap = roadmapPhases.map((phase) => {
  const summary = summaries[phase.id]
  if (!summary) throw new Error(`Missing homepage roadmap summary: ${phase.id}`)
  return {
    id: phase.id,
    number: phase.number,
    title: phase.title,
    stage: phase.stage,
    status: phase.stage === 'refining' ? phase.status.replace('nguyên mẫu hoạt động', 'nguyên mẫu') : phase.status,
    ...summary,
  }
})
