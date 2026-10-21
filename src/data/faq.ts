export interface FaqEntry {
  id: string
  question: string
  paragraphs: string[]
  links?: Array<{ text: string; href: string }>
}

// Approved homepage FAQ copy, 19/10/2026. Keep paragraph text and links together.
export const FAQS: FaqEntry[] = [
  {
    id: 'about',
    question: 'AI Desk là gì?',
    paragraphs: [
      'AI Desk là ứng dụng Windows giúp kết nối và điều phối các công cụ AI trong cùng một quy trình làm việc.',
      'Ở phiên bản hiện tại, ChatGPT Web đóng vai trò GPT Manager để phân tích và giao nhiệm vụ. AI Desk tiếp nhận yêu cầu thông qua GPT Bridge, chuyển đến worker như Codex hoặc Claude Code và hỗ trợ đưa kết quả trở lại để đánh giá.',
      'AI Desk không phải một mô hình AI riêng và không thay thế những dịch vụ AI đang được sử dụng.',
    ],
  },
  {
    id: 'account',
    question: 'Tôi có cần tài khoản để sử dụng AI Desk không?',
    paragraphs: [
      'Hiện tại, bạn không cần tạo tài khoản AI Desk để sử dụng bản Beta.',
      'Tuy nhiên, bạn vẫn cần tài khoản và quyền truy cập hợp lệ vào những dịch vụ AI muốn kết nối, chẳng hạn ChatGPT, Codex hoặc Claude Code.',
      'Giới hạn sử dụng và chính sách của từng dịch vụ vẫn do nhà cung cấp quyết định.',
    ],
  },
  {
    id: 'cost',
    question: 'AI Desk có miễn phí không?',
    paragraphs: [
      'AI Desk hiện có bản Beta miễn phí dành cho Windows.',
      'Trong tương lai, dự án dự kiến phát triển AI Desk Pro với những khả năng nâng cao nhằm duy trì việc phát triển sản phẩm.',
      'Giá, quyền lợi và thời điểm phát hành Pro chưa được công bố chính thức.',
    ],
  },
  {
    id: 'download',
    question: 'Tôi có thể tải AI Desk ở đâu?',
    paragraphs: [
      'AI Desk 0.3.0 Beta là phiên bản công khai duy nhất, dành cho Windows 10/11 x64.',
      'Trang Tải về cung cấp đúng một gói RAR cùng tên tệp, dung lượng và mã SHA-256 để kiểm tra trước khi giải nén.',
      'Lưu ý: gói RAR và executable bên trong chưa được ký số hoặc chứng nhận bảo mật độc lập. Hãy đọc kỹ cảnh báo trước khi sử dụng.',
    ],
    links: [{ text: 'Tải về', href: '/download' }],
  },
  {
    id: 'setup',
    question: 'Thiết lập AI Desk gồm những bước nào?',
    paragraphs: [
      'Để bắt đầu, bạn cần tải AI Desk cho Windows, đọc hướng dẫn cài đặt, thiết lập GPT Bridge, kết nối cuộc trò chuyện ChatGPT Web làm GPT Manager và cấu hình worker phù hợp trên máy tính.',
      'Bạn có thể tham khảo trang Hướng dẫn cài đặt và Prompt Library đã có trên website.',
    ],
    links: [{ text: 'Hướng dẫn cài đặt', href: '/install' }, { text: 'Prompt Library', href: '/prompts' }],
  },
  {
    id: 'platforms',
    question: 'AI Desk hỗ trợ những hệ điều hành nào?',
    paragraphs: [
      'Phiên bản tải xuống hiện tại dành cho Windows 10/11, 64-bit.',
      'Các môi trường khác như macOS hoặc Linux chưa có bản phát hành được xác nhận.',
      'AI Desk đang định hướng mở rộng các hình thức tích hợp Web, Desktop, CLI, IDE, API và Local AI. Điều này không đồng nghĩa đã có bản ứng dụng chính thức cho các hệ điều hành khác.',
    ],
  },
  {
    id: 'privacy',
    question: 'Dữ liệu của tôi được xử lý như thế nào?',
    paragraphs: [
      'AI Desk thực hiện các bước điều phối trên máy tính của người dùng theo cấu hình và quyền được cấp.',
      'Khi bạn sử dụng ChatGPT hoặc những AI worker khác, nội dung được cung cấp cho các dịch vụ đó vẫn chịu sự điều chỉnh của chính sách riêng của từng nhà cung cấp.',
      'Để biết phạm vi xử lý, lưu trữ, quyền truy cập và các kết nối liên quan, vui lòng xem Chính sách quyền riêng tư.',
    ],
    links: [{ text: 'Chính sách quyền riêng tư', href: '/privacy' }],
  },
  {
    id: 'permissions',
    question: 'AI Desk có tự ý sửa mã nguồn hoặc thực hiện hành động trên máy tôi không?',
    paragraphs: [
      'AI Desk đóng vai trò kết nối và điều phối. Những thay đổi đối với mã nguồn hoặc dự án được thực hiện bởi worker tương ứng trong phạm vi quyền mà worker và người dùng đã cấp.',
      'Tùy chế độ hoạt động, một số hành động có thể cần được người dùng xác nhận, trong khi những thao tác khác có thể được thực hiện theo cấu hình và quyền đã cho phép.',
      'Người dùng nên kiểm tra các thay đổi bằng Git và xem xét kỹ quyền truy cập trước khi thực hiện nhiệm vụ quan trọng.',
    ],
  },
  {
    id: 'independence',
    question: 'AI Desk có liên kết chính thức với OpenAI, Anthropic, Google hoặc Microsoft không?',
    paragraphs: [
      'Không.',
      'AI Desk là dự án phần mềm độc lập, không phải sản phẩm hay đối tác chính thức của các nhà cung cấp AI nêu trên.',
      'Các tên thương hiệu, ứng dụng và dịch vụ thuộc về chủ sở hữu tương ứng.',
    ],
  },
]

export function normalizeFaqSearch(value: string): string {
  return value.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').trim()
}

export function searchFaqs(query: string): FaqEntry[] {
  const tokens = normalizeFaqSearch(query).split(/\s+/).filter(Boolean)
  if (!tokens.length) return FAQS
  return FAQS.filter((faq) => {
    const text = normalizeFaqSearch(`${faq.question} ${faq.paragraphs.join(' ')}`)
    return tokens.every((token) => text.includes(token))
  })
}
