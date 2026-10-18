import React, { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Globe,
  Layers,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'

// Architecture diagram as SVG-based component
const ArchitectureDiagram: React.FC = () => {
  const nodes = [
    { id: 'user', label: 'Người dùng', sub: 'Mô tả nhiệm vụ', color: 'text-slate-300', bg: 'bg-white/[0.04] border-white/10' },
    { id: 'gpt', label: 'GPT Manager', sub: 'ChatGPT Web', color: 'text-accent-light', bg: 'bg-accent/[0.08] border-accent/30' },
    { id: 'bridge', label: 'GPT Bridge', sub: 'Extension', color: 'text-purple-300', bg: 'bg-purple-500/[0.08] border-purple-400/30' },
    { id: 'desk', label: 'AI Desk Desktop', sub: 'Điều phối', color: 'text-white', bg: 'bg-accent/10 border-accent/50', highlight: true },
    { id: 'worker', label: 'Worker', sub: 'Codex / Claude Code', color: 'text-emerald-300', bg: 'bg-emerald-500/[0.08] border-emerald-400/30' },
    { id: 'result', label: 'Kết quả', sub: 'Trả về Manager', color: 'text-amber-300', bg: 'bg-amber-500/[0.08] border-amber-400/30' },
  ]

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Flow row */}
        <div className="flex items-center gap-0">
          {nodes.map((node, i) => (
            <React.Fragment key={node.id}>
              <div
                className={`flex flex-1 flex-col items-center rounded-[10px] border px-3 py-3 text-center ${node.bg} ${node.highlight ? 'ring-1 ring-accent/40' : ''}`}
              >
                <span className={`text-xs font-semibold ${node.color}`}>{node.label}</span>
                <span className="mt-0.5 text-[10px] text-subtle">{node.sub}</span>
              </div>
              {i < nodes.length - 1 && (
                <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
              )}
            </React.Fragment>
          ))}
        </div>
        {/* Return path indicator */}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-subtle">
          <span className="rounded-md border border-amber-400/20 bg-amber-400/[0.05] px-2 py-1 text-amber-300">
            Kết quả
          </span>
          <ArrowRight className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
          <span className="rounded-md border border-accent/20 bg-accent/[0.05] px-2 py-1 text-accent-light">
            GPT Manager đánh giá và quyết định bước tiếp
          </span>
        </div>
      </div>
    </div>
  )
}
// Tradeoff comparison card
const TradeoffCard: React.FC<{
  title: string
  approach: string
  pros: string[]
  cons: string[]
  accent?: boolean
}> = ({ title, approach, pros, cons, accent }) => (
  <div className={`card p-5 ${accent ? 'border-accent/40 bg-accent/[0.04]' : ''}`}>
    <div className="mb-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{approach}</span>
      <h3 className="mt-1 text-base font-semibold text-white">{title}</h3>
    </div>
    <ul className="space-y-1.5 text-sm">
      {pros.map((p) => (
        <li key={p} className="flex gap-2 text-emerald-300">
          <span className="mt-0.5 shrink-0 text-emerald-400">+</span>
          <span className="text-muted">{p}</span>
        </li>
      ))}
      {cons.map((c) => (
        <li key={c} className="flex gap-2 text-amber-300">
          <span className="mt-0.5 shrink-0 text-amber-400">−</span>
          <span className="text-muted">{c}</span>
        </li>
      ))}
    </ul>
  </div>
)

// FAQ accordion
const FAQ_ITEMS = [
  {
    q: 'Tại sao dùng ChatGPT Web làm Manager thay vì gọi API trực tiếp?',
    a: 'ChatGPT Web cung cấp giao diện đàm thoại tự nhiên, không cần quản lý API key trong ứng dụng AI Desk, và người dùng đã quen sử dụng. Đánh đổi là phụ thuộc vào trạng thái trình duyệt và extension, nhưng điều này phù hợp với giai đoạn đầu khi sự đơn giản là ưu tiên hàng đầu.',
  },
  {
    q: 'AI Desk có thể chạy hoàn toàn tự động không?',
    a: 'Hiện tại AI Desk ở chế độ Manual/Assisted. Người dùng vẫn cần xác nhận một số bước, đặc biệt các hành động quan trọng. Full Autonomous đang được phát triển nhưng chưa có trong phiên bản phát hành nào.',
  },
  {
    q: 'Tại sao điều khiển ứng dụng Desktop thay vì dùng API?',
    a: 'Codex và Claude Code trên Desktop có thể tận dụng context từ dự án thực trên máy người dùng — đọc file, chạy terminal, truy cập git. Điều này không thể làm được qua API thuần túy không có quyền truy cập máy. Đánh đổi là phụ thuộc vào giao diện ứng dụng và có thể bị ảnh hưởng khi UI thay đổi.',
  },
  {
    q: 'AI Desk có thể xử lý nhiều worker song song không?',
    a: 'Tính năng nhiều phiên song song đang ở chế độ shadow (quan sát) trong RC1, chưa điều phối thật. Hiện tại mỗi worker nhận một nhiệm vụ tại một thời điểm để đảm bảo độ chính xác.',
  },
  {
    q: 'Điều gì xảy ra khi worker thất bại?',
    a: 'AI Desk sẽ báo lỗi về GPT Manager. Manager sẽ đánh giá và quyết định: thử lại, chuyển sang worker khác, hoặc yêu cầu người dùng can thiệp. Hệ thống phục hồi lỗi tự động đang được hoàn thiện.',
  },
]

const FaqAccordion: React.FC = () => {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="card overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="flex w-full items-center justify-between gap-4 p-5 text-left"
          >
            <span className="font-medium text-white">{item.q}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-subtle transition-transform ${open === i ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {open === i && (
            <div className="border-t border-line px-5 pb-5 pt-4">
              <p className="text-sm leading-relaxed text-muted">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
// Example task walkthrough
const TaskExample: React.FC = () => {
  const steps = [
    {
      step: '01',
      actor: 'Người dùng',
      action: 'Mô tả nhiệm vụ trong ChatGPT Web',
      detail: '"Tối ưu hàm parseUser trong auth.ts, thêm error handling và viết unit test."',
      color: 'text-slate-300',
    },
    {
      step: '02',
      actor: 'GPT Manager',
      action: 'Phân tích và tạo yêu cầu',
      detail: 'Tạo action SEND_TO_WORKER với worker, instruction và requestId theo schema đã được source kiểm tra.',
      color: 'text-accent-light',
    },
    {
      step: '03',
      actor: 'GPT Bridge',
      action: 'Chuyển yêu cầu qua Extension',
      detail: 'Bridge tìm AI_DESK_MANAGER_ACTION, xác thực các trường được phép rồi chuyển action vào luồng AI Desk.',
      color: 'text-purple-300',
    },
    {
      step: '04',
      actor: 'AI Desk Desktop',
      action: 'Xác minh và điều phối',
      detail: 'Kiểm tra requestId, xác minh phiên Codex, chuyển yêu cầu vào cửa sổ Codex trên máy người dùng.',
      color: 'text-white',
    },
    {
      step: '05',
      actor: 'Codex',
      action: 'Thực hiện nhiệm vụ',
      detail: 'Worker thực hiện theo quyền và ngữ cảnh mà ứng dụng worker đang có. Người dùng xem xét thay đổi thực tế.',
      color: 'text-emerald-300',
    },
    {
      step: '06',
      actor: 'AI Desk Desktop',
      action: 'Thu kết quả và trả về',
      detail: 'AI Desk có định dạng AI_DESK_WORKER_RESULT gắn requestId; tự động gửi về còn phụ thuộc trạng thái và policy runtime.',
      color: 'text-amber-300',
    },
  ]

  return (
    <ol className="space-y-3">
      {steps.map(({ step, actor, action, detail, color }) => (
        <li key={step} className="card flex gap-4 p-5">
          <span className="font-mono text-sm font-bold text-subtle">{step}</span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-sm font-semibold ${color}`}>{actor}</span>
              <span className="text-subtle">→</span>
              <span className="text-sm font-medium text-ink">{action}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{detail}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export const WhyAiDeskPage: React.FC = () => {
  return (
    <div className="bg-navy">
      {/* Hero */}
      <div className="border-b border-white/[0.06] bg-navy-950">
        <div className="container-content py-16 sm:py-20">
          <a href="/" className="text-sm font-medium text-accent-light hover:underline">
            ← Về trang chủ
          </a>
          <p className="eyebrow mt-6">Góc nhìn người phát triển</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Vì sao tôi xây dựng AI Desk?
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Đây không phải bài quảng cáo. Đây là giải thích thẳng thắn về vấn đề tôi gặp phải, cách tôi chọn giải
            quyết nó, và những đánh đổi kỹ thuật tôi đã chấp nhận.
          </p>
        </div>
      </div>

      <div className="container-content max-w-4xl space-y-20 py-16 sm:py-20">
        {/* A. Problem */}
        <section aria-labelledby="problem-title">
          <p className="eyebrow">Vấn đề</p>
          <h2 id="problem-title" className="section-title mt-3">
            AI Desk ra đời từ vấn đề gì?
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Copy,
                title: 'Chuyển cửa sổ liên tục',
                body: 'Mỗi AI tool có cửa sổ riêng. Khi cần dùng nhiều tool cùng lúc, phải liên tục alt-tab và copy-paste giữa chúng.',
              },
              {
                icon: Layers,
                title: 'Không có điều phối chung',
                body: 'Không có nơi nào để xem toàn bộ quy trình đang diễn ra như thế nào — tool nào đang làm gì, kết quả ở đâu.',
              },
              {
                icon: Clock,
                title: 'Theo dõi tiến độ thủ công',
                body: 'Phải tự nhớ nhiệm vụ nào đã giao, cho ai, và đã nhận kết quả chưa. Không có hệ thống xác minh tự động.',
              },
              {
                icon: Zap,
                title: 'Ngắt quãng quy trình',
                body: 'Khi kết quả từ một AI cần làm đầu vào cho AI khác, quá trình chuyển giao thủ công làm mất tập trung và dễ gây lỗi.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="card p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-navy-900 text-accent-light">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-muted">
            AI Desk không giải quyết tất cả những vấn đề này hoàn toàn — đặc biệt ở giai đoạn Alpha. Nhưng đó là
            hướng tôi đang xây dựng: một lớp điều phối giúp việc dùng nhiều AI cùng lúc bớt mệt mỏi hơn.
          </p>
        </section>

        {/* B. Why GPT Web as Manager */}
        <section aria-labelledby="manager-title">
          <p className="eyebrow">Kiến trúc Manager-Worker</p>
          <h2 id="manager-title" className="section-title mt-3">
            Vì sao sử dụng GPT Web làm Manager?
          </h2>
          <p className="section-lead">
            Ý tưởng cốt lõi: một Manager thông minh nhận nhiệm vụ từ người dùng, phân tích, điều phối worker phù
            hợp và đánh giá kết quả.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <Sparkles className="h-5 w-5 text-accent-light" aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-white">GPT Manager</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Nhận yêu cầu bằng ngôn ngữ tự nhiên, phân tích nhiệm vụ, tạo requestId và viết yêu cầu cụ thể cho
                worker.
              </p>
            </div>
            <div className="card border-accent/40 bg-accent/[0.04] p-5">
              <Layers className="h-5 w-5 text-white" aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-white">AI Desk Desktop</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Nhận yêu cầu qua GPT Bridge, xác minh phiên, điều phối worker và thu kết quả trả về Manager.
              </p>
            </div>
            <div className="card p-5">
              <Bot className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-white">Worker</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Codex, Claude Code thực thi nhiệm vụ thực tế trên máy người dùng với quyền truy cập dự án đầy đủ.
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <h3 className="font-semibold text-white">Ưu điểm của cách tiếp cận này:</h3>
            <ul className="space-y-2 text-sm text-muted">
              {[
                'Manager nhận yêu cầu bằng ngôn ngữ tự nhiên và tạo action theo schema mà AI Desk kiểm tra.',
                'Người dùng không cần học cú pháp mới; mô tả nhiệm vụ bằng ngôn ngữ tự nhiên.',
                'Kết quả worker được đóng gói riêng để Manager và người dùng xem xét trước bước tiếp theo.',
                'Mô hình Manager qua web được tách khỏi Control API cục bộ của ứng dụng.',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 shrink-0 text-accent-light">·</span>
                  {item}
                </li>
              ))}
            </ul>
            <h3 className="mt-4 font-semibold text-white">Giới hạn phải chấp nhận:</h3>
            <ul className="space-y-2 text-sm text-muted">
              {[
                'Phụ thuộc vào trạng thái của ChatGPT Web và browser extension.',
                'Quota của ChatGPT Web có thể bị cạn trong phiên dài hoặc nhiều nhiệm vụ.',
                'Một số bước vẫn cần sao chép thủ công trong giai đoạn Alpha.',
                'Phản hồi của Manager phụ thuộc vào chất lượng prompt và trạng thái GPT.',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 shrink-0 text-amber-400">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* C. Why Desktop Apps */}
        <section aria-labelledby="desktop-title">
          <p className="eyebrow">Quyết định kiến trúc</p>
          <h2 id="desktop-title" className="section-title mt-3">
            Vì sao điều khiển ứng dụng Desktop thay vì chỉ dùng API?
          </h2>
          <p className="section-lead">
            Đây là quyết định kỹ thuật quan trọng nhất và cũng là điểm khác biệt lớn nhất của AI Desk.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <TradeoffCard
              title="AI Desk (Desktop Control)"
              approach="Cách tiếp cận của AI Desk"
              pros={[
                'Truy cập toàn bộ dự án trên máy',
                'Tận dụng ứng dụng AI đã cài sẵn',
                'Giữ nguyên quy trình làm việc quen thuộc',
                'Dùng luồng ứng dụng hiện có',
              ]}
              cons={[
                'Phụ thuộc vào UI của ứng dụng',
                'Dễ ảnh hưởng khi app cập nhật',
                'Cần ứng dụng chạy đúng phiên',
                'Ít ổn định hơn so với API',
              ]}
              accent
            />
            <TradeoffCard
              title="API / CLI Trực tiếp"
              approach="Giải pháp thay thế"
              pros={[
                'Ổn định và nhất quán hơn',
                'Không phụ thuộc vào UI',
                'Dễ tích hợp vào pipeline',
                'Tài liệu rõ ràng',
              ]}
              cons={[
                'Cần API key và chi phí thêm',
                'Không dùng được ứng dụng đã cài',
                'Có thể thiếu tính năng của ứng dụng',
                'Cần tự xây dựng orchestration',
              ]}
            />
            <TradeoffCard
              title="Công cụ Orchestration khác"
              approach="Giải pháp thay thế"
              pros={[
                'Hệ sinh thái tool phong phú',
                'Nhiều connector có sẵn',
                'Cộng đồng lớn',
              ]}
              cons={[
                'Cần học hệ thống mới',
                'Thường đòi hỏi API key',
                'Phức tạp hơn cho người dùng cá nhân',
              ]}
            />
          </div>
          <div
            role="note"
            className="mt-6 flex gap-3 rounded-card border border-accent/20 bg-accent/[0.04] p-4 text-sm text-muted"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-light" aria-hidden="true" />
            <p>
              Không có giải pháp nào là hoàn hảo. API/CLI ổn định hơn nhưng đòi hỏi nhiều thiết lập hơn. Desktop
              control linh hoạt hơn nhưng cần cẩn thận hơn về độ ổn định. AI Desk chọn Desktop vì nó phù hợp với
              trường hợp sử dụng của người dùng cá nhân đã có các ứng dụng AI trên máy.
            </p>
          </div>
        </section>

        {/* D. Architecture Diagram */}
        <section aria-labelledby="arch-title">
          <p className="eyebrow">Sơ đồ kiến trúc</p>
          <h2 id="arch-title" className="section-title mt-3">
            Luồng hoạt động của AI Desk
          </h2>
          <p className="section-lead">
            Từ khi người dùng mô tả nhiệm vụ đến khi kết quả quay về để nghiệm thu.
          </p>
          <div className="card mt-8 p-6">
            <ArchitectureDiagram />
            <p className="mt-4 text-center text-xs text-subtle">
              GPT Bridge là extension trình duyệt kết nối ChatGPT Web với AI Desk Desktop qua localhost API
            </p>
          </div>
        </section>

        {/* E. Manual/Assisted First */}
        <section aria-labelledby="manual-title">
          <p className="eyebrow">Triết lý thiết kế</p>
          <h2 id="manual-title" className="section-title mt-3">
            Vì sao ưu tiên Manual/Assisted trước Full Autonomous?
          </h2>
          <p className="section-lead">
            Full Autonomous nghe hấp dẫn nhưng đặt ra nhiều câu hỏi về độ an toàn và kiểm soát.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Shield,
                title: 'Kiểm soát rủi ro',
                body: 'Người dùng có thể xem xét và xác nhận trước khi các hành động quan trọng (push git, thay đổi file sản xuất) được thực hiện.',
              },
              {
                icon: Layers,
                title: 'Xác minh kết quả',
                body: 'Mỗi requestId cho phép theo dõi nhiệm vụ từ đầu đến cuối. Kết quả được kiểm tra trước khi Manager tiếp tục.',
              },
              {
                icon: AlertTriangle,
                title: 'Phục hồi khi thất bại',
                body: 'Khi worker thất bại, hệ thống dừng lại thay vì tiếp tục với dữ liệu sai. Người dùng được thông báo để can thiệp.',
              },
              {
                icon: Globe,
                title: 'Xây dựng lòng tin từng bước',
                body: 'Bắt đầu với Manual/Assisted giúp người dùng hiểu rõ hệ thống hoạt động như thế nào trước khi tin tưởng vào tự động hóa.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="card p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-navy-900 text-accent-light">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-card border border-amber-400/20 bg-amber-400/[0.04] p-4 text-sm text-muted">
            <strong className="text-amber-300">Lưu ý:</strong> Full Autonomous đang được phát triển nhưng chưa có
            trong bất kỳ phiên bản phát hành nào. Tất cả các phiên bản hiện tại (Private Alpha RC1) hoạt động ở
            chế độ Manual/Assisted.
          </div>
        </section>

        {/* F. Limitations */}
        <section aria-labelledby="limits-title">
          <p className="eyebrow">Minh bạch</p>
          <h2 id="limits-title" className="section-title mt-3">
            Những giới hạn thực tế
          </h2>
          <p className="section-lead">
            Tôi muốn bạn biết rõ những điều AI Desk chưa làm được, hoặc không bảo đảm được.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              {
                title: 'Quota và giới hạn từ nhà cung cấp',
                body: 'ChatGPT Web, Codex và Claude Code đều có giới hạn quota riêng. AI Desk không tăng được quota của các dịch vụ này. Khi hết quota, nhiệm vụ sẽ bị dừng.',
              },
              {
                title: 'Độ ổn định phụ thuộc vào UI ứng dụng',
                body: 'AI Desk điều khiển giao diện ứng dụng. Khi Codex hoặc Claude Code cập nhật giao diện, có thể ảnh hưởng đến khả năng điều khiển. Cần cập nhật adapter tương ứng.',
              },
              {
                title: 'Tác vụ có thể thất bại',
                body: 'Không có hệ thống nào đảm bảo 100% thành công. Kết nối có thể bị gián đoạn, worker có thể không phản hồi, kết quả có thể không đầy đủ.',
              },
              {
                title: 'Không hoạt động 24/7 hoàn toàn tự động',
                body: 'Ở giai đoạn hiện tại, AI Desk cần máy tính bật, ứng dụng đang chạy và người dùng sẵn sàng xác nhận một số bước. Không phải giải pháp server hoàn toàn không cần giám sát.',
              },
              {
                title: 'Tương thích phiên bản',
                body: 'Bản Alpha RC1 được kiểm thử với một bộ phiên bản ứng dụng cụ thể. Phiên bản mới hơn của worker app có thể cần thời gian để kiểm tra và cập nhật adapter.',
              },
            ].map(({ title, body }) => (
              <li key={title} className="card flex gap-4 p-5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* G. Vision */}
        <section aria-labelledby="vision-title">
          <p className="eyebrow">Tầm nhìn</p>
          <h2 id="vision-title" className="section-title mt-3">
            Đang hướng tới đâu?
          </h2>
          <div className="mt-6 rounded-card border border-accent/20 bg-accent/[0.04] p-6">
            <p className="text-lg leading-relaxed text-ink">
              Mục tiêu của AI Desk là xây dựng một môi trường làm việc nơi nhiều AI có thể được điều phối{' '}
              <strong className="text-white">minh bạch</strong>,{' '}
              <strong className="text-white">thuận tiện</strong> và{' '}
              <strong className="text-white">đáng tin cậy</strong> — không phải thay thế người dùng, mà giúp họ làm
              việc hiệu quả hơn với các công cụ AI họ đã có.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Đây vẫn là dự án giai đoạn đầu với nhiều thứ cần hoàn thiện. Nếu bạn thấy cách tiếp cận này thú vị và
              muốn theo dõi quá trình phát triển, hãy đăng ký nhận thông báo khi có bản Public Beta.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/roadmap" className="btn-primary">
                Xem lộ trình phát triển
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="/#pro-news" className="btn-secondary-dark">
                Nhận thông báo Beta
              </a>
            </div>
          </div>
        </section>

        {/* Task example */}
        <section aria-labelledby="example-title">
          <p className="eyebrow">Ví dụ thực tế</p>
          <h2 id="example-title" className="section-title mt-3">
            Một tác vụ từ đầu đến cuối
          </h2>
          <p className="section-lead">
            Đây là ví dụ cụ thể về cách một nhiệm vụ lập trình chạy qua toàn bộ hệ thống AI Desk.
          </p>
          <div className="mt-8">
            <TaskExample />
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-title">
          <p className="eyebrow">Câu hỏi thường gặp</p>
          <h2 id="faq-title" className="section-title mt-3">
            Giải đáp thắc mắc về kiến trúc
          </h2>
          <div className="mt-8">
            <FaqAccordion />
          </div>
        </section>

        {/* CTA */}
        <div className="border-t border-line pt-10 text-center">
          <p className="text-muted">Muốn bắt đầu sử dụng AI Desk?</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a href="/install" className="btn-primary">
              Hướng dẫn cài đặt
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="/prompts" className="btn-secondary-dark">
              Khám phá Prompt Library
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
