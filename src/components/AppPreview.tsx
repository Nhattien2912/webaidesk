import React from 'react'
import {
  Activity,
  Briefcase,
  CheckCircle2,
  FolderOpen,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Loader2,
  MessagesSquare,
  Minus,
  Settings,
  Square,
  Target,
  Users,
  X,
} from 'lucide-react'
import mark from '../assets/brand/aidesk-mark.png'

// Product-faithful illustration of the AI Desk desktop app (Electron renderer, Desk V2 layout).
// Structure and labels follow the real UI in AI-Desk/src/renderer (sidebar routes, Desk cards,
// Monitor timeline + Multi-Session Shadow panel, Sessions per provider). Everything shown is
// example data: no real IDs, HWND/PID, tokens, quota values or logs. It is NOT a screenshot.

export type PreviewScreen = 'desk' | 'monitor' | 'sessions'

const ROUTES: Array<{ key: string; label: string; icon: typeof Activity; screen?: PreviewScreen }> = [
  { key: 'desk', label: 'Desk', icon: LayoutDashboard, screen: 'desk' },
  { key: 'monitor', label: 'Monitor', icon: Activity, screen: 'monitor' },
  { key: 'mission', label: 'Mission', icon: Target },
  { key: 'jobs', label: 'Công việc', icon: Briefcase },
  { key: 'sessions', label: 'Phiên', icon: MessagesSquare, screen: 'sessions' },
  { key: 'projects', label: 'Projects', icon: FolderOpen },
  { key: 'workers', label: 'Workers', icon: Users },
  { key: 'quota', label: 'Hạn mức & định tuyến', icon: Gauge },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'control', label: 'Control API', icon: KeyRound },
]

const Chip: React.FC<{ tone?: 'ok' | 'busy' | 'idle' | 'warn'; children: React.ReactNode }> = ({ tone = 'idle', children }) => {
  const cls = {
    ok: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
    busy: 'bg-accent/15 text-accent-light ring-accent/25',
    idle: 'bg-white/[0.05] text-slate-300 ring-white/10',
    warn: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
  }[tone]
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-px text-[9px] font-medium ring-1 ${cls}`}>{children}</span>
}

const Card: React.FC<{ title: string; action?: string; className?: string; children: React.ReactNode }> = ({
  title,
  action,
  className = '',
  children,
}) => (
  <div className={`rounded-md border border-white/[0.07] bg-white/[0.025] p-2.5 ${className}`}>
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-[10px] font-semibold text-slate-200">{title}</span>
      {action && <span className="rounded border border-white/10 px-1.5 text-[8px] text-slate-400">{action}</span>}
    </div>
    {children}
  </div>
)

const Line: React.FC<{ w: string }> = ({ w }) => <div className={`h-1.5 rounded bg-white/[0.08] ${w}`} />

const DeskScreen: React.FC = () => (
  <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-400/15 bg-emerald-400/[0.04] px-2.5 py-1.5">
      <CheckCircle2 className="h-3 w-3 text-emerald-300" />
      <span className="text-[10px] font-semibold text-slate-100">Hệ thống sẵn sàng</span>
      <Chip>Flow 1</Chip>
      <Chip>Worker 2/3 sẵn sàng</Chip>
      <span className="ml-auto rounded border border-white/10 px-1.5 text-[8px] text-slate-400">Hội thoại chung</span>
    </div>

    <div className="grid grid-cols-3 gap-2 max-md:grid-cols-1">
      <Card title="Quota AI workers">
        <div className="space-y-1.5">
          {[
            ['Codex', 'w-7/12'],
            ['Claude', 'w-4/12'],
          ].map(([name, w]) => (
            <div key={name}>
              <div className="mb-0.5 text-[9px] text-slate-400">{name}</div>
              <div className="h-1 rounded bg-white/[0.06]">
                <div className={`h-1 rounded bg-accent/70 ${w}`} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Flow đang chạy">
        <div className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 text-accent-light motion-safe:animate-spin" />
          <span className="text-[10px] text-slate-200">Codex</span>
          <Chip tone="busy">RUNNING</Chip>
        </div>
        <div className="mt-1.5 text-[9px] text-slate-500">Đã chuyển yêu cầu · chờ kết quả</div>
      </Card>
      <Card title="GPT Bridge Extension">
        <div className="flex flex-wrap gap-1">
          {['Extension', 'Native Host', 'GPT Tab', 'Conversation', 'Transport', 'GPT Return'].map((p) => (
            <Chip key={p} tone="ok">
              {p}
            </Chip>
          ))}
        </div>
      </Card>
    </div>

    <div className="grid grid-cols-[0.95fr_1.25fr] gap-2 max-md:grid-cols-1">
      <div className="space-y-2">
        <Card title="Workers" action="Workers">
          <div className="grid grid-cols-2 gap-1.5">
            {[
              ['GPTWeb', 'Manager', 'ok', 'Đã liên kết'],
              ['Codex', 'Worker', 'busy', 'Đang chạy'],
              ['Claude', 'Worker', 'idle', 'Sẵn sàng'],
              ['Antigravity', 'Thử nghiệm', 'warn', 'Chưa kết nối'],
            ].map(([name, role, tone, state]) => (
              <div key={name} className="rounded border border-white/[0.06] bg-black/20 p-1.5">
                <div className="text-[10px] font-medium text-slate-100">{name}</div>
                <div className="mb-1 text-[8px] text-slate-500">{role}</div>
                <Chip tone={tone as 'ok' | 'busy' | 'idle' | 'warn'}>{state}</Chip>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Phiên đã chọn" action="Phiên">
          <ul className="space-y-1">
            {[
              ['GPT Manager', 'ok', 'Đúng phiên'],
              ['Codex', 'ok', 'Đúng phiên'],
              ['Claude', 'idle', 'Chưa chọn'],
            ].map(([name, tone, state]) => (
              <li key={name} className="flex items-center justify-between text-[9px] text-slate-300">
                {name}
                <Chip tone={tone as 'ok' | 'idle'}>{state}</Chip>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="Hội thoại chung" action="Phóng to">
        <div className="space-y-2">
          {[
            ['GPT Manager → Codex', ['w-11/12', 'w-8/12']],
            ['Codex · kết quả', ['w-10/12', 'w-9/12', 'w-6/12']],
            ['AI Desk → GPT Manager', ['w-7/12']],
          ].map(([label, lines]) => (
            <div key={label as string} className="rounded border border-white/[0.06] bg-black/20 p-1.5">
              <div className="mb-1 text-[8px] font-medium uppercase tracking-wide text-slate-500">{label as string}</div>
              <div className="space-y-1">
                {(lines as string[]).map((w, i) => (
                  <Line key={i} w={w} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>
)

const MonitorScreen: React.FC = () => (
  <div className="space-y-2">
    <Card title="Shadow routing (read-only)">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[8px] uppercase tracking-wide text-slate-500">Multi-Session · shadow</span>
        <Chip>SHADOW_ONLY</Chip>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[9px]">
        <span className="text-slate-500">Jobs</span>
        <span className="text-slate-300">Quan sát, không chặn luồng thật</span>
        <span className="text-slate-500">Worker instances</span>
        <span className="text-slate-300">Theo dõi phiên đã gắn của từng worker</span>
      </div>
    </Card>
    <Card title="Timeline & system events" action="Clear">
      <div className="mb-2 flex gap-1.5">
        <span className="rounded border border-white/10 px-1.5 py-px text-[8px] text-slate-400">All event types</span>
        <span className="rounded border border-white/10 px-1.5 py-px text-[8px] text-slate-400">All workers</span>
      </div>
      <ol className="space-y-1.5">
        {[
          ['10:02', 'gpt', 'Nhận yêu cầu từ GPT Manager'],
          ['10:02', 'flow', 'Kiểm tra phiên Codex: đúng phiên'],
          ['10:03', 'codex', 'Đã chuyển yêu cầu tới Codex'],
          ['10:09', 'codex', 'Đã thu kết quả'],
          ['10:09', 'gpt', 'Trả kết quả về GPT Manager'],
        ].map(([t, type, text], i) => (
          <li key={i} className="flex items-center gap-2 text-[9px]">
            <span className="font-mono text-slate-500">{t}</span>
            <span className="w-10 shrink-0 rounded bg-white/[0.05] px-1 text-center font-mono text-[8px] text-slate-400">{type}</span>
            <span className="text-slate-300">{text}</span>
          </li>
        ))}
      </ol>
    </Card>
  </div>
)

const SessionsScreen: React.FC = () => (
  <div className="space-y-2">
    {[
      { provider: 'GPTWeb', rows: [['du-an-chinh', 'LOCKED', 'Primary'], ['thu-nghiem', 'IDLE', '']] },
      { provider: 'Codex', rows: [['feature-auth', 'ACTIVE', 'Đang dùng']] },
      { provider: 'Claude', rows: [['review', 'IDLE', '']] },
    ].map(({ provider, rows }) => (
      <Card key={provider} title={`${provider} (${rows.length})`}>
        <table className="w-full text-left text-[9px]">
          <thead>
            <tr className="text-slate-500">
              <th className="pb-1 font-medium">Session</th>
              <th className="pb-1 font-medium">Status</th>
              <th className="pb-1 font-medium">Bound window</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, status, note]) => (
              <tr key={name} className="border-t border-white/[0.05] text-slate-300">
                <td className="py-1">{name}</td>
                <td className="py-1">
                  <Chip tone={status === 'IDLE' ? 'idle' : 'ok'}>{status}</Chip>
                </td>
                <td className="py-1 text-slate-500">{note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    ))}
  </div>
)

const SCREENS: Record<PreviewScreen, React.FC> = { desk: DeskScreen, monitor: MonitorScreen, sessions: SessionsScreen }
const LABELS: Record<PreviewScreen, string> = {
  desk: 'màn hình Desk: GPT Bridge, Quota, Flow đang chạy, Workers, Phiên đã chọn và Hội thoại chung',
  monitor: 'màn hình Monitor: bảng Shadow routing và timeline sự kiện',
  sessions: 'màn hình Phiên: danh sách phiên đã gắn cho từng worker',
}

export const AppPreview: React.FC<{ screen?: PreviewScreen; className?: string; caption?: boolean }> = ({
  screen = 'desk',
  className = '',
  caption = true,
}) => {
  const Screen = SCREENS[screen]
  return (
    <figure className={className}>
      <div
        role="img"
        aria-label={`Minh họa giao diện AI Desk trên Windows — ${LABELS[screen]}. Dữ liệu là ví dụ.`}
        className="app-preview-dark overflow-hidden rounded-xl border border-slate-700 bg-navy-900 shadow-2xl shadow-slate-950/35"
      >
        <div aria-hidden="true" className="select-none">
          {/* Windows title bar */}
          <div className="flex h-8 items-center justify-between border-b border-white/[0.06] bg-navy-950 pl-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <img src={mark} alt="" width={21} height={14} className="h-3.5 w-auto" />
              AI Desk
            </div>
            <div className="flex h-full text-slate-400">
              <span className="flex w-10 items-center justify-center"><Minus className="h-3 w-3" /></span>
              <span className="flex w-10 items-center justify-center"><Square className="h-2.5 w-2.5" /></span>
              <span className="flex w-10 items-center justify-center"><X className="h-3 w-3" /></span>
            </div>
          </div>
          {/* App top bar */}
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] bg-navy-900 px-3 py-1.5">
            <span className="text-[10px] font-semibold text-slate-200">AI Desk</span>
            <div className="flex gap-1">
              <Chip tone="ok">GPT Bridge ON</Chip>
              <Chip>Hotkeys OK</Chip>
            </div>
          </div>

          <div className="grid grid-cols-[148px_1fr] max-sm:grid-cols-1">
            <aside className="border-r border-white/[0.06] bg-navy-950/60 p-2 max-sm:hidden">
              <div className="mb-2 rounded border border-white/[0.06] px-2 py-1.5">
                <div className="text-[8px] uppercase tracking-wide text-slate-500">Workspace</div>
                <div className="text-[10px] font-medium text-slate-200">my-project</div>
              </div>
              <ul className="space-y-px">
                {ROUTES.map(({ key, label, icon: Icon, screen: s }) => (
                  <li
                    key={key}
                    className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] ${
                      s === screen ? 'bg-accent/15 text-white' : 'text-slate-400'
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 border-t border-white/[0.06] pt-2 text-[8px] uppercase tracking-wide text-slate-500">
                Dự án (2)
              </div>
            </aside>
            <div className="min-w-0 p-2.5">
              <Screen />
            </div>
          </div>
        </div>
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-xs text-subtle">
          Minh họa dựng theo giao diện thật của AI Desk, không phải ảnh chụp màn hình. Dữ liệu là ví dụ.
        </figcaption>
      )}
    </figure>
  )
}
