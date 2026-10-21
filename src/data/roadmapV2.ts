// Editorial roadmap approved for 19/10/2026. This date is not a technical completion date.
// Desktop prototype claims come from the product brief; website tests do not certify adapters.
// Keep separate from the legacy homepage roadmap to preserve its existing content.
export type RoadmapPhaseStage = 'internal' | 'refining' | 'beta' | 'direction'

export interface RoadmapFeature {
  title: string
  summary: string
  details: string[]
  label?: string
}

export interface RoadmapPhase {
  id: string
  number: string
  stage: RoadmapPhaseStage
  eyebrow: string
  title: string
  status: string
  description: string
  features: RoadmapFeature[]
  note?: string
}

export interface EcosystemGroup {
  id: string
  label: string
  title: string
  intro: string
  status: string
  platforms?: Array<{ name: string; status?: string }>
  directions: Array<{ title: string; description: string }>
}

export const roadmapPhases: RoadmapPhase[] = [
  {
    id: 'foundation', number: '01', stage: 'internal', eyebrow: 'GIAI ĐOẠN 01',
    title: 'Nền tảng điều phối AI', status: 'Đã triển khai nội bộ',
    description: 'Xây dựng những thành phần cốt lõi để GPT Web có thể phối hợp với các AI Worker trên Windows.',
    features: [
      { title: 'GPT Web Manager & GPT Bridge', summary: 'Kết nối ChatGPT Web với lớp điều phối trên máy tính.', label: 'Đã triển khai nội bộ', details: ['Sử dụng ChatGPT Web làm Manager.', 'Extension chuyển action có cấu trúc từ ChatGPT Web sang AI Desk Desktop.', 'Có cơ chế kiểm tra và định tuyến yêu cầu.'] },
      { title: 'Kết nối Codex và Claude Code', summary: 'Điều phối các ứng dụng worker trong môi trường Windows.', label: 'Đã triển khai nội bộ', details: ['Gửi yêu cầu tới ứng dụng worker trên máy tính.', 'Theo dõi trạng thái và tiếp nhận kết quả.', 'Mức độ hỗ trợ phụ thuộc phiên bản và môi trường.'] },
      { title: 'Session Binding & Request Tracking', summary: 'Giữ yêu cầu, phiên làm việc và kết quả đi đúng luồng.', label: 'Đã triển khai nội bộ', details: ['Liên kết yêu cầu với requestId.', 'Kiểm tra phiên làm việc và worker đích.', 'Hạn chế gửi nhầm cửa sổ hoặc nhầm kết quả.'] },
      { title: 'Monitor & Worker Quota', summary: 'Quan sát nhiệm vụ và hạn mức từ các nguồn được hỗ trợ.', label: 'Đã triển khai nội bộ', details: ['Theo dõi trạng thái tác vụ.', 'Quan sát thông tin hạn mức từ các nguồn được hỗ trợ.', 'Quota có thể không cập nhật theo thời gian thực.'] },
      { title: 'Local Control API', summary: 'Giao tiếp cục bộ giữa GPT Bridge và AI Desk Desktop.', label: 'Đã triển khai nội bộ', details: ['Kết nối GPT Bridge và AI Desk Desktop thông qua giao tiếp cục bộ.', 'Kiểm tra xác thực và giới hạn quyền truy cập.'] },
    ],
  },
  {
    id: 'automation', number: '02', stage: 'refining', eyebrow: 'GIAI ĐOẠN 02',
    title: 'Tự động hóa có kiểm soát', status: 'Đã có nguyên mẫu hoạt động · Đang hoàn thiện',
    description: 'Giảm thao tác chuyển giao thủ công, cải thiện khả năng theo dõi và phục hồi quá trình điều phối.',
    features: [
      { title: 'Tự động chuyển giao và trả kết quả', summary: 'Giảm các bước sao chép thủ công giữa Manager và worker.', details: ['Các luồng gửi yêu cầu, tiếp nhận kết quả và chuyển trở lại Manager đã được phát triển, kiểm thử nội bộ.', 'Tiếp tục hoàn thiện độ ổn định và khả năng tương thích.', 'Không tuyên bố mọi cấu hình đều hoạt động tự động.'] },
      { title: 'Result Store V1', summary: 'Lưu và truy xuất kết quả worker có dung lượng lớn.', details: ['Đã có luồng lưu kết quả worker dung lượng lớn.', 'Hỗ trợ truy xuất theo từng phần.', 'Tiếp tục hoàn thiện tích hợp, độ tin cậy và khả năng phục hồi.'] },
      { title: 'Xử lý lỗi và phục hồi', summary: 'Dừng an toàn và hỗ trợ phục hồi khi handoff gặp sự cố.', details: ['Xử lý worker không phản hồi.', 'Kiểm tra timeout, session mismatch và interrupted handoff.', 'Phát triển cơ chế dừng an toàn và phục hồi.'] },
      { title: 'Antigravity & OpenCode', summary: 'Mở rộng thử nghiệm adapter cho các worker mới.', details: ['Đã có các thử nghiệm adapter.', 'Tiếp tục kiểm tra khả năng tương thích.', 'Chưa quảng cáo là hỗ trợ ổn định trên mọi phiên bản.'] },
      { title: 'Nhiều phiên làm việc', summary: 'Nghiên cứu điều phối nhiều session và nhiệm vụ độc lập.', details: ['Đã nghiên cứu và thử nghiệm cơ chế quản lý session.', 'Tiếp tục phát triển điều phối nhiều phiên và các nhiệm vụ độc lập.', 'Không quảng cáo parallel execution hoàn chỉnh.'] },
    ],
  },
  {
    id: 'public-beta', number: '03', stage: 'beta', eyebrow: 'GIAI ĐOẠN 03',
    title: 'AI Desk Beta cho Windows', status: 'Đã phát hành Beta · Đang tiếp tục hoàn thiện',
    description: 'AI Desk đã có bản Beta dành cho Windows để người dùng trải nghiệm. Trong giai đoạn này, sản phẩm tiếp tục được cải thiện về độ ổn định, trải nghiệm cài đặt, khả năng tương thích và các tính năng điều phối.',
    features: [
      { title: 'Bản tải Windows Beta', summary: 'Đã có bản Beta công khai để tải và trải nghiệm.', details: ['Bản Beta Windows đã được công khai cho người dùng tải và trải nghiệm.', 'Artifact thử nghiệm đang được phân phối qua Cloudflare R2.', 'Phiên bản archive không được dùng để suy ra phiên bản bộ cài bên trong.', 'Bộ cài hiện chưa ký số và có thể gặp cảnh báo từ phần mềm bảo mật.'] },
      { title: 'Cải thiện cài đặt và tương thích', summary: 'Tiếp tục hoàn thiện trải nghiệm trên Windows.', details: ['Hoàn thiện quy trình đóng gói.', 'Kiểm tra checksum, tính tương thích và release gate.', 'Xử lý những vấn đề về chữ ký số và cảnh báo phần mềm bảo mật.', 'Không tuyên bố installer hiện tại đã ký số.', 'Không tuyên bố đã được antivirus xác nhận an toàn.'] },
      { title: 'Tài liệu và Prompt Library', summary: 'Hướng dẫn thiết lập và mẫu prompt theo workflow.', details: ['Website đã có trang hướng dẫn cài đặt.', 'Prompt Library đã được xây dựng.', 'Tiếp tục cải thiện nội dung theo phản hồi người dùng.'] },
      { title: 'Video hướng dẫn', summary: 'Minh họa quá trình thiết lập và chạy nhiệm vụ thực tế.', details: ['Video giới thiệu sản phẩm.', 'Thiết lập GPT Manager và GPT Bridge.', 'Kết nối các worker.', 'Chạy nhiệm vụ từ đầu đến cuối.'] },
      { title: 'Phản hồi cộng đồng và sửa lỗi', summary: 'Cải thiện sản phẩm từ trải nghiệm sử dụng thực tế.', details: ['Thu thập phản hồi trải nghiệm.', 'Xử lý vấn đề tương thích.', 'Cải thiện quy trình onboarding.', 'Tiếp nhận phản hồi và tiếp tục sửa lỗi trong giai đoạn Beta.'] },
    ],
    note: 'Beta Windows đã có thể tải và trải nghiệm. Quy trình phát hành vẫn đang được hoàn thiện; bộ cài chưa ký số và có thể gặp cảnh báo antivirus.',
  },
  {
    id: 'ecosystem', number: '04', stage: 'direction', eyebrow: 'GIAI ĐOẠN 04',
    title: 'Hệ sinh thái AI Desk', status: 'Định hướng dài hạn',
    description: 'Mở rộng AI Desk thành nền tảng điều phối nhiều AI, nhiều phương thức thực thi và nhiều môi trường làm việc.',
    features: [
      { title: 'Multi-AI Manager', summary: 'Nghiên cứu nhiều nền tảng AI Web.', details: ['ChatGPT Web đang được sử dụng; các Manager khác thuộc hướng nghiên cứu.', 'Chọn Manager, quản lý trạng thái và chuyển đổi có kiểm soát.'] },
      { title: 'Desktop Workers mở rộng', summary: 'Adapter và session cho từng worker.', details: ['Codex và Claude Code đã tích hợp nội bộ.', 'Antigravity và OpenCode đang thử nghiệm; tiếp tục phát triển worker health, recovery và routing.'] },
      { title: 'CLI Agents', summary: 'Kế hoạch điều phối agent dòng lệnh.', details: ['Nghiên cứu Codex CLI, Claude Code CLI, Gemini CLI và OpenCode CLI.', 'Quản lý tiến trình, stdout/stderr, timeout, cancel và workspace isolation.'] },
      { title: 'IDE Agents', summary: 'Kết nối workspace và các coding agent.', details: ['Nghiên cứu VS Code, Cursor, Windsurf, JetBrains và Antigravity.', 'Liên kết project, theo dõi test, code review và handoff giữa agent.'] },
      { title: 'API, Local AI và MCP', summary: 'Mở rộng cách tích hợp và thực thi.', details: ['Định hướng kết nối AI Provider API, MCP và Remote Worker.', 'Nghiên cứu Ollama, LM Studio cùng hybrid workflow đa môi trường.'] },
      { title: 'Advanced Orchestration', summary: 'Workflow, routing và quản lý ngữ cảnh.', details: ['Định hướng Multi-Agent Workflow, Parallel Execution, Smart Routing và Workflow Builder.', 'Nghiên cứu scheduling, automation và quản lý project/context.', 'Full Autonomous chưa phải tính năng đã phát hành.'] },
      { title: 'Plugin & Adapter Ecosystem', summary: 'Tích hợp mở qua plugin và adapter.', details: ['Định hướng mở rộng các tích hợp độc lập.', 'Chưa có cam kết hỗ trợ hoặc lịch phát hành.'] },
    ],
  },
]

export const ecosystemGroups: EcosystemGroup[] = [
  {
    id: 'managers', label: 'Multi-AI Manager', title: 'Từ ChatGPT Web đến nhiều nền tảng Manager.',
    intro: 'Cho phép lựa chọn lớp Manager phù hợp với từng nhu cầu mà không biến kế hoạch nghiên cứu thành cam kết hỗ trợ.', status: 'Nghiên cứu / Dự kiến',
    platforms: [{ name: 'ChatGPT Web', status: 'Đang sử dụng' }, { name: 'Claude Web', status: 'Nghiên cứu' }, { name: 'Gemini Web', status: 'Nghiên cứu' }, { name: 'Grok', status: 'Nghiên cứu' }, { name: 'Perplexity', status: 'Nghiên cứu' }, { name: 'Các AI Web khác phù hợp trong tương lai', status: 'Dự kiến' }],
    directions: [{ title: 'Chọn Manager linh hoạt', description: 'Chuyển giữa các Manager phù hợp với nhiệm vụ và môi trường.' }, { title: 'Quản lý trạng thái Manager', description: 'Theo dõi phiên, tính sẵn sàng và ngữ cảnh cần thiết.' }, { title: 'Chuyển đổi có kiểm soát', description: 'Giữ yêu cầu và kết quả nhất quán khi thay đổi Manager.' }, { title: 'Nhiều Manager đánh giá', description: 'Nghiên cứu cơ chế để nhiều Manager cùng đánh giá một nhiệm vụ.' }, { title: 'Web adapter mở rộng', description: 'Thích ứng với những giao diện Web và hành vi khác nhau.' }],
  },
  {
    id: 'desktop', label: 'Desktop Workers', title: 'Mở rộng ứng dụng AI Desktop có thể tham gia quy trình điều phối.',
    intro: 'Tách adapter và session binding theo từng worker để mở rộng mà vẫn kiểm soát được độ ổn định.', status: 'Nội bộ / Thử nghiệm',
    platforms: [{ name: 'Codex', status: 'Tích hợp nội bộ' }, { name: 'Claude Code', status: 'Tích hợp nội bộ' }, { name: 'Antigravity', status: 'Đang thử nghiệm' }, { name: 'OpenCode', status: 'Đang thử nghiệm' }, { name: 'Các AI Desktop phù hợp khác', status: 'Dự kiến' }],
    directions: [{ title: 'Quản lý nhiều worker', description: 'Theo dõi và điều phối nhiều worker trong cùng một nơi.' }, { title: 'Adapter độc lập', description: 'Giảm ảnh hưởng chéo khi một ứng dụng thay đổi giao diện.' }, { title: 'Session binding riêng', description: 'Ràng buộc đúng worker, cửa sổ và phiên làm việc.' }, { title: 'Worker health & recovery', description: 'Phát hiện lỗi và hỗ trợ phục hồi an toàn.' }, { title: 'Routing theo khả năng', description: 'Chọn worker dựa trên nhiệm vụ và mức hỗ trợ.' }],
  },
  {
    id: 'cli', label: 'CLI Agents', title: 'Điều phối những AI Agent làm việc qua dòng lệnh.',
    intro: 'Kết hợp tiến trình CLI với các worker Desktop trong cùng một workflow có kiểm soát.', status: 'Kế hoạch phát triển',
    platforms: [{ name: 'Codex CLI' }, { name: 'Claude Code CLI' }, { name: 'Gemini CLI' }, { name: 'OpenCode CLI' }, { name: 'CLI Agent khác' }],
    directions: [{ title: 'Quản lý tiến trình', description: 'Khởi chạy, quan sát và quản lý vòng đời agent.' }, { title: 'I/O có cấu trúc', description: 'Gửi nhiệm vụ, theo dõi stdout và stderr.' }, { title: 'Timeout & recovery', description: 'Hỗ trợ timeout, cancel và phục hồi.' }, { title: 'Workspace isolation', description: 'Tách môi trường làm việc giữa các nhiệm vụ.' }, { title: 'Hybrid workflow', description: 'Kết hợp CLI và Desktop trong cùng quy trình.' }],
  },
  {
    id: 'ide', label: 'IDE Agents', title: 'Kết nối AI Desk với môi trường lập trình.',
    intro: 'Đưa điều phối, kiểm thử và handoff đến gần workspace phát triển hơn.', status: 'Kế hoạch nghiên cứu',
    platforms: [{ name: 'VS Code và extension phù hợp' }, { name: 'Cursor' }, { name: 'Windsurf' }, { name: 'JetBrains IDE' }, { name: 'Antigravity IDE' }, { name: 'AI Coding Agents khác' }],
    directions: [{ title: 'Liên kết workspace', description: 'Gắn nhiệm vụ với đúng project và môi trường.' }, { title: 'Điều phối lập trình', description: 'Phân công và theo dõi nhiệm vụ coding.' }, { title: 'Kết quả & thay đổi file', description: 'Theo dõi test, code review và trạng thái thay đổi.' }, { title: 'Agent handoff', description: 'Chuyển giao công việc giữa các agent có ngữ cảnh.' }],
  },
  {
    id: 'api-local', label: 'API, Local AI & MCP', title: 'Mở rộng phương thức tích hợp, không chỉ điều khiển giao diện.',
    intro: 'Tạo nền tảng cho workflow lai giữa dịch vụ đám mây, mô hình cục bộ và công cụ tương thích.', status: 'Tầm nhìn dài hạn',
    directions: [{ title: 'AI Provider API', description: 'Nghiên cứu kết nối API theo khả năng và chính sách từng nhà cung cấp.' }, { title: 'Local AI', description: 'Khảo sát Ollama, LM Studio và các runtime cục bộ phù hợp.' }, { title: 'MCP', description: 'Kết nối MCP và các công cụ tương thích.' }, { title: 'Remote Worker', description: 'Nghiên cứu worker bên ngoài máy hiện tại.' }, { title: 'Hybrid Workflow', description: 'Phối hợp Web, Desktop, CLI, IDE và API trong một luồng.' }],
  },
  {
    id: 'orchestration', label: 'Advanced Orchestration', title: 'Nâng cấp khả năng phối hợp nhiều AI.',
    intro: 'Các định hướng điều phối nâng cao; chưa phải danh sách tính năng đã phát hành.', status: 'Định hướng',
    directions: [{ title: 'Multi-Agent Workflow', description: 'Nhiều agent phối hợp theo vai trò và thứ tự rõ ràng.' }, { title: 'Parallel Execution', description: 'Thực hiện các nhiệm vụ độc lập song song khi an toàn.' }, { title: 'Smart Routing', description: 'Chọn Manager hoặc worker phù hợp với từng nhiệm vụ.' }, { title: 'Workflow Builder', description: 'Xây dựng quy trình điều phối có thể tái sử dụng.' }, { title: 'Project & Context Management', description: 'Quản lý ngữ cảnh theo dự án và phiên.' }, { title: 'Scheduling & Automation', description: 'Lập lịch và tự động hóa các luồng đã được kiểm soát.' }, { title: 'Full Autonomous', description: 'Tầm nhìn dài hạn; chưa phải tính năng đã phát hành.' }, { title: 'Plugin & Adapter Ecosystem', description: 'Mở rộng tích hợp qua plugin và adapter độc lập.' }],
  },
]
