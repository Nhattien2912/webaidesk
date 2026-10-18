// Prompt Library data.
// INTEGRITY RULES:
// - verified: Confirmed from actual source code, documentation or tests.
// - experimental: Code exists but behavior is not guaranteed.
// - coming-soon: Not yet available in any build.
// - Do NOT include secrets, tokens, private URLs, or developer machine info.
// - Do NOT fabricate protocol fields, action names or JSON structures.
// - Prompt content must be character-perfect. Preserve newlines and UTF-8 encoding.
//
// Sources verified from: roadmap.ts, changelog.ts, HowItWorks.tsx, Features.tsx
// Protocol verified: AI_DESK_MANAGER_ACTION, AI_DESK_WORKER_RESULT, requestId,
//   session binding, result store (in-progress), Manual/Assisted workflow.

export type PromptStatus = 'verified' | 'experimental' | 'coming-soon'

export interface PromptMeta {
  id: string
  title: string
  description: string
  category: string
  mode: string
  workers: string[]
  aiDeskVersion: string
  status: PromptStatus
  statusNote: string
  updatedAt: string
  content: string
}

export interface PromptCategory {
  id: string
  label: string
  description: string
}

export const promptCategories: PromptCategory[] = [
  { id: 'all', label: 'Tất cả', description: 'Tất cả mẫu đã được công bố' },
  { id: 'manager', label: 'GPT Manager', description: 'Mẫu tạo action cho AI Desk' },
  { id: 'single-worker', label: 'Single Worker', description: 'Mẫu giao việc cho một worker' },
]

const ACTION_RULES = `Bạn đang chuẩn bị một action cho AI Desk.

Khi người dùng cung cấp nhiệm vụ, hãy trả về đúng một JSON object và không thêm văn bản bên ngoài JSON. Giữ nguyên các khóa sau:
- type: "AI_DESK_MANAGER_ACTION"
- action: "SEND_TO_WORKER"
- worker: một trong "claude", "codex", "opencode", "antigravity" hoặc "auto"
- instruction: yêu cầu cụ thể dành cho worker
- requestId: null để AI Desk tự tạo ID hiệu lực từ danh tính tin nhắn, hoặc một chuỗi ID do người dùng cung cấp
- taskTitle: tiêu đề ngắn, không bắt buộc

Không thêm khóa khác. Không tự tuyên bố rằng action đã chạy; chỉ tạo JSON để AI Desk tiếp nhận.`

export const prompts: PromptMeta[] = [
  {
    id: 'manager-action-template',
    title: 'Manager Action — mẫu theo source',
    description: 'Mẫu tạo AI_DESK_MANAGER_ACTION với đúng các trường mà parser hiện tại chấp nhận.',
    category: 'manager',
    mode: 'Action template',
    workers: ['Codex', 'Claude Code', 'OpenCode', 'Antigravity', 'Auto'],
    aiDeskVersion: 'Source hiện tại',
    status: 'verified',
    statusNote: 'Schema được đối chiếu với src/shared/managerAction.ts. Khả năng hoạt động trong gói 0.2 Beta chưa được xác minh độc lập.',
    updatedAt: '2026-10-18',
    content: ACTION_RULES,
  },
  {
    id: 'codex-action-template',
    title: 'Codex Action — mẫu một worker',
    description: 'Biến thể giới hạn worker thành Codex, không thêm quy tắc điều phối chưa có trong source.',
    category: 'single-worker',
    mode: 'Action template',
    workers: ['Codex'],
    aiDeskVersion: 'Source hiện tại',
    status: 'verified',
    statusNote: 'Schema được đối chiếu với src/shared/managerAction.ts. Người dùng vẫn phải kiểm tra trạng thái thực tế trong AI Desk.',
    updatedAt: '2026-10-18',
    content: `${ACTION_RULES}\n\nTrong mẫu này, luôn đặt worker là "codex".`,
  },
]
