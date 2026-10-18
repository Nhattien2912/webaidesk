import { CheckCircle2, Code2, Globe2, TerminalSquare } from 'lucide-react'

export type HeroWorkerId = 'manager' | 'codex' | 'claude' | 'result'

export type HeroWorker = {
  id: HeroWorkerId
  title: string
  role: string
  summary: string
  hoverLabel: string
  capabilities: readonly string[]
  icon: typeof Globe2
  tone: 'emerald' | 'navy' | 'orange' | 'blue'
  position: { x: number; y: number }
  connectorPath: string
}

export const HERO_VIEWBOX = { width: 1000, height: 680, hubX: 668, hubY: 326 } as const

export const HERO_WORKERS: readonly HeroWorker[] = [
  {
    id: 'manager',
    title: 'GPT Web Manager',
    role: 'Điều phối kế hoạch',
    summary: 'Phân tích yêu cầu, lập kế hoạch, giao nhiệm vụ và đánh giá kết quả worker.',
    hoverLabel: 'Lập kế hoạch và giao nhiệm vụ',
    capabilities: ['Phân tích yêu cầu', 'Lập kế hoạch', 'Giao nhiệm vụ', 'Đánh giá kết quả worker'],
    icon: Globe2,
    tone: 'emerald',
    position: { x: 205, y: 175 },
    connectorPath: 'M 610 303 C 535 258, 430 208, 315 190',
  },
  {
    id: 'codex',
    title: 'Codex',
    role: 'Coding Worker',
    summary: 'Thực hiện tác vụ lập trình trong dự án theo yêu cầu được AI Desk chuyển tới.',
    hoverLabel: 'Viết mã, sửa lỗi và review',
    capabilities: ['Viết mã nguồn', 'Sửa lỗi', 'Refactor', 'Review code'],
    icon: TerminalSquare,
    tone: 'navy',
    position: { x: 205, y: 505 },
    connectorPath: 'M 610 352 C 530 405, 425 470, 315 495',
  },
  {
    id: 'claude',
    title: 'Claude Code',
    role: 'AI Worker',
    summary: 'Phân tích nhiệm vụ và kiểm tra mã nguồn trước khi trả kết quả về quy trình.',
    hoverLabel: 'Phân tích và kiểm tra mã nguồn',
    capabilities: ['Phân tích nhiệm vụ', 'Kiểm tra mã nguồn', 'Review', 'Giải thích kết quả'],
    icon: Code2,
    tone: 'orange',
    position: { x: 820, y: 175 },
    connectorPath: 'M 720 303 C 735 260, 745 215, 755 190',
  },
  {
    id: 'result',
    title: 'Result Return',
    role: 'Kết quả về Manager',
    summary: 'AI Desk thu kết quả worker và đưa trở lại GPT Web Manager để người dùng xem xét.',
    hoverLabel: 'Thu kết quả về đúng phiên',
    capabilities: ['Thu kết quả worker', 'Gắn đúng phiên', 'Trả về Manager', 'Chờ người dùng đánh giá'],
    icon: CheckCircle2,
    tone: 'blue',
    position: { x: 820, y: 505 },
    connectorPath: 'M 720 352 C 735 410, 745 465, 755 495',
  },
] as const

export const getHeroWorker = (id: HeroWorkerId | null) =>
  HERO_WORKERS.find((worker) => worker.id === id) ?? null
