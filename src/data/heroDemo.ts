import type { HeroWorkerId } from './heroWorkers'

export type DemoStatus = 'idle' | 'running' | 'paused' | 'complete'
export type DemoState = { step: number; status: DemoStatus }
export type DemoAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'next' }
  | { type: 'replay' }
  | { type: 'reset' }

export const DEMO_STEPS: readonly {
  label: string
  title: string
  description: string
  activeNode: HeroWorkerId | 'hub'
}[] = [
  { label: 'User Request', title: 'Tạo màn hình đăng nhập Android.', description: 'Yêu cầu mẫu được đưa vào GPT Web Manager.', activeNode: 'manager' },
  { label: 'Planning', title: 'GPT Manager đang lập kế hoạch…', description: 'Phân tích mục tiêu và chuẩn bị nhiệm vụ cho worker.', activeNode: 'manager' },
  { label: 'Dispatch', title: 'AI Desk đang chuyển tác vụ.', description: 'Action được kiểm tra và điều phối tới đúng phiên Codex.', activeNode: 'hub' },
  { label: 'Worker Execution', title: 'Codex đang thực hiện nhiệm vụ…', description: 'Đây là trạng thái mô phỏng, không gọi Codex thật.', activeNode: 'codex' },
  { label: 'Result Return', title: 'Worker đã hoàn thành tác vụ.', description: 'Kết quả mô phỏng được thu lại qua AI Desk.', activeNode: 'result' },
  { label: 'Manager Review', title: 'Đã nhận kết quả — chờ đánh giá.', description: 'GPT Web Manager nhận kết quả để người dùng nghiệm thu.', activeNode: 'manager' },
] as const

export const INITIAL_DEMO_STATE: DemoState = { step: 0, status: 'idle' }

export const heroDemoReducer = (state: DemoState, action: DemoAction): DemoState => {
  switch (action.type) {
    case 'play':
      return state.status === 'complete' ? { step: 0, status: 'running' } : { ...state, status: 'running' }
    case 'pause':
      return { ...state, status: state.status === 'running' ? 'paused' : state.status }
    case 'next': {
      if (state.step >= DEMO_STEPS.length - 1) return { step: DEMO_STEPS.length - 1, status: 'complete' }
      const step = state.step + 1
      return { step, status: step === DEMO_STEPS.length - 1 ? 'complete' : state.status }
    }
    case 'replay':
      return { step: 0, status: 'running' }
    case 'reset':
      return INITIAL_DEMO_STATE
  }
}
