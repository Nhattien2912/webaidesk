// Roadmap content. Edit here, not in the component.
// Rule: an item may only sit in "released" when it ships in a build users can actually get.
// Today the only build is the internal Private Alpha RC1 (AI-Desk commit c71a6c4, one tester,
// unsigned), so "released" is explicitly scoped to that build and nothing is publicly released.

export type RoadmapStage = 'released' | 'in-progress' | 'planned'

export interface RoadmapItem {
  title: string
  detail: string
}

export interface RoadmapColumn {
  stage: RoadmapStage
  title: string
  note: string
  items: RoadmapItem[]
}

export const roadmap: RoadmapColumn[] = [
  {
    stage: 'released',
    title: 'Đã triển khai nội bộ',
    note: 'Có trong bản Private Alpha RC1 nội bộ (14/10/2026). Chưa có bản công khai.',
    items: [
      {
        title: 'GPT Manager qua ChatGPT web',
        detail: 'Extension đồng hành và GPT Bridge nhận lệnh từ cuộc trò chuyện đã liên kết.',
      },
      {
        title: 'Worker Codex và Claude Code',
        detail: 'AI Desk chuyển yêu cầu vào cửa sổ worker trên máy và thu kết quả.',
      },
      {
        title: 'Theo dõi hạn mức worker',
        detail: 'Xem quota của các worker được hỗ trợ ngay trong ứng dụng.',
      },
      {
        title: 'Control API cục bộ',
        detail: 'API chỉ lắng nghe trên 127.0.0.1, có token và phân quyền.',
      },
    ],
  },
  {
    stage: 'in-progress',
    title: 'Đang phát triển',
    note: 'Đã có mã nguồn nhưng chưa bật mặc định hoặc chưa kiểm chứng đầy đủ.',
    items: [
      {
        title: 'Result Store',
        detail: 'Lưu kết quả dài để GPT Manager đọc theo trang thay vì dán toàn bộ.',
      },
      {
        title: 'Tự động trả kết quả về GPT',
        detail: 'Bản RC1 vẫn cần sao chép lệnh thủ công trong một số bước.',
      },
      {
        title: 'Antigravity IDE và OpenCode',
        detail: 'Adapter đang thử nghiệm, chưa xếp vào nhóm hỗ trợ chính thức.',
      },
      {
        title: 'Nhiều phiên làm việc song song',
        detail: 'Đang chạy ở chế độ quan sát (shadow), chưa điều phối thật.',
      },
    ],
  },
  {
    stage: 'planned',
    title: 'Sắp tới',
    note: 'Kế hoạch, chưa có ngày phát hành.',
    items: [
      {
        title: 'Free Public Beta cho Windows',
        detail: 'Bộ cài có chữ ký số, checksum công khai, tải trực tiếp từ website.',
      },
      {
        title: 'Hướng dẫn cài đặt và thiết lập',
        detail: 'Tài liệu từng bước cho GPT Manager và các worker.',
      },
      {
        title: 'AI Desk Pro',
        detail: 'Phiên bản trả phí ra mắt sau Public Beta. Giá và thời điểm chưa chốt.',
      },
    ],
  },
]
