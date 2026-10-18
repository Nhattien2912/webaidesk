import React, { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  HelpCircle,
  Info,
  Monitor,
  Puzzle,
  Shield,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react'

// Copy-to-clipboard utility
const useCopy = () => {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // ignore
    }
  }
  return { copied, copy }
}

// Code block with copy button
const CodeBlock: React.FC<{ code: string; id: string }> = ({ code, id }) => {
  const { copied, copy } = useCopy()
  return (
    <div className="premium-code relative mt-3 overflow-hidden rounded-[10px] border border-line bg-navy-900">
      <pre className="overflow-x-auto px-4 py-3 pr-12 text-sm text-slate-300">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={() => copy(code, id)}
        aria-label="Sao chép"
        className="absolute right-2 top-2 rounded-md border border-line bg-navy-800 p-1.5 text-subtle hover:text-white"
      >
        {copied === id ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
// Step header
const StepHeader: React.FC<{
  number: string
  icon: React.ElementType
  title: string
  subtitle?: string
}> = ({ number, icon: Icon, title, subtitle }) => (
  <div className="flex items-start gap-4">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-mono text-sm font-bold text-accent-light">
      {number}
    </div>
    <div>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-accent-light" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  </div>
)

// Info callout
const InfoBox: React.FC<{
  type: 'info' | 'warning' | 'success' | 'danger'
  children: React.ReactNode
}> = ({ type, children }) => {
  const styles = {
    info: 'border-accent/20 bg-accent/[0.04] text-accent-light',
    warning: 'border-amber-400/20 bg-amber-400/[0.04] text-amber-300',
    success: 'border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-300',
    danger: 'border-red-400/20 bg-red-400/[0.04] text-red-300',
  }
  const icons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle2,
    danger: AlertTriangle,
  }
  const Icon = icons[type]
  return (
    <div className={`mt-4 flex gap-3 rounded-card border p-4 text-sm ${styles[type]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="text-muted">{children}</div>
    </div>
  )
}
// FAQ accordion for troubleshooting
const TROUBLE_FAQS = [
  {
    q: 'Extension không kết nối với AI Desk Desktop',
    a: 'Kiểm tra AI Desk Desktop đang chạy (icon trong system tray). Đảm bảo extension được bật trong trình duyệt. Thử refresh trang ChatGPT Web và kiểm tra lại trạng thái extension.',
  },
  {
    q: 'Worker không phản hồi sau khi gửi yêu cầu',
    a: 'Kiểm tra cửa sổ worker (Codex/Claude Code) đang mở và ở đúng phiên đã gán. Xem tab Monitor trong AI Desk Desktop để biết yêu cầu đã được nhận chưa. Nếu worker đang bận, chờ thêm hoặc tắt và mở lại phiên worker.',
  },
  {
    q: 'Sai phiên chat — yêu cầu gửi vào cuộc trò chuyện khác',
    a: 'Đây là Session Binding đang hoạt động. AI Desk phát hiện phiên worker không khớp và dừng lại. Vào AI Desk Desktop, vào phần cài đặt Worker, chọn đúng phiên ChatGPT/Claude Code đang mở, sau đó thử lại.',
  },
  {
    q: 'Không nhận được kết quả từ worker',
    a: 'Kiểm tra Result Store trong AI Desk Desktop (tính năng đang phát triển). Trong giai đoạn Alpha, một số bước cần sao chép kết quả thủ công từ cửa sổ worker về ChatGPT Web.',
  },
  {
    q: 'Lỗi quyền truy cập hoặc antivirus chặn AI Desk',
    a: 'Không tắt antivirus và không thêm ngoại lệ chỉ để chạy ứng dụng. Dừng lại, đối chiếu SHA-256 với trang Download và chỉ tiếp tục sau khi bạn đã xác minh đúng tệp từ kênh chính thức.',
  },
  {
    q: 'Hết quota ChatGPT hoặc worker',
    a: 'Quota là giới hạn của nhà cung cấp dịch vụ, không phải AI Desk. Chờ quota reset hoặc nâng cấp plan của dịch vụ tương ứng. AI Desk không thể tăng quota cho bạn.',
  },
  {
    q: 'Lỗi tương thích sau khi Codex hoặc Claude cập nhật',
    a: 'AI Desk điều khiển giao diện ứng dụng. Khi app cập nhật UI, adapter cần cập nhật theo. Kiểm tra changelog của AI Desk để biết phiên bản nào tương thích với phiên bản worker bạn đang dùng.',
  },
]

const TroubleshootingAccordion: React.FC = () => {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="space-y-2">
      {TROUBLE_FAQS.map((item, i) => (
        <div key={i} className="card overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="flex w-full items-start gap-3 p-4 text-left"
          >
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
            <span className="flex-1 text-sm font-medium text-white">{item.q}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-subtle transition-transform ${open === i ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {open === i && (
            <div className="border-t border-line px-4 pb-4 pt-3">
              <p className="text-sm leading-relaxed text-muted">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
// Sidebar table of contents
const TOC_ITEMS = [
  { id: 'step-1', label: '1. Chuẩn bị' },
  { id: 'step-2', label: '2. Tải AI Desk' },
  { id: 'step-3', label: '3. Cài AI Desk Desktop' },
  { id: 'step-4', label: '4. Cài Extension' },
  { id: 'step-5', label: '5. Kết nối GPT Web' },
  { id: 'step-6', label: '6. Thiết lập Worker' },
  { id: 'step-7', label: '7. Nạp Prompt Manager' },
  { id: 'step-8', label: '8. Tác vụ đầu tiên' },
  { id: 'step-9', label: '9. Xử lý sự cố' },
]

export const InstallPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('step-1')

  const handleTocClick = (id: string) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="premium-page">
      {/* Hero */}
      <div className="border-b border-white/[0.06] bg-navy-950">
        <div className="container-content py-14 sm:py-16">
          <a href="/" className="text-sm font-medium text-accent-light hover:underline">
            ← Về trang chủ
          </a>
          <p className="eyebrow mt-6">Bắt đầu sử dụng</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Hướng dẫn cài đặt AI Desk
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Hướng dẫn từng bước từ tải AI Desk đến thực hiện tác vụ đầu tiên với GPT Manager và
            worker. Không cần kiến thức lập trình.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.05] px-3 py-1.5 text-sm text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Hiện có gói RAR 0.2 Beta chưa ký số. Hãy đọc cảnh báo và đối chiếu SHA-256 trên trang Download trước khi mở tệp.
          </div>
        </div>
      </div>

      <div className="container-content py-12">
        <div className="relative gap-12 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Sidebar TOC (desktop) */}
          <aside className="hidden lg:block">
            <nav
              aria-label="Mục lục"
              className="sticky top-20 rounded-card border border-line bg-navy-900 p-4"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle">
                Mục lục
              </p>
              <ul className="space-y-1">
                {TOC_ITEMS.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleTocClick(item.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        activeSection === item.id
                          ? 'bg-accent/10 font-medium text-accent-light'
                          : 'text-muted hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main content */}
          <div className="space-y-16">
            {/* Step 1: Prerequisites */}
            <section id="step-1" className="scroll-mt-20">
              <StepHeader number="1" icon={Monitor} title="Chuẩn bị" subtitle="Những thứ cần có trước khi bắt đầu" />
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold text-white">Yêu cầu hệ thống</h3>
                <ul className="space-y-2 text-sm text-muted">
                  {[
                    'Windows 10 (64-bit) trở lên',
                    'Trình duyệt Chrome hoặc Brave (để dùng GPT Bridge Extension)',
                    'Kết nối internet ổn định',
                    'Đủ RAM để chạy AI Desk Desktop cùng các ứng dụng AI worker',
                  ].map((req) => (
                    <li key={req} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                      {req}
                    </li>
                  ))}
                </ul>

                <h3 className="mt-6 font-semibold text-white">Ứng dụng AI cần có</h3>
                <p className="text-sm text-muted">
                  AI Desk điều phối các ứng dụng AI đã cài sẵn trên máy. Bạn cần ít nhất một trong
                  những ứng dụng sau:
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      name: 'Codex (GitHub Copilot / VS Code)',
                      status: 'Hỗ trợ trong RC1',
                      color: 'text-emerald-300',
                    },
                    {
                      name: 'Claude Code (Anthropic)',
                      status: 'Hỗ trợ trong RC1',
                      color: 'text-emerald-300',
                    },
                    {
                      name: 'Antigravity IDE',
                      status: 'Đang thử nghiệm',
                      color: 'text-amber-300',
                    },
                    {
                      name: 'ChatGPT Web (Manager)',
                      status: 'Bắt buộc',
                      color: 'text-accent-light',
                    },
                  ].map(({ name, status, color }) => (
                    <div key={name} className="card p-3 text-sm">
                      <span className="font-medium text-ink">{name}</span>
                      <span className={`mt-1 block text-xs ${color}`}>{status}</span>
                    </div>
                  ))}
                </div>

                <h3 className="mt-6 font-semibold text-white">Điều kiện sử dụng GPT Bridge</h3>
                <ul className="space-y-2 text-sm text-muted">
                  {[
                    'Tài khoản ChatGPT (miễn phí hoặc Plus)',
                    'Trình duyệt Chrome hoặc Brave phiên bản mới nhất',
                    'Cho phép extension có quyền đọc trang ChatGPT Web',
                  ].map((req) => (
                    <li key={req} className="flex gap-2">
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Step 2: Download */}
            <section id="step-2" className="scroll-mt-20 border-t border-line pt-12">
              <StepHeader number="2" icon={Download} title="Tải AI Desk" subtitle="Lấy bản cài đặt từ kênh chính thức" />
              <div className="mt-6 space-y-4">
                <p className="text-sm leading-relaxed text-muted">
                  AI Desk được phân phối qua trang web chính thức. Không tải từ nguồn khác để đảm
                  bảo bảo mật.
                </p>

                <InfoBox type="warning">
                  <strong>Gói hiện tại chưa ký số.</strong> Chỉ dùng liên kết trên trang Download,
                  đối chiếu đúng tên tệp, dung lượng và SHA-256 được công bố. Không tắt antivirus
                  hoặc bỏ qua cảnh báo để ép chạy tệp.
                </InfoBox>

                <div className="card p-5">
                  <h3 className="font-semibold text-white">Gói đang được công bố</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <span className="badge mt-0.5 bg-accent/10 text-accent-light ring-1 ring-accent/30">
                        0.2 Beta
                      </span>
                      <div>
                        <span className="font-medium text-ink">Gói Windows x64 (.rar)</span>
                        <p className="mt-0.5 text-muted">
                          Đây là gói RAR chưa ký số. Danh tính tệp, dung lượng và SHA-256 được hiển
                          thị trên trang Download để người dùng tự đối chiếu.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <a href="/download" className="btn-primary">
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Đến trang tải xuống
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </section>

            {/* Step 3: Install Desktop */}
            <section id="step-3" className="scroll-mt-20 border-t border-line pt-12">
              <StepHeader
                number="3"
                icon={Monitor}
                title="Cài AI Desk Desktop"
                subtitle="Xác minh gói hiện có trước khi mở"
              />
              <div className="mt-6 space-y-4">
                <InfoBox type="info">
                  Website mới chỉ xác minh danh tính gói tải 0.2 Beta ở mức tên tệp, dung lượng và
                  SHA-256. Quy trình bên trong gói RAR chưa được xác minh độc lập trong task này.
                </InfoBox>

                <h3 className="mt-4 font-semibold text-white">Gói 0.2 Beta (.rar)</h3>
                <ol className="space-y-3 text-sm text-muted">
                  {[
                    'Tải gói .rar bằng nút duy nhất trên trang /download.',
                    'Đối chiếu tên tệp, dung lượng và SHA-256 với giá trị công bố trên trang đó.',
                    'Quét tệp bằng Windows Security hoặc công cụ bảo mật bạn tin cậy.',
                    'Chỉ giải nén sau khi các bước xác minh hoàn tất; nếu có cảnh báo hoặc hash lệch, hãy dừng lại.',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-xs font-bold text-subtle">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>

                <InfoBox type="warning">
                  Tên executable, hành vi installer và các bước sau khi giải nén chưa được xác minh
                  từ artifact trong task này. Trang này không đoán các bước đó.
                </InfoBox>

                <InfoBox type="danger">
                  <strong>Quan trọng về bảo mật:</strong> Không tắt Windows Defender, không thêm
                  ngoại lệ và không bỏ qua SmartScreen chỉ để chạy AI Desk. Gói hiện tại chưa ký số.
                </InfoBox>
              </div>
            </section>

            {/* Step 4: Extension */}
            <section id="step-4" className="scroll-mt-20 border-t border-line pt-12">
              <StepHeader
                number="4"
                icon={Puzzle}
                title="Cài GPT Bridge Extension"
                subtitle="Kết nối ChatGPT Web với AI Desk Desktop"
              />
              <div className="mt-6 space-y-4">
                <p className="text-sm leading-relaxed text-muted">
                  GPT Bridge Extension cho phép ChatGPT Web gửi và nhận tín hiệu từ AI Desk
                  Desktop. Đây là cầu nối quan trọng trong hệ thống.
                </p>

                <InfoBox type="warning">
                  Extension chưa có trên Chrome Web Store công khai. Bản phân phối đi kèm với AI
                  Desk Desktop khi được phát hành. Không cài extension từ nguồn không chính thức.
                </InfoBox>

                <h3 className="mt-4 font-semibold text-white">Cài thủ công (Developer Mode)</h3>
                <p className="text-sm text-muted">
                  Trong giai đoạn Alpha/Beta, extension được cài qua chế độ Developer của trình
                  duyệt:
                </p>
                <ol className="space-y-3 text-sm text-muted">
                  {[
                    'Mở Chrome hoặc Brave. Vào địa chỉ: chrome://extensions/',
                    'Bật chế độ "Developer mode" ở góc trên phải.',
                    'Nhấn "Load unpacked" và chọn thư mục extension đi kèm AI Desk.',
                    'Extension sẽ xuất hiện trong danh sách. Xác nhận icon extension hiện trên thanh công cụ.',
                    'Ghim extension để dễ kiểm tra trạng thái kết nối.',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-xs font-bold text-subtle">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* Step 5: Connect GPT Web */}
            <section id="step-5" className="scroll-mt-20 border-t border-line pt-12">
              <StepHeader
                number="5"
                icon={Wifi}
                title="Kết nối GPT Web"
                subtitle="Kiểm tra GPT Bridge đang hoạt động"
              />
              <div className="mt-6 space-y-4">
                <p className="text-sm leading-relaxed text-muted">
                  GPT Bridge là kênh giao tiếp giữa ChatGPT Web và AI Desk Desktop. Sau khi cài
                  extension, cần xác nhận kết nối đang hoạt động.
                </p>

                <div className="card p-5">
                  <h3 className="font-semibold text-white">Các trạng thái kết nối</h3>
                  <ul className="mt-4 space-y-3 text-sm">
                    {[
                      {
                        state: '🟢 Đã kết nối',
                        desc: 'Extension đang giao tiếp được với AI Desk Desktop. Sẵn sàng nhận nhiệm vụ.',
                        color: 'text-emerald-300',
                      },
                      {
                        state: '🟡 Đang kết nối',
                        desc: 'Extension đang cố gắng kết nối. Chờ vài giây hoặc thử refresh trang.',
                        color: 'text-amber-300',
                      },
                      {
                        state: '🔴 Mất kết nối',
                        desc: 'AI Desk Desktop không chạy hoặc extension bị tắt. Kiểm tra lại AI Desk Desktop.',
                        color: 'text-red-300',
                      },
                    ].map(({ state, desc, color }) => (
                      <li key={state} className="flex gap-3">
                        <span className={`font-medium ${color}`}>{state}</span>
                        <span className="text-muted">{desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <h3 className="mt-4 font-semibold text-white">Kiểm tra kết nối</h3>
                <ol className="space-y-2 text-sm text-muted">
                  {[
                    'Đảm bảo AI Desk Desktop đang chạy (icon trong system tray).',
                    'Mở ChatGPT Web trong Chrome/Brave.',
                    'Nhìn vào icon extension trên thanh công cụ — màu xanh là đã kết nối.',
                    'Thử hover vào icon để xem trạng thái chi tiết.',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-mono text-subtle">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* Step 6: Setup Workers */}
            <section id="step-6" className="scroll-mt-20 border-t border-line pt-12">
              <StepHeader
                number="6"
                icon={Zap}
                title="Thiết lập Worker"
                subtitle="Gán phiên cho từng AI worker"
              />
              <div className="mt-6 space-y-4">
                <p className="text-sm leading-relaxed text-muted">
                  Mỗi worker cần được gán với một phiên cụ thể (cửa sổ ứng dụng đang mở). AI Desk
                  sẽ kiểm tra phiên này trước mỗi lần giao việc.
                </p>

                <div className="space-y-4">
                  {[
                    {
                      name: 'Codex',
                      steps: [
                        'Mở ứng dụng Codex trên Windows.',
                        'Trong AI Desk Desktop, vào mục Workers → Codex.',
                        'Nhấn "Gán phiên" và chọn cửa sổ Codex đang mở.',
                        'Xác nhận phiên đã được gán — trạng thái chuyển sang màu xanh.',
                      ],
                      status: 'Hỗ trợ RC1',
                      statusColor: 'text-emerald-300',
                    },
                    {
                      name: 'Claude Code',
                      steps: [
                        'Mở Claude Code trên Windows.',
                        'Trong AI Desk Desktop, vào mục Workers → Claude Code.',
                        'Nhấn "Gán phiên" và chọn cửa sổ Claude Code đang mở.',
                        'Kiểm tra trạng thái kết nối.',
                      ],
                      status: 'Hỗ trợ RC1',
                      statusColor: 'text-emerald-300',
                    },
                    {
                      name: 'Antigravity IDE',
                      steps: ['Adapter đang thử nghiệm. Theo dõi changelog để biết khi nào được hỗ trợ chính thức.'],
                      status: 'Đang thử nghiệm',
                      statusColor: 'text-amber-300',
                    },
                  ].map(({ name, steps, status, statusColor }) => (
                    <div key={name} className="card p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">{name}</h3>
                        <span className={`text-xs font-medium ${statusColor}`}>{status}</span>
                      </div>
                      <ol className="mt-4 space-y-2 text-sm text-muted">
                        {steps.map((s, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="font-mono text-subtle">{i + 1}.</span>
                            {s}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Step 7: Load Prompt */}
            <section id="step-7" className="scroll-mt-20 border-t border-line pt-12">
              <StepHeader
                number="7"
                icon={ExternalLink}
                title="Nạp Prompt Manager"
                subtitle="Gửi prompt khởi tạo vào ChatGPT Web"
              />
              <div className="mt-6 space-y-4">
                <p className="text-sm leading-relaxed text-muted">
                  Thư viện Prompt hiện chỉ công bố mẫu action có schema được đối chiếu với source.
                  Đây không phải bộ quy tắc Manager hoàn chỉnh và chưa được xác minh với artifact 0.2 Beta.
                </p>

                <ol className="space-y-3 text-sm text-muted">
                  {[
                    'Vào trang Thư viện Prompt và đọc phạm vi xác minh của từng mẫu.',
                    'Nhấn nút "Sao chép" trên mẫu muốn dùng.',
                    'Mở ChatGPT Web, bắt đầu cuộc trò chuyện mới.',
                    'Dán prompt vào ô nhập tin nhắn và gửi.',
                    'Kiểm tra JSON tạo ra trước khi để AI Desk tiếp nhận action.',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-xs font-bold text-subtle">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>

                <InfoBox type="info">
                  Không có prompt Resume Session hay protocol quản lý session nào được công bố ở
                  đây khi chưa có nguồn xác minh tương ứng.
                </InfoBox>

                <div className="mt-4">
                  <a href="/prompts" className="btn-primary">
                    Mở Thư viện Prompt
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </section>

            {/* Step 8: First Task */}
            <section id="step-8" className="scroll-mt-20 border-t border-line pt-12">
              <StepHeader
                number="8"
                icon={Zap}
                title="Chạy tác vụ đầu tiên"
                subtitle="Kiểm tra toàn bộ hệ thống hoạt động"
              />
              <div className="mt-6 space-y-4">
                <p className="text-sm leading-relaxed text-muted">
                  Sau khi đã thiết lập xong, thử một nhiệm vụ đơn giản để xác nhận mọi thứ kết nối
                  đúng.
                </p>

                <div className="card p-5">
                  <h3 className="font-semibold text-white">Ví dụ nhiệm vụ kiểm tra</h3>
                  <p className="mt-2 text-sm text-muted">
                    Nói với GPT Manager (sau khi đã nạp prompt):
                  </p>
                  <CodeBlock
                    code={`Hãy dùng Codex để viết một hàm Python tính giai thừa của một số nguyên dương.`}
                    id="first-task"
                  />
                </div>

                <h3 className="mt-4 font-semibold text-white">Vòng đời thực thi</h3>
                <ol className="space-y-3 text-sm text-muted">
                  {[
                    'GPT Manager nhận yêu cầu, tạo requestId và giao việc cho Codex.',
                    'AI Desk Desktop nhận lệnh từ GPT Bridge và chuyển vào cửa sổ Codex.',
                    'Codex thực hiện nhiệm vụ (viết code).',
                    'Kết quả được thu lại và gửi về ChatGPT Web.',
                    'GPT Manager hiển thị kết quả và hỏi bạn có muốn tiếp tục không.',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent-light">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>

                <InfoBox type="info">
                  Trong giai đoạn Alpha, một số bước có thể cần sao chép thủ công giữa các cửa
                  sổ. Đây là giới hạn đã biết — tự động hoàn toàn đang được phát triển.
                </InfoBox>
              </div>
            </section>

            {/* Step 9: Troubleshooting */}
            <section id="step-9" className="scroll-mt-20 border-t border-line pt-12">
              <StepHeader
                number="9"
                icon={Wrench}
                title="Xử lý sự cố"
                subtitle="Giải pháp cho các vấn đề thường gặp"
              />
              <div className="mt-6">
                <TroubleshootingAccordion />
              </div>
              <InfoBox type="info">
                Không tìm thấy giải pháp? Xem{' '}
                <a href="/tutorials" className="text-accent-light hover:underline">
                  video hướng dẫn
                </a>{' '}
                hoặc theo dõi{' '}
                <a href="/#community" className="text-accent-light hover:underline">
                  kênh cộng đồng
                </a>{' '}
                để được hỗ trợ.
              </InfoBox>
            </section>

            {/* Security note */}
            <div className="rounded-card border border-white/[0.06] bg-navy-900 p-6">
              <div className="flex gap-4">
                <Shield className="h-6 w-6 shrink-0 text-accent-light" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-white">Lưu ý về bảo mật</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Control API trong source lắng nghe trên <code className="text-accent-light">127.0.0.1</code> và
                    dùng token/scopes. Điều đó không có nghĩa toàn bộ ứng dụng không tạo kết nối mạng.
                    Không chia sẻ token điều khiển hoặc thông tin phiên của bạn.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation links */}
            <div className="border-t border-line pt-8">
              <div className="flex flex-wrap gap-3">
                <a href="/prompts" className="btn-primary">
                  Thư viện Prompt
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a href="/tutorials" className="btn-secondary-dark">
                  Video hướng dẫn
                </a>
                <a href="/roadmap" className="btn-secondary-dark">
                  Lộ trình phát triển
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
