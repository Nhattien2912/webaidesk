// Changelog entries. Only builds and website changes that actually exist.

export interface ChangelogEntry {
  version: string
  date: string
  scope: 'desktop' | 'website'
  status: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: 'Website Stitch V4',
    date: '2026-10-15',
    scope: 'website',
    status: 'Chưa triển khai công khai',
    changes: [
      'Giao diện tối theo thiết kế Stitch V4; hình minh họa dựng theo giao diện thật của AI Desk (Desk, Monitor, Phiên).',
      'Định hướng Free Public Beta trước, AI Desk Pro sau.',
      'Khu vực tải về đọc thông tin từ release manifest; tự khóa khi chưa có bản được duyệt.',
      'Thêm trang Quyền riêng tư, Điều khoản và Changelog (bản nháp, cần duyệt).',
      'Form nhận tin AI Desk Pro gửi tới API thật; không báo thành công khi chưa lưu được.',
    ],
  },
  {
    version: 'Desktop 0.1.0 Private Alpha RC1',
    date: '2026-10-14',
    scope: 'desktop',
    status: 'Nội bộ, một người thử nghiệm, chưa ký số — không phát hành công khai',
    changes: [
      'Bộ cài NSIS và bản portable cho Windows x64.',
      'GPT Bridge Extension đi kèm cho ChatGPT web.',
      'Hạn chế đã biết: việc chuyển lệnh GPT → AI Desk chưa tự động hoàn toàn, cần sao chép thủ công.',
    ],
  },
]
