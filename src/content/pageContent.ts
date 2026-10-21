// Editable editorial content for /install, /prompts and /tutorials.
//
// This registry is the single source of truth for:
//   1. the DEFAULT content (exactly what the pages displayed before the CMS migration — also the permanent public fallback),
//   2. the Studio editing forms (labels, field types, limits),
//   3. the server-side validation of CMS documents (which keys exist, value shapes, URL/media rules).
//
// Only editorial text lives here. Layout, icons, colours, behaviour, links to /download and every security rule stay in the page components.

import { FAQS } from '../data/faq.ts'
import { changelog as CHANGELOG } from '../data/changelog.ts'

export type PageId = 'install' | 'prompts' | 'tutorials' | 'faq' | 'changelog'
export const PAGE_IDS: readonly PageId[] = ['install', 'prompts', 'tutorials', 'faq', 'changelog']

export type SubFieldType = 'text' | 'longtext' | 'lines' | 'select' | 'url' | 'youtube' | 'date' | 'duration' | 'media' | 'code' | 'links'
export interface SubField {
  key: string
  label: string
  type: SubFieldType
  max: number
  options?: Array<{ value: string; label: string }>
  help?: string
}

export type Field =
  | { key: string; label: string; type: 'text'; default: string; max: number; multiline?: boolean; help?: string }
  | { key: string; label: string; type: 'code'; default: string; max: number; help?: string }
  | { key: string; label: string; type: 'markdown'; default: string; max: number; help?: string }
  | { key: string; label: string; type: 'list'; default: string[]; maxItems: number; itemMax: number; itemLabel: string; help?: string }
  | { key: string; label: string; type: 'items'; default: Array<Record<string, string>>; maxItems: number; itemLabel: string; titleKey: string; fields: SubField[]; help?: string }

export interface Section {
  id: string
  label: string
  /** When set, the whole block can be hidden by the editor (stored in `hidden`). The id is also used as the page anchor/section id. */
  hideId?: string
  fields: Field[]
}

export interface PageDef {
  id: PageId
  label: string
  path: string
  title: string
  description: string
  sections: Section[]
}

export type Value = string | string[] | Array<Record<string, string>>
/** A page document: partial overrides over the defaults, plus ids of hidden blocks. */
export interface PageDoc {
  values: Record<string, Value>
  hidden: string[]
}
export const EMPTY_DOC: PageDoc = { values: {}, hidden: [] }

const T = (key: string, label: string, def: string, max = 300, multiline = false): Field => ({ key, label, type: 'text', default: def, max, multiline })
const L = (key: string, label: string, def: string[], itemLabel: string, maxItems = 12, itemMax = 500): Field => ({ key, label, type: 'list', default: def, maxItems, itemMax, itemLabel })
const X = (key: string, label: string): Field => ({ key, label, type: 'markdown', default: '', max: 20000, help: 'Tùy chọn. Hiển thị cuối mục này; hỗ trợ Markdown an toàn, ảnh và khối mã. Để trống nếu không cần.' })

const TONES: SubField['options'] = [
  { value: 'emerald', label: 'Xanh lá (sẵn sàng)' },
  { value: 'amber', label: 'Vàng (thử nghiệm)' },
  { value: 'accent', label: 'Xanh dương (nhấn mạnh)' },
  { value: 'red', label: 'Đỏ (cảnh báo)' },
]

const installSteps = (): Section[] => [
  {
    id: 's1', label: 'Bước 1 — Chuẩn bị', hideId: 'step-1',
    fields: [
      T('s1.title', 'Tiêu đề bước', 'Chuẩn bị', 120),
      T('s1.subtitle', 'Phụ đề', 'Những thứ cần có trước khi bắt đầu', 200),
      T('s1.reqTitle', 'Tiêu đề danh sách yêu cầu', 'Yêu cầu hệ thống', 120),
      L('s1.reqs', 'Yêu cầu hệ thống', ['Windows 10 (64-bit) trở lên', 'Trình duyệt Chrome hoặc Brave (để dùng GPT Bridge Extension)', 'Kết nối internet ổn định', 'Đủ RAM để chạy AI Desk Desktop cùng các ứng dụng AI worker'], 'Yêu cầu', 12, 300),
      T('s1.appsTitle', 'Tiêu đề ứng dụng AI', 'Ứng dụng AI cần có', 120),
      T('s1.appsIntro', 'Đoạn giới thiệu ứng dụng AI', 'AI Desk điều phối các ứng dụng AI đã cài sẵn trên máy. Bạn cần ít nhất một trong những ứng dụng sau:', 400, true),
      {
        key: 's1.apps', label: 'Thẻ ứng dụng AI', type: 'items', maxItems: 8, itemLabel: 'Ứng dụng', titleKey: 'name',
        default: [
          { name: 'Codex (GitHub Copilot / VS Code)', status: 'Hỗ trợ trong RC1', tone: 'emerald' },
          { name: 'Claude Code (Anthropic)', status: 'Hỗ trợ trong RC1', tone: 'emerald' },
          { name: 'Antigravity IDE', status: 'Đang thử nghiệm', tone: 'amber' },
          { name: 'ChatGPT Web (Manager)', status: 'Bắt buộc', tone: 'accent' },
        ],
        fields: [{ key: 'name', label: 'Tên ứng dụng', type: 'text', max: 120 }, { key: 'status', label: 'Trạng thái', type: 'text', max: 80 }, { key: 'tone', label: 'Màu trạng thái', type: 'select', max: 20, options: TONES }],
      },
      T('s1.bridgeTitle', 'Tiêu đề điều kiện GPT Bridge', 'Điều kiện sử dụng GPT Bridge', 120),
      L('s1.bridgeReqs', 'Điều kiện GPT Bridge', ['Tài khoản ChatGPT (miễn phí hoặc Plus)', 'Trình duyệt Chrome hoặc Brave phiên bản mới nhất', 'Cho phép extension có quyền đọc trang ChatGPT Web'], 'Điều kiện', 12, 300),
      X('s1.extra', 'Nội dung bổ sung'),
    ],
  },
  {
    id: 's2', label: 'Bước 2 — Tải AI Desk', hideId: 'step-2',
    fields: [
      T('s2.title', 'Tiêu đề bước', 'Tải AI Desk', 120),
      T('s2.subtitle', 'Phụ đề', 'Lấy bản cài đặt từ kênh chính thức', 200),
      T('s2.intro', 'Đoạn mở đầu', 'AI Desk được phân phối qua trang web chính thức. Không tải từ nguồn khác để đảm bảo bảo mật.', 400, true),
      T('s2.warnLead', 'Cảnh báo — phần in đậm', 'Gói hiện tại chưa ký số.', 120),
      T('s2.warnText', 'Cảnh báo — nội dung', 'Chỉ dùng liên kết trên trang Download, đối chiếu đúng tên tệp, dung lượng và SHA-256 được công bố. Không tắt antivirus hoặc bỏ qua cảnh báo để ép chạy tệp.', 500, true),
      T('s2.pkgTitle', 'Thẻ gói — tiêu đề', 'Gói đang được công bố', 120),
      T('s2.pkgBadge', 'Thẻ gói — nhãn phiên bản', '0.3.0 Beta', 40),
      T('s2.pkgName', 'Thẻ gói — tên gói', 'Gói Windows x64 (.rar)', 120),
      T('s2.pkgDesc', 'Thẻ gói — mô tả', 'Đây là gói RAR chưa ký số. Danh tính tệp, dung lượng và SHA-256 được hiển thị trên trang Download để người dùng tự đối chiếu.', 500, true),
      T('s2.button', 'Nhãn nút (liên kết tới /download cố định)', 'Đến trang tải xuống', 80),
      X('s2.extra', 'Nội dung bổ sung'),
    ],
  },
  {
    id: 's3', label: 'Bước 3 — Cài AI Desk Desktop', hideId: 'step-3',
    fields: [
      T('s3.title', 'Tiêu đề bước', 'Cài AI Desk Desktop', 120),
      T('s3.subtitle', 'Phụ đề', 'Xác minh gói hiện có trước khi mở', 200),
      T('s3.info', 'Ghi chú thông tin', 'Website mới chỉ xác minh danh tính gói tải 0.3.0 Beta ở mức tên tệp, dung lượng và SHA-256. Quy trình bên trong gói RAR chưa được xác minh độc lập trong task này.', 500, true),
      T('s3.listTitle', 'Tiêu đề danh sách bước', 'Gói 0.3.0 Beta cho Windows x64 (.rar)', 160),
      L('s3.steps', 'Các bước', ['Tải gói .rar bằng nút duy nhất trên trang /download.', 'Đối chiếu tên tệp, dung lượng và SHA-256 với giá trị công bố trên trang đó.', 'Quét tệp bằng Windows Security hoặc công cụ bảo mật bạn tin cậy.', 'Chỉ giải nén sau khi các bước xác minh hoàn tất; nếu có cảnh báo hoặc hash lệch, hãy dừng lại.'], 'Bước', 12, 400),
      T('s3.warn', 'Cảnh báo vàng', 'Tên executable, hành vi installer và các bước sau khi giải nén chưa được xác minh từ artifact trong task này. Trang này không đoán các bước đó.', 500, true),
      T('s3.dangerLead', 'Cảnh báo đỏ — phần in đậm', 'Quan trọng về bảo mật:', 120),
      T('s3.danger', 'Cảnh báo đỏ — nội dung', 'Không tắt Windows Defender, không thêm ngoại lệ và không bỏ qua SmartScreen chỉ để chạy AI Desk. Gói hiện tại chưa ký số.', 500, true),
      X('s3.extra', 'Nội dung bổ sung'),
    ],
  },
  {
    id: 's4', label: 'Bước 4 — GPT Bridge Extension', hideId: 'step-4',
    fields: [
      T('s4.title', 'Tiêu đề bước', 'Cài GPT Bridge Extension', 120),
      T('s4.subtitle', 'Phụ đề', 'Kết nối ChatGPT Web với AI Desk Desktop', 200),
      T('s4.intro', 'Đoạn mở đầu', 'GPT Bridge Extension cho phép ChatGPT Web gửi và nhận tín hiệu từ AI Desk Desktop. Đây là cầu nối quan trọng trong hệ thống.', 500, true),
      T('s4.warn', 'Cảnh báo vàng', 'Extension chưa có trên Chrome Web Store công khai. Bản phân phối đi kèm với AI Desk Desktop khi được phát hành. Không cài extension từ nguồn không chính thức.', 500, true),
      T('s4.listTitle', 'Tiêu đề danh sách bước', 'Cài thủ công (Developer Mode)', 160),
      T('s4.listIntro', 'Đoạn trước danh sách bước', 'Trong giai đoạn Alpha/Beta, extension được cài qua chế độ Developer của trình duyệt:', 400, true),
      L('s4.steps', 'Các bước', ['Mở Chrome hoặc Brave. Vào địa chỉ: chrome://extensions/', 'Bật chế độ "Developer mode" ở góc trên phải.', 'Nhấn "Load unpacked" và chọn thư mục extension đi kèm AI Desk.', 'Extension sẽ xuất hiện trong danh sách. Xác nhận icon extension hiện trên thanh công cụ.', 'Ghim extension để dễ kiểm tra trạng thái kết nối.'], 'Bước', 12, 400),
      X('s4.extra', 'Nội dung bổ sung'),
    ],
  },
  {
    id: 's5', label: 'Bước 5 — Kết nối GPT Web', hideId: 'step-5',
    fields: [
      T('s5.title', 'Tiêu đề bước', 'Kết nối GPT Web', 120),
      T('s5.subtitle', 'Phụ đề', 'Kiểm tra GPT Bridge đang hoạt động', 200),
      T('s5.intro', 'Đoạn mở đầu', 'GPT Bridge là kênh giao tiếp giữa ChatGPT Web và AI Desk Desktop. Sau khi cài extension, cần xác nhận kết nối đang hoạt động.', 500, true),
      T('s5.cardTitle', 'Tiêu đề thẻ trạng thái', 'Các trạng thái kết nối', 120),
      {
        key: 's5.states', label: 'Trạng thái kết nối', type: 'items', maxItems: 8, itemLabel: 'Trạng thái', titleKey: 'state',
        default: [
          { state: '🟢 Đã kết nối', desc: 'Extension đang giao tiếp được với AI Desk Desktop. Sẵn sàng nhận nhiệm vụ.', tone: 'emerald' },
          { state: '🟡 Đang kết nối', desc: 'Extension đang cố gắng kết nối. Chờ vài giây hoặc thử refresh trang.', tone: 'amber' },
          { state: '🔴 Mất kết nối', desc: 'AI Desk Desktop không chạy hoặc extension bị tắt. Kiểm tra lại AI Desk Desktop.', tone: 'red' },
        ],
        fields: [{ key: 'state', label: 'Tên trạng thái', type: 'text', max: 80 }, { key: 'desc', label: 'Mô tả', type: 'longtext', max: 400 }, { key: 'tone', label: 'Màu', type: 'select', max: 20, options: TONES }],
      },
      T('s5.listTitle', 'Tiêu đề danh sách bước', 'Kiểm tra kết nối', 160),
      L('s5.steps', 'Các bước', ['Đảm bảo AI Desk Desktop đang chạy (icon trong system tray).', 'Mở ChatGPT Web trong Chrome/Brave.', 'Nhìn vào icon extension trên thanh công cụ — màu xanh là đã kết nối.', 'Thử hover vào icon để xem trạng thái chi tiết.'], 'Bước', 12, 400),
      X('s5.extra', 'Nội dung bổ sung'),
    ],
  },
  {
    id: 's6', label: 'Bước 6 — Thiết lập Worker', hideId: 'step-6',
    fields: [
      T('s6.title', 'Tiêu đề bước', 'Thiết lập Worker', 120),
      T('s6.subtitle', 'Phụ đề', 'Gán phiên cho từng AI worker', 200),
      T('s6.intro', 'Đoạn mở đầu', 'Mỗi worker cần được gán với một phiên cụ thể (cửa sổ ứng dụng đang mở). AI Desk sẽ kiểm tra phiên này trước mỗi lần giao việc.', 500, true),
      {
        key: 's6.workers', label: 'Các worker', type: 'items', maxItems: 8, itemLabel: 'Worker', titleKey: 'name',
        default: [
          { name: 'Codex', status: 'Hỗ trợ RC1', tone: 'emerald', steps: 'Mở ứng dụng Codex trên Windows.\nTrong AI Desk Desktop, vào mục Workers → Codex.\nNhấn "Gán phiên" và chọn cửa sổ Codex đang mở.\nXác nhận phiên đã được gán — trạng thái chuyển sang màu xanh.' },
          { name: 'Claude Code', status: 'Hỗ trợ RC1', tone: 'emerald', steps: 'Mở Claude Code trên Windows.\nTrong AI Desk Desktop, vào mục Workers → Claude Code.\nNhấn "Gán phiên" và chọn cửa sổ Claude Code đang mở.\nKiểm tra trạng thái kết nối.' },
          { name: 'Antigravity IDE', status: 'Đang thử nghiệm', tone: 'amber', steps: 'Adapter đang thử nghiệm. Theo dõi changelog để biết khi nào được hỗ trợ chính thức.' },
        ],
        fields: [{ key: 'name', label: 'Tên worker', type: 'text', max: 80 }, { key: 'status', label: 'Trạng thái', type: 'text', max: 80 }, { key: 'tone', label: 'Màu trạng thái', type: 'select', max: 20, options: TONES }, { key: 'steps', label: 'Các bước (mỗi dòng một bước)', type: 'lines', max: 2000 }],
      },
      X('s6.extra', 'Nội dung bổ sung'),
    ],
  },
  {
    id: 's7', label: 'Bước 7 — Nạp Prompt Manager', hideId: 'step-7',
    fields: [
      T('s7.title', 'Tiêu đề bước', 'Nạp Prompt Manager', 120),
      T('s7.subtitle', 'Phụ đề', 'Gửi prompt khởi tạo vào ChatGPT Web', 200),
      T('s7.intro', 'Đoạn mở đầu', 'Thư viện Prompt hiện chỉ công bố mẫu action có schema được đối chiếu với source. Đây không phải bộ quy tắc Manager hoàn chỉnh và chưa được xác minh với artifact 0.3.0 Beta.', 600, true),
      L('s7.steps', 'Các bước', ['Vào trang Thư viện Prompt và đọc phạm vi xác minh của từng mẫu.', 'Nhấn nút "Sao chép" trên mẫu muốn dùng.', 'Mở ChatGPT Web, bắt đầu cuộc trò chuyện mới.', 'Dán prompt vào ô nhập tin nhắn và gửi.', 'Kiểm tra JSON tạo ra trước khi để AI Desk tiếp nhận action.'], 'Bước', 12, 400),
      T('s7.info', 'Ghi chú thông tin', 'Không có prompt Resume Session hay protocol quản lý session nào được công bố ở đây khi chưa có nguồn xác minh tương ứng.', 500, true),
      T('s7.button', 'Nhãn nút (liên kết tới /prompts cố định)', 'Mở Thư viện Prompt', 80),
      X('s7.extra', 'Nội dung bổ sung'),
    ],
  },
  {
    id: 's8', label: 'Bước 8 — Tác vụ đầu tiên', hideId: 'step-8',
    fields: [
      T('s8.title', 'Tiêu đề bước', 'Chạy tác vụ đầu tiên', 120),
      T('s8.subtitle', 'Phụ đề', 'Kiểm tra toàn bộ hệ thống hoạt động', 200),
      T('s8.intro', 'Đoạn mở đầu', 'Sau khi đã thiết lập xong, thử một nhiệm vụ đơn giản để xác nhận mọi thứ kết nối đúng.', 400, true),
      T('s8.cardTitle', 'Thẻ ví dụ — tiêu đề', 'Ví dụ nhiệm vụ kiểm tra', 120),
      T('s8.cardIntro', 'Thẻ ví dụ — câu dẫn', 'Nói với GPT Manager (sau khi đã nạp prompt):', 300, true),
      { key: 's8.code', label: 'Thẻ ví dụ — nội dung khối mã', type: 'code', default: 'Hãy dùng Codex để viết một hàm Python tính giai thừa của một số nguyên dương.', max: 2000 },
      T('s8.listTitle', 'Tiêu đề danh sách bước', 'Vòng đời thực thi', 160),
      L('s8.steps', 'Các bước', ['GPT Manager nhận yêu cầu, tạo requestId và giao việc cho Codex.', 'AI Desk Desktop nhận lệnh từ GPT Bridge và chuyển vào cửa sổ Codex.', 'Codex thực hiện nhiệm vụ (viết code).', 'Kết quả được thu lại và gửi về ChatGPT Web.', 'GPT Manager hiển thị kết quả và hỏi bạn có muốn tiếp tục không.'], 'Bước', 12, 400),
      T('s8.info', 'Ghi chú thông tin', 'Trong giai đoạn Alpha, một số bước có thể cần sao chép thủ công giữa các cửa sổ. Đây là giới hạn đã biết — tự động hoàn toàn đang được phát triển.', 500, true),
      X('s8.extra', 'Nội dung bổ sung'),
    ],
  },
  {
    id: 's9', label: 'Bước 9 — Xử lý sự cố', hideId: 'step-9',
    fields: [
      T('s9.title', 'Tiêu đề bước', 'Xử lý sự cố', 120),
      T('s9.subtitle', 'Phụ đề', 'Giải pháp cho các vấn đề thường gặp', 200),
      {
        key: 's9.faqs', label: 'Câu hỏi xử lý sự cố', type: 'items', maxItems: 30, itemLabel: 'Câu hỏi', titleKey: 'q',
        default: [
          { q: 'Extension không kết nối với AI Desk Desktop', a: 'Kiểm tra AI Desk Desktop đang chạy (icon trong system tray). Đảm bảo extension được bật trong trình duyệt. Thử refresh trang ChatGPT Web và kiểm tra lại trạng thái extension.' },
          { q: 'Worker không phản hồi sau khi gửi yêu cầu', a: 'Kiểm tra cửa sổ worker (Codex/Claude Code) đang mở và ở đúng phiên đã gán. Xem tab Monitor trong AI Desk Desktop để biết yêu cầu đã được nhận chưa. Nếu worker đang bận, chờ thêm hoặc tắt và mở lại phiên worker.' },
          { q: 'Sai phiên chat — yêu cầu gửi vào cuộc trò chuyện khác', a: 'Đây là Session Binding đang hoạt động. AI Desk phát hiện phiên worker không khớp và dừng lại. Vào AI Desk Desktop, vào phần cài đặt Worker, chọn đúng phiên ChatGPT/Claude Code đang mở, sau đó thử lại.' },
          { q: 'Không nhận được kết quả từ worker', a: 'Kiểm tra Result Store trong AI Desk Desktop (tính năng đang phát triển). Trong giai đoạn Alpha, một số bước cần sao chép kết quả thủ công từ cửa sổ worker về ChatGPT Web.' },
          { q: 'Lỗi quyền truy cập hoặc antivirus chặn AI Desk', a: 'Không tắt antivirus và không thêm ngoại lệ chỉ để chạy ứng dụng. Dừng lại, đối chiếu SHA-256 với trang Download và chỉ tiếp tục sau khi bạn đã xác minh đúng tệp từ kênh chính thức.' },
          { q: 'Hết quota ChatGPT hoặc worker', a: 'Quota là giới hạn của nhà cung cấp dịch vụ, không phải AI Desk. Chờ quota reset hoặc nâng cấp plan của dịch vụ tương ứng. AI Desk không thể tăng quota cho bạn.' },
          { q: 'Lỗi tương thích sau khi Codex hoặc Claude cập nhật', a: 'AI Desk điều khiển giao diện ứng dụng. Khi app cập nhật UI, adapter cần cập nhật theo. Kiểm tra changelog của AI Desk để biết phiên bản nào tương thích với phiên bản worker bạn đang dùng.' },
        ],
        fields: [{ key: 'q', label: 'Câu hỏi', type: 'text', max: 200 }, { key: 'a', label: 'Câu trả lời', type: 'longtext', max: 1500 }],
      },
      T('s9.infoBefore', 'Ghi chú — đoạn trước liên kết 1', 'Không tìm thấy giải pháp? Xem', 200),
      T('s9.link1', 'Ghi chú — chữ liên kết 1 (tới /tutorials cố định)', 'video hướng dẫn', 80),
      T('s9.infoMid', 'Ghi chú — đoạn giữa', 'hoặc theo dõi', 120),
      T('s9.link2', 'Ghi chú — chữ liên kết 2 (tới /#community cố định)', 'kênh cộng đồng', 80),
      T('s9.infoAfter', 'Ghi chú — đoạn cuối', 'để được hỗ trợ.', 120),
      X('s9.extra', 'Nội dung bổ sung'),
    ],
  },
]

export const INSTALL_PAGE: PageDef = {
  id: 'install',
  label: 'Cài đặt',
  path: '/install',
  title: 'Hướng dẫn cài đặt AI Desk',
  description: 'Trang hướng dẫn cài đặt từng bước: tiêu đề, các bước, ghi chú, thẻ, khối mã và câu hỏi xử lý sự cố.',
  sections: [
    {
      id: 'hero', label: 'Đầu trang',
      fields: [
        T('hero.eyebrow', 'Nhãn nhỏ phía trên', 'Bắt đầu sử dụng', 80),
        T('hero.title', 'Tiêu đề trang', 'Hướng dẫn cài đặt AI Desk', 160),
        T('hero.intro', 'Đoạn giới thiệu', 'Hướng dẫn từng bước từ tải AI Desk đến thực hiện tác vụ đầu tiên với GPT Manager và worker. Không cần kiến thức lập trình.', 500, true),
        T('hero.notice', 'Thông báo vàng (gói tải hiện tại)', 'Hiện có gói RAR 0.3.0 Beta cho Windows x64, chưa ký số. Hãy đọc cảnh báo và đối chiếu SHA-256 trên trang Download trước khi mở tệp.', 500, true),
      ],
    },
    {
      id: 'toc', label: 'Mục lục (cột trái)',
      fields: [
        T('toc.title', 'Tiêu đề mục lục', 'Mục lục', 60),
        T('toc.1', 'Mục 1', '1. Chuẩn bị', 80),
        T('toc.2', 'Mục 2', '2. Tải AI Desk', 80),
        T('toc.3', 'Mục 3', '3. Cài AI Desk Desktop', 80),
        T('toc.4', 'Mục 4', '4. Cài Extension', 80),
        T('toc.5', 'Mục 5', '5. Kết nối GPT Web', 80),
        T('toc.6', 'Mục 6', '6. Thiết lập Worker', 80),
        T('toc.7', 'Mục 7', '7. Nạp Prompt Manager', 80),
        T('toc.8', 'Mục 8', '8. Tác vụ đầu tiên', 80),
        T('toc.9', 'Mục 9', '9. Xử lý sự cố', 80),
      ],
    },
    ...installSteps(),
    {
      id: 'security', label: 'Lưu ý về bảo mật (cuối trang)', hideId: 'security',
      fields: [
        T('sec.title', 'Tiêu đề', 'Lưu ý về bảo mật', 120),
        T('sec.before', 'Đoạn trước mã', 'Control API trong source lắng nghe trên', 200),
        T('sec.code', 'Đoạn mã nội dòng', '127.0.0.1', 60),
        T('sec.after', 'Đoạn sau mã', 'và dùng token/scopes. Điều đó không có nghĩa toàn bộ ứng dụng không tạo kết nối mạng. Không chia sẻ token điều khiển hoặc thông tin phiên của bạn.', 500, true),
      ],
    },
    {
      id: 'nav', label: 'Nút điều hướng cuối trang (liên kết cố định)', hideId: 'nav',
      fields: [
        T('nav.prompts', 'Nút 1 (tới /prompts)', 'Thư viện Prompt', 80),
        T('nav.videos', 'Nút 2 (tới /tutorials)', 'Video hướng dẫn', 80),
        T('nav.roadmap', 'Nút 3 (tới /roadmap)', 'Lộ trình phát triển', 80),
      ],
    },
  ],
}

const PROMPT_ACTION_RULES = `Bạn đang chuẩn bị một action cho AI Desk.

Khi người dùng cung cấp nhiệm vụ, hãy trả về đúng một JSON object và không thêm văn bản bên ngoài JSON. Giữ nguyên các khóa sau:
- type: "AI_DESK_MANAGER_ACTION"
- action: "SEND_TO_WORKER"
- worker: một trong "claude", "codex", "opencode", "antigravity" hoặc "auto"
- instruction: yêu cầu cụ thể dành cho worker
- requestId: null để AI Desk tự tạo ID hiệu lực từ danh tính tin nhắn, hoặc một chuỗi ID do người dùng cung cấp
- taskTitle: tiêu đề ngắn, không bắt buộc

Không thêm khóa khác. Không tự tuyên bố rằng action đã chạy; chỉ tạo JSON để AI Desk tiếp nhận.`

export const PROMPT_STATUS_OPTIONS = [
  { value: 'verified', label: 'Đã xác minh' },
  { value: 'experimental', label: 'Thử nghiệm' },
  { value: 'coming-soon', label: 'Sắp có' },
]

export const PROMPTS_PAGE: PageDef = {
  id: 'prompts',
  label: 'Prompt Kit',
  path: '/prompts',
  title: 'Thư viện Prompt AI Desk',
  description: 'Thư viện prompt: đầu trang, danh mục, từng prompt (nội dung nguyên văn), hướng dẫn nhanh và lưu ý.',
  sections: [
    {
      id: 'hero', label: 'Đầu trang',
      fields: [
        T('hero.eyebrow', 'Nhãn nhỏ phía trên', 'Thư viện Prompt', 80),
        T('hero.title', 'Tiêu đề trang', 'Thư viện Prompt AI Desk', 160),
        T('hero.intro', 'Đoạn giới thiệu', 'Các mẫu action được đối chiếu với schema trong source AI Desk. Bạn có thể sao chép hoặc tải nguyên văn; khả năng tương thích với gói 0.3.0 Beta vẫn cần kiểm chứng.', 500, true),
        T('hero.badge1', 'Nhãn 1 (xanh lá)', 'Đã xác minh: schema khớp source code', 120),
        T('hero.badge2', 'Nhãn 2 (vàng)', 'Thử nghiệm: Đang kiểm chứng', 120),
        T('hero.badge3', 'Nhãn 3 (xám)', 'Sắp có: Chưa sẵn sàng', 120),
      ],
    },
    {
      id: 'integrity', label: 'Khung phạm vi xác minh', hideId: 'integrity',
      fields: [
        T('integrity.lead', 'Phần in đậm', 'Phạm vi xác minh:', 80),
        T('integrity.text', 'Nội dung', 'nhãn xác minh chỉ khẳng định cấu trúc action khớp source hiện tại. Nó không khẳng định gói tải 0.3.0 Beta đã chứa cùng protocol. Không có secret, token, key hay URL nội bộ trong các mẫu.', 600, true),
      ],
    },
    {
      id: 'categories', label: 'Danh mục prompt',
      fields: [
        T('cat.allLabel', 'Nhãn "tất cả"', 'Tất cả', 40),
        {
          key: 'cat.items', label: 'Danh mục', type: 'items', maxItems: 12, itemLabel: 'Danh mục', titleKey: 'label',
          default: [{ id: 'manager', label: 'GPT Manager' }, { id: 'single-worker', label: 'Single Worker' }],
          fields: [{ key: 'id', label: 'Mã danh mục (chữ thường, số, gạch ngang)', type: 'text', max: 40, help: 'Prompt tham chiếu danh mục bằng mã này.' }, { key: 'label', label: 'Tên hiển thị', type: 'text', max: 60 }],
        },
      ],
    },
    {
      id: 'prompts', label: 'Các prompt',
      fields: [
        {
          key: 'prompts.items', label: 'Danh sách prompt', type: 'items', maxItems: 60, itemLabel: 'Prompt', titleKey: 'title',
          default: [
            {
              id: 'manager-action-template', title: 'Manager Action — mẫu theo source',
              description: 'Mẫu tạo AI_DESK_MANAGER_ACTION với đúng các trường mà parser hiện tại chấp nhận.',
              category: 'manager', mode: 'Action template', workers: 'Codex\nClaude Code\nOpenCode\nAntigravity\nAuto',
              aiDeskVersion: 'Source hiện tại', status: 'verified',
              statusNote: 'Schema được đối chiếu với src/shared/managerAction.ts. Khả năng hoạt động trong gói 0.3.0 Beta chưa được xác minh độc lập.',
              updatedAt: '2026-10-18', content: PROMPT_ACTION_RULES,
            },
            {
              id: 'codex-action-template', title: 'Codex Action — mẫu một worker',
              description: 'Biến thể giới hạn worker thành Codex, không thêm quy tắc điều phối chưa có trong source.',
              category: 'single-worker', mode: 'Action template', workers: 'Codex',
              aiDeskVersion: 'Source hiện tại', status: 'verified',
              statusNote: 'Schema được đối chiếu với src/shared/managerAction.ts. Người dùng vẫn phải kiểm tra trạng thái thực tế trong AI Desk.',
              updatedAt: '2026-10-18', content: `${PROMPT_ACTION_RULES}\n\nTrong mẫu này, luôn đặt worker là "codex".`,
            },
          ],
          fields: [
            { key: 'id', label: 'Mã prompt (chữ thường, số, gạch ngang)', type: 'text', max: 60 },
            { key: 'title', label: 'Tiêu đề', type: 'text', max: 160 },
            { key: 'description', label: 'Mô tả', type: 'longtext', max: 600 },
            { key: 'category', label: 'Mã danh mục', type: 'text', max: 40 },
            { key: 'mode', label: 'Chế độ', type: 'text', max: 80 },
            { key: 'workers', label: 'Worker (mỗi dòng một tên)', type: 'lines', max: 400 },
            { key: 'aiDeskVersion', label: 'Phiên bản AI Desk', type: 'text', max: 80 },
            { key: 'status', label: 'Trạng thái', type: 'select', max: 20, options: PROMPT_STATUS_OPTIONS },
            { key: 'statusNote', label: 'Ghi chú trạng thái', type: 'longtext', max: 600 },
            { key: 'updatedAt', label: 'Ngày cập nhật (YYYY-MM-DD)', type: 'date', max: 10 },
            { key: 'content', label: 'Nội dung prompt (nguyên văn, giữ nguyên xuống dòng)', type: 'code', max: 20000 },
          ],
        },
      ],
    },
    {
      id: 'quickstart', label: 'Bắt đầu nhanh — 5 bước (cột phải)', hideId: 'quickstart',
      fields: [
        T('qs.title', 'Tiêu đề', 'Bắt đầu nhanh — 5 bước', 120),
        {
          key: 'qs.steps', label: 'Các bước', type: 'items', maxItems: 10, itemLabel: 'Bước', titleKey: 'label',
          default: [
            { label: 'Cài AI Desk', desc: 'Tải và cài AI Desk Desktop trên Windows', href: '/install' },
            { label: 'Kết nối Extension', desc: 'Cài GPT Bridge Extension và kết nối', href: '/install#step-4' },
            { label: 'Chọn Prompt', desc: 'Chọn mẫu phù hợp từ thư viện này', href: '/prompts' },
            { label: 'Nạp vào ChatGPT', desc: 'Sao chép prompt và gửi vào ChatGPT Web', href: '' },
            { label: 'Giao nhiệm vụ', desc: 'Kiểm tra kết nối và bắt đầu làm việc', href: '' },
          ],
          fields: [{ key: 'label', label: 'Tên bước', type: 'text', max: 80 }, { key: 'desc', label: 'Mô tả', type: 'text', max: 200 }, { key: 'href', label: 'Liên kết nội bộ (để trống nếu không có)', type: 'url', max: 200 }],
        },
        T('qs.noteLead', 'Ghi chú — phần in đậm', 'Lưu ý:', 40),
        T('qs.noteText', 'Ghi chú — nội dung', 'Nạp prompt không tự cấp quyền điều khiển máy, không tăng quota dịch vụ và không bảo đảm phần mềm đã kết nối. Đảm bảo đã hoàn thành cài đặt trước.', 500, true),
      ],
    },
    {
      id: 'howto', label: 'Cách sử dụng prompt (cột phải)', hideId: 'howto',
      fields: [
        T('howto.title', 'Tiêu đề', 'Cách sử dụng prompt', 120),
        L('howto.steps', 'Các bước', ['Chọn prompt phù hợp với cách dùng của bạn (single worker / multi-worker).', 'Nhấn "Sao chép" để copy toàn bộ nội dung prompt.', 'Mở ChatGPT Web, bắt đầu cuộc trò chuyện mới.', 'Dán vào ô nhập và gửi. GPT Manager sẽ xác nhận vai trò.', 'Mô tả nhiệm vụ và bắt đầu điều phối.'], 'Bước', 12, 300),
      ],
    },
    {
      id: 'warning', label: 'Lưu ý quan trọng (cột phải)', hideId: 'warning',
      fields: [
        T('warn.title', 'Tiêu đề', 'Lưu ý quan trọng', 80),
        L('warn.items', 'Các lưu ý', ['Cần cài AI Desk trước khi dùng prompt', 'Prompt không tự kết nối Extension', 'Không bảo đảm hoạt động 100%', 'Mỗi chat GPT mới cần nạp lại prompt'], 'Lưu ý', 12, 200),
      ],
    },
    {
      id: 'buttons', label: 'Nút liên kết (cột phải, liên kết cố định)',
      fields: [
        T('btn.install', 'Nút 1 (tới /install)', 'Hướng dẫn cài đặt', 80),
        T('btn.videos', 'Nút 2 (tới /tutorials)', 'Video hướng dẫn', 80),
      ],
    },
  ],
}

export const VIDEO_STATUS_OPTIONS = [
  { value: 'published', label: 'Đã xuất bản (có YouTube)' },
  { value: 'coming-soon', label: 'Sắp ra mắt' },
  { value: 'draft', label: 'Nháp' },
]

const TUTORIAL_VIDEOS_DEFAULT: Array<Record<string, string>> = [
  ['intro-ai-desk', 'Giới thiệu AI Desk', 'Tổng quan về AI Desk: AI Desk là gì, giải quyết vấn đề gì và hoạt động như thế nào trong thực tế.', 'intro'],
  ['installation-guide', 'Hướng dẫn cài đặt AI Desk', 'Từng bước cài đặt AI Desk trên Windows: tải file, cài đặt, xác minh và khởi động lần đầu.', 'setup'],
  ['gpt-web-extension-setup', 'Thiết lập GPT Web và Extension', 'Cài GPT Bridge Extension, kết nối với ChatGPT Web và kiểm tra trạng thái kết nối lần đầu.', 'setup'],
  ['gpt-manager-usage', 'Sử dụng GPT Manager', 'Cách nạp prompt GPT Manager vào ChatGPT, phân tích nhiệm vụ và giao việc cho worker.', 'workflow'],
  ['connect-codex', 'Kết nối Codex', 'Thiết lập worker Codex trong AI Desk: gán phiên, kiểm tra quota và thực hiện nhiệm vụ đầu tiên.', 'workers'],
  ['connect-claude', 'Kết nối Claude Code', 'Thiết lập worker Claude Code: cách gán phiên, xác minh kết nối và gửi yêu cầu đầu tiên.', 'workers'],
  ['demo-real-workflow', 'Demo quy trình thực tế', 'Xem AI Desk trong thực tế: từ mô tả nhiệm vụ, phân công worker đến thu kết quả và nghiệm thu.', 'workflow'],
  ['troubleshooting-faq', 'Khắc phục lỗi và FAQ', 'Xử lý các vấn đề thường gặp: extension không kết nối, worker không phản hồi, sai phiên chat.', 'troubleshooting'],
].map(([id, title, description, category]) => ({ id: id!, title: title!, description: description!, category: category!, youtubeId: '', duration: '', publishedAt: '', status: 'coming-soon', thumbnailMediaId: '' }))

export const TUTORIALS_PAGE: PageDef = {
  id: 'tutorials',
  label: 'Video hướng dẫn',
  path: '/tutorials',
  title: 'Video hướng dẫn AI Desk',
  description: 'Thư viện video: đầu trang, danh mục, từng video (YouTube, ảnh bìa, trạng thái) và khung "đang sản xuất". Video thêm từ mục Video của Studio vẫn tự động xuất hiện.',
  sections: [
    {
      id: 'hero', label: 'Đầu trang',
      fields: [
        T('hero.eyebrow', 'Nhãn nhỏ phía trên', 'Thư viện video', 80),
        T('hero.title', 'Tiêu đề trang', 'Video hướng dẫn AI Desk', 160),
        T('hero.intro', 'Đoạn giới thiệu', 'Học cách cài đặt và sử dụng AI Desk qua các video hướng dẫn từng bước. Video đang được chuẩn bị cùng với bản Public Beta.', 500, true),
      ],
    },
    {
      id: 'notice', label: 'Thông báo vàng dưới tiêu đề', hideId: 'notice',
      fields: [T('notice.text', 'Nội dung', 'Video đang được sản xuất — cập nhật khi có bản Beta', 200)],
    },
    {
      id: 'featured', label: 'Video nổi bật',
      fields: [T('featured.title', 'Tiêu đề khối', 'Video nổi bật', 80)],
    },
    {
      id: 'categories', label: 'Danh mục video',
      fields: [
        T('cat.allLabel', 'Nhãn "tất cả"', 'Tất cả', 40),
        {
          key: 'cat.items', label: 'Danh mục', type: 'items', maxItems: 12, itemLabel: 'Danh mục', titleKey: 'label',
          default: [{ id: 'intro', label: 'Giới thiệu' }, { id: 'setup', label: 'Cài đặt' }, { id: 'workers', label: 'Workers' }, { id: 'workflow', label: 'Quy trình' }, { id: 'troubleshooting', label: 'Khắc phục lỗi' }],
          fields: [{ key: 'id', label: 'Mã danh mục (chữ thường, số, gạch ngang)', type: 'text', max: 40 }, { key: 'label', label: 'Tên hiển thị', type: 'text', max: 60 }],
        },
      ],
    },
    {
      id: 'videos', label: 'Danh sách video',
      fields: [
        {
          key: 'videos.items', label: 'Video', type: 'items', maxItems: 60, itemLabel: 'Video', titleKey: 'title',
          default: TUTORIAL_VIDEOS_DEFAULT,
          fields: [
            { key: 'id', label: 'Mã video (chữ thường, số, gạch ngang)', type: 'text', max: 60 },
            { key: 'title', label: 'Tiêu đề', type: 'text', max: 160 },
            { key: 'description', label: 'Mô tả', type: 'longtext', max: 600 },
            { key: 'category', label: 'Mã danh mục', type: 'text', max: 40 },
            { key: 'youtubeId', label: 'Liên kết YouTube (watch, youtu.be, shorts hoặc embed)', type: 'youtube', max: 200, help: 'Chỉ nhập khi video thật đã tồn tại. Để trống nếu chưa có.' },
            { key: 'duration', label: 'Thời lượng (MM:SS)', type: 'duration', max: 10 },
            { key: 'publishedAt', label: 'Ngày đăng (YYYY-MM-DD)', type: 'date', max: 10 },
            { key: 'status', label: 'Trạng thái', type: 'select', max: 20, options: VIDEO_STATUS_OPTIONS },
            { key: 'thumbnailMediaId', label: 'Ảnh bìa tùy chọn (từ Thư viện Media)', type: 'media', max: 36, help: 'Để trống để dùng ảnh YouTube tự động.' },
          ],
        },
      ],
    },
    {
      id: 'coming', label: 'Khung "Video đang được sản xuất" (cuối trang)', hideId: 'coming-soon',
      fields: [
        T('coming.title', 'Tiêu đề', 'Video đang được sản xuất', 120),
        T('coming.text', 'Nội dung', 'Các video hướng dẫn sẽ được ra mắt cùng bản Public Beta. Đăng ký để nhận thông báo khi có video mới.', 400, true),
        T('coming.btn1', 'Nút 1 (tới /#pro-news cố định)', 'Nhận thông báo', 80),
        T('coming.btn2', 'Nút 2 (tới /install cố định)', 'Xem hướng dẫn cài đặt', 80),
      ],
    },
  ],
}

const FAQ_DEFAULT: Array<Record<string, string>> = FAQS.map(faq => ({
  id: faq.id,
  question: faq.question,
  answer: faq.paragraphs.join('\n\n'),
  links: (faq.links ?? []).map(link => `${link.text} | ${link.href}`).join('\n'),
}))

export const FAQ_PAGE: PageDef = {
  id: 'faq',
  label: 'Câu hỏi thường gặp (trang chủ)',
  path: '/#faq',
  title: 'Câu hỏi thường gặp AI Desk',
  description: 'Khối FAQ ở trang chủ: tiêu đề, mô tả, từng câu hỏi và câu trả lời (các đoạn cách nhau bằng một dòng trống), cùng liên kết trong câu trả lời.',
  sections: [
    {
      id: 'hero', label: 'Đầu khối',
      fields: [
        T('hero.eyebrow', 'Nhãn nhỏ phía trên', 'FAQ', 40),
        T('hero.title', 'Tiêu đề', 'Câu hỏi thường gặp', 120),
        T('hero.lead', 'Đoạn giới thiệu', 'Những điều cần biết về bản Beta, cách cài đặt và quyền sử dụng AI Desk.', 300, true),
        T('search.placeholder', 'Gợi ý trong ô tìm kiếm', 'Tìm câu hỏi: tài khoản, Windows…', 120),
      ],
    },
    {
      id: 'items', label: 'Danh sách câu hỏi',
      fields: [
        {
          key: 'faq.items', label: 'Câu hỏi', type: 'items', maxItems: 40, itemLabel: 'Câu hỏi', titleKey: 'question', default: FAQ_DEFAULT,
          fields: [
            { key: 'id', label: 'Mã câu hỏi (chữ thường, số, gạch ngang)', type: 'text', max: 60 },
            { key: 'question', label: 'Câu hỏi', type: 'text', max: 240 },
            { key: 'answer', label: 'Câu trả lời (mỗi đoạn cách nhau một dòng trống)', type: 'longtext', max: 4000 },
            { key: 'links', label: 'Liên kết trong câu trả lời (mỗi dòng: văn bản | /đường-dẫn hoặc https://…)', type: 'links', max: 600, help: 'Văn bản phải xuất hiện nguyên văn trong câu trả lời để trở thành liên kết.' },
          ],
        },
      ],
    },
  ],
}

const CHANGELOG_DEFAULT: Array<Record<string, string>> = CHANGELOG.map(entry => ({
  id: `${entry.scope}-${entry.version}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
  version: entry.version,
  date: entry.date,
  scope: entry.scope,
  status: entry.status,
  changes: entry.changes.join('\n'),
}))

export const CHANGELOG_PAGE: PageDef = {
  id: 'changelog',
  label: 'Changelog',
  path: '/changelog',
  title: 'Changelog AI Desk',
  description: 'Lịch sử thay đổi của ứng dụng AI Desk và website: tiêu đề trang và từng mục phiên bản (ngày, phạm vi, trạng thái, danh sách thay đổi).',
  sections: [
    {
      id: 'hero', label: 'Đầu trang',
      fields: [
        T('hero.title', 'Tiêu đề trang', 'Changelog', 120),
        T('hero.intro', 'Đoạn giới thiệu', 'Các thay đổi của ứng dụng AI Desk và website.', 300, true),
      ],
    },
    {
      id: 'entries', label: 'Các phiên bản',
      fields: [
        {
          key: 'entries.items', label: 'Phiên bản / bản cập nhật', type: 'items', maxItems: 60, itemLabel: 'Phiên bản', titleKey: 'version', default: CHANGELOG_DEFAULT,
          fields: [
            { key: 'id', label: 'Mã mục (chữ thường, số, gạch ngang)', type: 'text', max: 60 },
            { key: 'version', label: 'Tên phiên bản', type: 'text', max: 120 },
            { key: 'date', label: 'Ngày (YYYY-MM-DD)', type: 'date', max: 10 },
            { key: 'scope', label: 'Phạm vi', type: 'select', max: 20, options: [{ value: 'desktop', label: 'Ứng dụng' }, { value: 'website', label: 'Website' }] },
            { key: 'status', label: 'Trạng thái', type: 'text', max: 240 },
            { key: 'changes', label: 'Các thay đổi (mỗi dòng một ý)', type: 'lines', max: 3000 },
          ],
        },
      ],
    },
  ],
}

export const PAGES: Record<PageId, PageDef> = { install: INSTALL_PAGE, prompts: PROMPTS_PAGE, tutorials: TUTORIALS_PAGE, faq: FAQ_PAGE, changelog: CHANGELOG_PAGE }

export function allFields(page: PageDef): Field[] {
  return page.sections.flatMap(section => section.fields)
}
export function hideIds(page: PageDef): string[] {
  return page.sections.flatMap(section => (section.hideId ? [section.hideId] : []))
}

/** Defaults for every field of a page — the code-owned content the public pages fall back to. */
export function defaultValues(page: PageDef): Record<string, Value> {
  return Object.fromEntries(allFields(page).map(field => [field.key, structuredClone(field.default) as Value]))
}

/** Full snapshot document of the current defaults (used by the idempotent import and as the Studio starting point). */
export function defaultDoc(page: PageDef): PageDoc {
  return { values: defaultValues(page), hidden: [] }
}

// ---------- validation (shared by the server and the Studio) ----------
const URL_INTERNAL = /^\/(?!\/)[A-Za-z0-9\-._~/#?=&%]*$/
const LINK_LINE = /^[^|\n]{1,60} \| (?:\/(?!\/)[A-Za-z0-9\-._~/#?=&%]*|https:\/\/[^\s<>"']{1,500})$/
const HTTPS = /^https:\/\/[^\s<>"']{1,500}$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const YT = /^[A-Za-z0-9_-]{11}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/
const DURATION = /^\d{1,3}:\d{2}(?::\d{2})?$/
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
const MAX_DOC_BYTES = 150_000

/** Returns a readable-code problem for one scalar subfield value, or null when valid. */
function checkScalar(type: SubFieldType, value: string, max: number, options?: SubField['options']): string | null {
  if (value.length > max) return `max_${max}`
  if (CONTROL.test(value)) return 'control_characters'
  switch (type) {
    case 'url': return value === '' || URL_INTERNAL.test(value) || HTTPS.test(value) ? null : 'url_invalid'
    case 'youtube': return value === '' || YT.test(value) ? null : 'youtube_id_invalid'
    case 'date': return value === '' || (DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)) ? null : 'date_invalid'
    case 'duration': return value === '' || DURATION.test(value) ? null : 'duration_invalid'
    case 'media': return value === '' || UUID.test(value) ? null : 'media_id_invalid'
    case 'links': return value.split('\n').every(line => line.trim() === '' || LINK_LINE.test(line.trim())) ? null : 'links_invalid'
    case 'select': return options?.some(option => option.value === value) ? null : 'option_invalid'
    default: return null
  }
}

export type DocProblems = Record<string, string>

/** Validates a document against its page definition. Keys are `field.key` or `field.key[index].subkey`. */
export function validateDoc(pageId: string, input: unknown): { ok: true; doc: PageDoc } | { ok: false; problems: DocProblems } {
  const problems: DocProblems = {}
  if (!(PAGE_IDS as readonly string[]).includes(pageId)) return { ok: false, problems: { page: 'unknown_page' } }
  const page = PAGES[pageId as PageId]
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, problems: { doc: 'object_required' } }
  const raw = input as { values?: unknown; hidden?: unknown }
  for (const key of Object.keys(raw)) if (key !== 'values' && key !== 'hidden') problems[key] = 'unknown_field'
  const valuesInput = raw.values ?? {}
  if (!valuesInput || typeof valuesInput !== 'object' || Array.isArray(valuesInput)) return { ok: false, problems: { values: 'object_required' } }
  const fields = new Map(allFields(page).map(field => [field.key, field]))
  const values: Record<string, Value> = {}
  for (const [key, value] of Object.entries(valuesInput as Record<string, unknown>)) {
    const field = fields.get(key)
    if (!field) { problems[key] = 'unknown_field'; continue }
    if (field.type === 'text' || field.type === 'code' || field.type === 'markdown') {
      if (typeof value !== 'string') { problems[key] = 'string_required'; continue }
      if (value.length > field.max) problems[key] = `max_${field.max}`
      else if (field.type !== 'markdown' && field.type !== 'code' && CONTROL.test(value)) problems[key] = 'control_characters'
      else if ((field.type === 'markdown' || field.type === 'code') && CONTROL.test(value)) problems[key] = 'control_characters'
      else if (field.type === 'text' && !field.multiline && /[\r\n]/.test(value)) problems[key] = 'single_line_required'
      else values[key] = value
    } else if (field.type === 'list') {
      if (!Array.isArray(value) || value.length > field.maxItems) { problems[key] = `list_max_${field.maxItems}`; continue }
      let bad = false
      value.forEach((item, index) => {
        if (typeof item !== 'string' || item.length > field.itemMax || CONTROL.test(item) || /[\r\n]/.test(item)) { problems[`${key}[${index}]`] = typeof item === 'string' && item.length > field.itemMax ? `max_${field.itemMax}` : 'invalid_text'; bad = true }
      })
      if (!bad) values[key] = value as string[]
    } else {
      if (!Array.isArray(value) || value.length > field.maxItems) { problems[key] = `list_max_${field.maxItems}`; continue }
      const subs = new Map(field.fields.map(sub => [sub.key, sub]))
      let bad = false
      const seen = new Set<string>()
      value.forEach((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) { problems[`${key}[${index}]`] = 'object_required'; bad = true; return }
        for (const [subKey, subValue] of Object.entries(item as Record<string, unknown>)) {
          const sub = subs.get(subKey)
          const path = `${key}[${index}].${subKey}`
          if (!sub) { problems[path] = 'unknown_field'; bad = true; continue }
          if (typeof subValue !== 'string') { problems[path] = 'string_required'; bad = true; continue }
          const problem = checkScalar(sub.type, subValue, sub.max, sub.options)
          const multiline = sub.type === 'longtext' || sub.type === 'lines' || sub.type === 'code' || sub.type === 'links'
          if (problem) { problems[path] = problem; bad = true } else if (!multiline && /[\r\n]/.test(subValue)) { problems[path] = 'single_line_required'; bad = true }
        }
        if (subs.has('id')) {
          const id = String((item as Record<string, unknown>).id ?? '')
          if (!SLUG.test(id) || id.length > 60) { problems[`${key}[${index}].id`] = 'slug_invalid'; bad = true } else if (seen.has(id)) { problems[`${key}[${index}].id`] = 'duplicate_id'; bad = true } else seen.add(id)
        }
      })
      if (!bad) values[key] = value as Array<Record<string, string>>
    }
  }
  const hiddenInput = raw.hidden ?? []
  const allowedHidden = new Set(hideIds(page))
  let hidden: string[] = []
  if (!Array.isArray(hiddenInput) || hiddenInput.some(item => typeof item !== 'string' || !allowedHidden.has(item))) problems.hidden = 'hidden_ids_invalid'
  else hidden = [...new Set(hiddenInput as string[])]
  if (!Object.keys(problems).length && new TextEncoder().encode(JSON.stringify({ values, hidden })).byteLength > MAX_DOC_BYTES) problems.doc = 'document_too_large'
  return Object.keys(problems).length ? { ok: false, problems } : { ok: true, doc: { values, hidden } }
}

/** Effective value of a field: the document override when present, otherwise the code default. */
export function effective<T extends Value>(doc: PageDoc | null | undefined, field: Field): T {
  const override = doc?.values[field.key]
  return (override === undefined ? field.default : override) as T
}
