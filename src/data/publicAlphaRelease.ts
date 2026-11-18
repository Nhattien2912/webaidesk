export interface PublicAlphaRelease {
  product: 'AI Desk'
  version: string
  channel: 'Public Alpha'
  platform: 'Windows x64'
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
 * Product copy from the reviewed desktop release metadata. Artifact identity and availability are
 * deliberately absent: the live, validated /api/releases/latest manifest is their only source.
 */
export const publicAlphaRelease: PublicAlphaRelease = {
  product: 'AI Desk',
  version: '0.5.0-beta.2',
  channel: 'Public Alpha',
  platform: 'Windows x64',
  // AI Desk release commit "release: 0.5.0-beta.2 — version bump (feed-only OTA, bug report V1, ownership fix)".
  metadataCommit: 'e3595ed7dc32e12ceb9ec76d7664049c3b29800d',
  sourceCommit: 'e3595ed7dc32e12ceb9ec76d7664049c3b29800d',
  supportedFeatures: [
    'Điều phối thủ công và có hỗ trợ cho các worker desktop tương thích.',
    'Antigravity Native V2: tự động gửi, nhận và trả kết quả về GPT Manager (requestId AUTO, 1 action mỗi tin nhắn).',
    'GPT Web Bridge cho một cuộc trò chuyện ChatGPT được liên kết rõ ràng.',
    'Kiểm tra toàn vẹn native helper theo nguyên tắc fail-closed.',
    'Quy trình cài đặt theo người dùng, không yêu cầu quyền Administrator.',
    'Tự cập nhật từ 0.5.0-beta.2: tự kiểm tra, tải bản mới đã ký (Ed25519 + SHA-512) và hỏi trước khi cài.',
    'Nút "Gửi báo lỗi": xem trước toàn bộ nội dung (đã che token, prompt) rồi mới gửi, nhận mã BR-XXXXXX.',
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
    'Tải bộ cài AI-Desk-Setup-0.5.0-beta.2.exe từ trang Download và đối chiếu SHA-256 trước khi chạy; bộ cài chưa được ký số.',
    'Chạy bộ cài cho tài khoản hiện tại (không cần Administrator); dừng lại nếu SHA-256 lệch hoặc phần mềm bảo mật phát hiện mối đe dọa.',
    'Tải AI-Desk-Extension-0.5.0-beta.2.zip, đối chiếu SHA-256, giải nén rồi trong brave://extensions bật Developer mode → Load unpacked → chọn thư mục AI-Desk-Extension.',
    'Nếu AI Desk yêu cầu, bấm Repair GPT Bridge trong AI Desk, rồi tải lại (F5) tab ChatGPT.',
    'Liên kết đúng cuộc trò chuyện GPT Manager và cửa sổ worker trước khi dùng luồng Assisted.',
  ],
  releaseNotes: [
    '0.5.0 Beta: Antigravity Native V2 tự động gửi, nhận và trả kết quả về GPT; requestId AUTO; mỗi tin nhắn chỉ 1 action.',
    'Trả kết quả dài an toàn hơn: header xác thực, chờ ổn định 2 giây, chờ GPT rảnh trước khi gửi, câu trả lời dài được gửi inline.',
    'Nút “Gửi tiếp phần còn lại” và “Đóng N flow cũ & đổi phiên”, có ghi nhật ký kiểm tra (audit) cho Owner.',
    'Channel Governor, Connection Supervisor và chế độ giữ máy thức (keep-awake) khi đang chạy flow.',
    'Bản Beta nội bộ chưa ký số: Windows SmartScreen hoặc phần mềm diệt virus có thể cảnh báo; luôn đối chiếu SHA-256, không tắt bảo vệ.',
    'Tệp tải phải khớp tên tệp, dung lượng và SHA-256 đã công bố; chưa có bảo chứng Authenticode.',
    'Thiết lập không an toàn đã lưu trước đó không thể bật lại tính năng Autonomous trong profile Public Alpha.',
    'Source maps, compiler source và công cụ debug không thuộc gói phát hành; WinHelper và GPT Bridge host là binary dựng sẵn được ghim SHA-256.',
  ],
  knownLimitations: [
    'WinHelper và GPT Bridge host được đóng gói dạng binary ghim SHA-256 nhưng chưa ký số; đánh giá bảo mật chưa hoàn tất.',
    'Cài đặt, nâng cấp và gỡ cài đặt chưa được kiểm thử trên máy sạch.',
    'GPT Bridge native host hiện chưa có chữ ký phát hành công khai.',
    'Bộ cài 0.5.0 Beta chưa được ký số Authenticode hoặc chứng nhận bảo mật độc lập. Từ 0.5.0-beta.2, tự cập nhật chỉ cài bản mới có chữ ký phát hành Ed25519 khớp SHA-512; người đang dùng 0.5.0-beta.1 cần cài tay beta.2 một lần.',
    'Extension Chrome/Brave được tải riêng (.zip) và cần bước Load unpacked thủ công trong giai đoạn Beta.',
  ],
}
