export type PublicAlphaAvailability = 'coming-soon' | 'available'

export interface PublicAlphaRelease {
  product: 'AI Desk'
  version: string
  channel: 'Public Alpha'
  platform: 'Windows x64'
  availability: PublicAlphaAvailability
  approved: boolean
  signed: boolean
  downloadUrl: string | null
  sha256: string | null
  metadataCommit: string
  sourceCommit: string
  supportedFeatures: readonly string[]
  unavailableFeatures: readonly string[]
  requirements: readonly string[]
  onboardingSteps: readonly string[]
  releaseNotes: readonly string[]
  knownLimitations: readonly string[]
}

/**
 * Public website projection of the reviewed desktop release metadata at website implementation
 * time. Artifact fields stay null until a signed, hash-verified installer is explicitly approved.
 */
export const publicAlphaRelease: PublicAlphaRelease = {
  product: 'AI Desk',
  version: '0.2.0',
  channel: 'Public Alpha',
  platform: 'Windows x64',
  availability: 'coming-soon',
  approved: false,
  signed: false,
  downloadUrl: null,
  sha256: null,
  metadataCommit: '39a0b38f151b919f2e40ec04a157830ea5a8a716',
  sourceCommit: 'cef17b1cadf91eef9c60c8505ad7165eb8c02ff2',
  supportedFeatures: [
    'Điều phối thủ công và có hỗ trợ cho các worker desktop tương thích.',
    'GPT Web Bridge cho một cuộc trò chuyện ChatGPT được liên kết rõ ràng.',
    'Kiểm tra toàn vẹn native helper theo nguyên tắc fail-closed.',
    'Quy trình cài đặt theo người dùng, không yêu cầu quyền Administrator.',
  ],
  unavailableFeatures: [
    'Full Autonomous và các vòng nhiệm vụ không có người giám sát.',
    'Control API, điều khiển chỉ qua MCP và tunnel tự động.',
    'Tự động gửi lại khi trạng thái gửi GPT không chắc chắn hoặc bị giới hạn hoạt động.',
    'Tự động cập nhật hoặc mở rộng quyền điều khiển từ xa.',
  ],
  requirements: [
    'Windows 10 hoặc Windows 11, bản 64-bit.',
    'Chrome hoặc Brave phiên bản hiện hành để dùng GPT Web Bridge.',
    'Tài khoản ChatGPT và ít nhất một worker được hỗ trợ như Codex hoặc Claude Code.',
    'Quyền cài ứng dụng cho tài khoản Windows hiện tại; không cần quyền Administrator.',
  ],
  onboardingSteps: [
    'Tải bộ cài đã ký từ trang này sau khi trạng thái chuyển sang Sẵn sàng.',
    'Đối chiếu chữ ký số và SHA-256 được công bố trước khi chạy tệp.',
    'Cài AI Desk theo người dùng và mở ứng dụng lần đầu.',
    'Chạy thiết lập GPT Bridge trong AI Desk, rồi Load unpacked thư mục extension trong Chrome hoặc Brave.',
    'Liên kết đúng cuộc trò chuyện GPT Manager và cửa sổ worker trước khi dùng luồng Assisted.',
  ],
  releaseNotes: [
    'Public Alpha tập trung vào luồng Manual/Assisted trên Windows.',
    'Các helper đóng gói phải khớp hash đã ghim và nhà phát hành Authenticode được duyệt.',
    'Thiết lập không an toàn đã lưu trước đó không thể bật lại tính năng Autonomous trong profile Public Alpha.',
    'Tunnel client, source maps, compiler source và công cụ debug không thuộc gói phát hành.',
  ],
  knownLimitations: [
    'WinHelper đang chờ hoàn tất đánh giá bảo mật; chưa có binary được phép đóng gói.',
    'GPT Bridge native host hiện chưa có chữ ký phát hành công khai.',
    'Bản cài Windows và kiểm thử E2E đóng gói chưa hoàn tất.',
    'Extension Chrome/Brave cần bước Load unpacked thủ công trong giai đoạn Alpha.',
  ],
}

export function publicDownloadIsOpen(release: PublicAlphaRelease): boolean {
  return (
    release.availability === 'available' &&
    release.approved === true &&
    release.signed === true &&
    typeof release.downloadUrl === 'string' &&
    /^https:\/\/webaidesk\.pages\.dev\/api\/download\/[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.exe$/.test(release.downloadUrl) &&
    typeof release.sha256 === 'string' &&
    /^[a-f0-9]{64}$/i.test(release.sha256)
  )
}
