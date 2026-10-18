// Video tutorial data. All fields must use real, verified data.
// youtubeId: Only fill in when a real YouTube video exists. Leave empty string otherwise.
// thumbnail: Auto-generated from YouTube when youtubeId is set. Leave empty string to use placeholder.
// duration: Format "MM:SS". Leave empty string if unknown.
// status: 'published' | 'coming-soon' | 'draft'
//
// Rule: Never invent youtubeId values. Empty youtubeId = coming soon card.

export type VideoStatus = 'published' | 'coming-soon' | 'draft'

export interface VideoCategory {
  id: string
  label: string
}

export interface TutorialVideo {
  id: string
  title: string
  description: string
  category: string
  youtubeId: string
  thumbnail: string
  duration: string
  publishedAt: string
  status: VideoStatus
}

export const videoCategories: VideoCategory[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'intro', label: 'Giới thiệu' },
  { id: 'setup', label: 'Cài đặt' },
  { id: 'workers', label: 'Workers' },
  { id: 'workflow', label: 'Quy trình' },
  { id: 'troubleshooting', label: 'Khắc phục lỗi' },
]

export const tutorialVideos: TutorialVideo[] = [
  {
    id: 'intro-ai-desk',
    title: 'Giới thiệu AI Desk',
    description: 'Tổng quan về AI Desk: AI Desk là gì, giải quyết vấn đề gì và hoạt động như thế nào trong thực tế.',
    category: 'intro',
    youtubeId: '',
    thumbnail: '',
    duration: '',
    publishedAt: '',
    status: 'coming-soon',
  },
  {
    id: 'installation-guide',
    title: 'Hướng dẫn cài đặt AI Desk',
    description: 'Từng bước cài đặt AI Desk trên Windows: tải file, cài đặt, xác minh và khởi động lần đầu.',
    category: 'setup',
    youtubeId: '',
    thumbnail: '',
    duration: '',
    publishedAt: '',
    status: 'coming-soon',
  },
  {
    id: 'gpt-web-extension-setup',
    title: 'Thiết lập GPT Web và Extension',
    description: 'Cài GPT Bridge Extension, kết nối với ChatGPT Web và kiểm tra trạng thái kết nối lần đầu.',
    category: 'setup',
    youtubeId: '',
    thumbnail: '',
    duration: '',
    publishedAt: '',
    status: 'coming-soon',
  },
  {
    id: 'gpt-manager-usage',
    title: 'Sử dụng GPT Manager',
    description: 'Cách nạp prompt GPT Manager vào ChatGPT, phân tích nhiệm vụ và giao việc cho worker.',
    category: 'workflow',
    youtubeId: '',
    thumbnail: '',
    duration: '',
    publishedAt: '',
    status: 'coming-soon',
  },
  {
    id: 'connect-codex',
    title: 'Kết nối Codex',
    description: 'Thiết lập worker Codex trong AI Desk: gán phiên, kiểm tra quota và thực hiện nhiệm vụ đầu tiên.',
    category: 'workers',
    youtubeId: '',
    thumbnail: '',
    duration: '',
    publishedAt: '',
    status: 'coming-soon',
  },
  {
    id: 'connect-claude',
    title: 'Kết nối Claude Code',
    description: 'Thiết lập worker Claude Code: cách gán phiên, xác minh kết nối và gửi yêu cầu đầu tiên.',
    category: 'workers',
    youtubeId: '',
    thumbnail: '',
    duration: '',
    publishedAt: '',
    status: 'coming-soon',
  },
  {
    id: 'demo-real-workflow',
    title: 'Demo quy trình thực tế',
    description: 'Xem AI Desk trong thực tế: từ mô tả nhiệm vụ, phân công worker đến thu kết quả và nghiệm thu.',
    category: 'workflow',
    youtubeId: '',
    thumbnail: '',
    duration: '',
    publishedAt: '',
    status: 'coming-soon',
  },
  {
    id: 'troubleshooting-faq',
    title: 'Khắc phục lỗi và FAQ',
    description: 'Xử lý các vấn đề thường gặp: extension không kết nối, worker không phản hồi, sai phiên chat.',
    category: 'troubleshooting',
    youtubeId: '',
    thumbnail: '',
    duration: '',
    publishedAt: '',
    status: 'coming-soon',
  },
]
