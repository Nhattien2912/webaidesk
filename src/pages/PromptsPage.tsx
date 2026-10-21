import React, { useState, useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  Filter,
  FlaskConical,
  Search,
  Shield,
  Tag,
  X,
  Zap,
} from 'lucide-react'
import type { PromptMeta, PromptStatus } from '../content/prompts'
import { usePageContent, type PageContent } from '../lib/usePageContent'
import type { PageDoc } from '../content/pageContent'

// Editorial content (texts, categories, prompts) comes from the page content registry: CMS-published values over code defaults.
// Status styling, copy/download behaviour and layout stay in code.
interface PromptCategory {
  id: string
  label: string
}
const STATUS_VALUES: PromptStatus[] = ['verified', 'experimental', 'coming-soon']
const toPrompt = (item: Record<string, string>): PromptMeta => ({
  id: item.id ?? '',
  title: item.title ?? '',
  description: item.description ?? '',
  category: item.category ?? '',
  mode: item.mode ?? '',
  workers: (item.workers ?? '').split(/\r?\n/).map((w) => w.trim()).filter(Boolean),
  aiDeskVersion: item.aiDeskVersion ?? '',
  status: STATUS_VALUES.includes(item.status as PromptStatus) ? (item.status as PromptStatus) : 'coming-soon',
  statusNote: item.statusNote ?? '',
  updatedAt: item.updatedAt ?? '',
  content: item.content ?? '',
})
const promptCategoriesOf = (c: PageContent): PromptCategory[] => [{ id: 'all', label: c.t('cat.allLabel') }, ...c.items('cat.items').map((cat) => ({ id: cat.id ?? '', label: cat.label ?? '' }))]

// Status badge config
const STATUS_CONFIG: Record<
  PromptStatus,
  { icon: typeof CheckCircle2; label: string; className: string }
> = {
  verified: {
    icon: CheckCircle2,
    label: 'Đã xác minh',
    className: 'bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/30',
  },
  experimental: {
    icon: FlaskConical,
    label: 'Thử nghiệm',
    className: 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30',
  },
  'coming-soon': {
    icon: Clock,
    label: 'Sắp có',
    className: 'bg-white/[0.04] text-subtle ring-1 ring-white/10',
  },
}

// Worker badge
const WorkerBadge: React.FC<{ worker: string }> = ({ worker }) => (
  <span className="badge bg-white/[0.04] text-subtle ring-1 ring-white/10">{worker}</span>
)

async function writeClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    textarea.remove()
    if (!copied) throw new Error('Clipboard copy was rejected')
  }
}

// Copy to clipboard hook
const useCopy = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copy = async (text: string, id: string) => {
    try {
      await writeClipboard(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2500)
    } catch {
      // Clipboard API not available
    }
  }
  return { copiedId, copy }
}

// Download prompt as .md file
const downloadPrompt = (prompt: PromptMeta) => {
  const content = `# ${prompt.title}\n\n${prompt.description}\n\n---\nVersion: ${prompt.aiDeskVersion}\nStatus: ${prompt.status}\nWorkers: ${prompt.workers.join(', ')}\nUpdated: ${prompt.updatedAt || 'N/A'}\n\n---\n\n${prompt.content}`
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-desk-prompt-${prompt.id}.md`
  a.click()
  URL.revokeObjectURL(url)
}

// Preview modal
const PromptModal: React.FC<{
  prompt: PromptMeta | null
  onClose: () => void
}> = ({ prompt, onClose }) => {
  const { copiedId, copy } = useCopy()
  if (!prompt) return null

  const statusConfig = STATUS_CONFIG[prompt.status]
  const StatusIcon = statusConfig.icon
  const isAvailable = prompt.status !== 'coming-soon'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={prompt.title}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 pt-12 sm:pt-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-card border border-line bg-navy-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${statusConfig.className}`}>
                <StatusIcon className="h-3 w-3" aria-hidden="true" />
                {statusConfig.label}
              </span>
              {prompt.workers.map((w) => (
                <WorkerBadge key={w} worker={w} />
              ))}
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white">{prompt.title}</h2>
            <p className="mt-1 text-sm text-muted">{prompt.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-subtle hover:bg-white/10 hover:text-white"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status note */}
        {prompt.statusNote && (
          <div className="border-b border-line px-5 py-3">
            <p className="flex gap-2 text-xs text-muted">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
              {prompt.statusNote}
            </p>
          </div>
        )}

        {/* Content */}
        {isAvailable ? (
          <div className="premium-code relative">
            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words px-5 py-4 font-mono text-[13px] leading-relaxed text-slate-300">
              {prompt.content}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-subtle">
            <Clock className="h-10 w-10 opacity-30" aria-hidden="true" />
            <p className="mt-3 font-medium text-muted">Prompt đang được chuẩn bị</p>
            <p className="mt-1 text-sm">Sẽ có khi bản phù hợp được phát hành</p>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <div className="text-xs text-subtle">
            {prompt.aiDeskVersion} · {prompt.updatedAt || 'Chưa cập nhật'}
          </div>
          {isAvailable && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copy(prompt.content, prompt.id)}
                className="btn border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-white hover:bg-white/[0.08]"
              >
                {copiedId === prompt.id ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    Đã sao chép!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Sao chép
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => downloadPrompt(prompt)}
                className="btn border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-white hover:bg-white/[0.08]"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Tải .md
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
// Prompt card
const PromptCard: React.FC<{
  prompt: PromptMeta
  categories: PromptCategory[]
  onPreview: (p: PromptMeta) => void
}> = ({ prompt, categories, onPreview }) => {
  const { copiedId, copy } = useCopy()
  const statusConfig = STATUS_CONFIG[prompt.status]
  const StatusIcon = statusConfig.icon
  const isAvailable = prompt.status !== 'coming-soon'
  const categoryLabel = categories.find((c) => c.id === prompt.category)?.label ?? prompt.category

  return (
    <article className="card flex flex-col overflow-hidden transition-colors hover:border-white/20">
      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${statusConfig.className}`}>
            <StatusIcon className="h-3 w-3" aria-hidden="true" />
            {statusConfig.label}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-subtle ring-1 ring-white/10">
            <Tag className="h-2.5 w-2.5" aria-hidden="true" />
            {categoryLabel}
          </span>
        </div>

        <h3 className="mt-3 font-semibold text-white">{prompt.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{prompt.description}</p>

        {/* Workers */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {prompt.workers.map((w) => (
            <WorkerBadge key={w} worker={w} />
          ))}
        </div>

        {/* Mode */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-subtle">
          <Zap className="h-3 w-3" aria-hidden="true" />
          {prompt.mode}
          {prompt.updatedAt && (
            <span className="ml-2 text-subtle">· {prompt.updatedAt}</span>
          )}
        </div>

        {/* Preview snippet */}
        {isAvailable && (
          <div className="premium-code mt-4 rounded-[10px] border border-line bg-navy-900 p-3">
            <p className="line-clamp-3 font-mono text-[11px] leading-relaxed text-slate-400">
              {prompt.content.slice(0, 200)}...
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onPreview(prompt)}
            className="btn flex-1 border border-white/15 bg-white/[0.04] py-2 text-xs text-white hover:bg-white/[0.08]"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Xem chi tiết
          </button>
          {isAvailable ? (
            <button
              type="button"
              onClick={() => copy(prompt.content, prompt.id)}
              className={`btn px-4 py-2 text-xs ${
                copiedId === prompt.id
                  ? 'border border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-300'
                  : 'btn-primary'
              }`}
            >
              {copiedId === prompt.id ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Đã sao chép
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Sao chép
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="btn cursor-not-allowed border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-subtle"
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Sắp có
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

// Quick start guide
const QuickStartGuide: React.FC<{ c: PageContent }> = ({ c }) => {
  const steps = c.items('qs.steps').map(({ label, desc, href }, index) => ({ step: String(index + 1), label, desc, href: href || '#' }))
  return (
    <div className="card p-6">
      <h2 className="font-semibold text-white">{c.t('qs.title')}</h2>
      <ol className="mt-5 space-y-3">
        {steps.map(({ step, label, desc, href }) => (
          <li key={step} className="flex items-start gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-mono text-xs font-bold text-accent-light">
              {step}
            </span>
            <div>
              {href !== '#' ? (
                <a href={href} className="font-medium text-accent-light hover:underline">
                  {label}
                </a>
              ) : (
                <span className="font-medium text-white">{label}</span>
              )}
              <p className="text-sm text-muted">{desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-card border border-amber-400/20 bg-amber-400/[0.04] p-3 text-xs text-muted">
        <strong className="text-amber-300">{c.t('qs.noteLead')}</strong> {c.t('qs.noteText')}
      </div>
    </div>
  )
}
type StatusFilter = PromptStatus | 'all'

export const PromptsPage: React.FC<{ content?: PageDoc | null; mediaBase?: string }> = ({ content, mediaBase }) => {
  const c = usePageContent('prompts', content, mediaBase)
  const prompts = useMemo(() => c.items('prompts.items').map(toPrompt), [c])
  const promptCategories = useMemo(() => promptCategoriesOf(c), [c])
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all')
  const [previewPrompt, setPreviewPrompt] = useState<PromptMeta | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return prompts.filter((p) => {
      const matchCat = activeCategory === 'all' || p.category === activeCategory
      const matchStatus = activeStatus === 'all' || p.status === activeStatus
      const matchQ =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.workers.some((w) => w.toLowerCase().includes(q))
      return matchCat && matchStatus && matchQ
    })
  }, [prompts, query, activeCategory, activeStatus])

  const statusFilters: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'verified', label: 'Đã xác minh' },
    { id: 'experimental', label: 'Thử nghiệm' },
    { id: 'coming-soon', label: 'Sắp có' },
  ]

  return (
    <div className="premium-page">
      {/* Hero */}
      <div className="border-b border-white/[0.06] bg-navy-950">
        <div className="container-content py-16 sm:py-20">
          <a href="/" className="text-sm font-medium text-accent-light hover:underline">
            ← Về trang chủ
          </a>
          <p className="eyebrow mt-6">{c.t('hero.eyebrow')}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {c.t('hero.title')}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            {c.t('hero.intro')}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <span className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-1.5 text-sm text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {c.t('hero.badge1')}
            </span>
            <span className="flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.05] px-3 py-1.5 text-sm text-amber-300">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
              {c.t('hero.badge2')}
            </span>
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-subtle">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {c.t('hero.badge3')}
            </span>
          </div>
        </div>
      </div>

      <div className="container-content gap-8 py-12 lg:grid lg:grid-cols-[1fr_300px]">
        {/* Main content */}
        <div>
          {/* Integrity callout */}
          {!c.hidden('integrity') && (
            <div className="mb-8 flex gap-3 rounded-card border border-accent/20 bg-accent/[0.04] p-4 text-sm text-muted">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
              <p>
                <strong className="text-accent-light">{c.t('integrity.lead')}</strong> {c.t('integrity.text')}
              </p>
            </div>
          )}

          {/* Search and filters */}
          <div className="mb-6 space-y-4">
            <div className="relative max-w-sm">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Tìm prompt..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="field pl-9"
                aria-label="Tìm kiếm prompt"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-subtle" aria-hidden="true" />
                <span className="text-xs text-subtle">Danh mục:</span>
              </div>
              {promptCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  aria-pressed={activeCategory === cat.id}
                  className={`badge px-3 py-1.5 text-[13px] transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-accent/15 text-accent-light ring-1 ring-accent/40'
                      : 'bg-white/[0.04] text-subtle hover:bg-white/[0.08] hover:text-ink ring-1 ring-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-subtle">Trạng thái:</span>
              {statusFilters.map((f) => {
                const config = f.id !== 'all' ? STATUS_CONFIG[f.id as PromptStatus] : null
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveStatus(f.id)}
                    aria-pressed={activeStatus === f.id}
                    className={`badge px-3 py-1.5 text-[13px] transition-colors ${
                      activeStatus === f.id
                        ? config?.className ?? 'bg-accent/15 text-accent-light ring-1 ring-accent/40'
                        : 'bg-white/[0.04] text-subtle hover:bg-white/[0.08] hover:text-ink ring-1 ring-white/10'
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Results */}
          <p className="mb-4 text-sm text-subtle" aria-live="polite">
            {filtered.length} prompt{query ? ` khớp với "${query}"` : ''}
          </p>

          {filtered.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {filtered.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} categories={promptCategories} onPreview={setPreviewPrompt} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <Search className="h-12 w-12 text-subtle opacity-30" aria-hidden="true" />
              <p className="mt-4 font-medium text-ink">Không tìm thấy prompt</p>
              <p className="mt-1 text-sm text-muted">
                Thử từ khóa khác hoặc chọn danh mục khác
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {!c.hidden('quickstart') && <QuickStartGuide c={c} />}

          {/* How to use prompts */}
          {!c.hidden('howto') && (
          <div className="card p-5">
            <h2 className="font-semibold text-white">{c.t('howto.title')}</h2>
            <ol className="mt-4 space-y-3 text-sm text-muted">
              {c.list('howto.steps').map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-xs font-bold text-subtle">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          )}

          {/* Warning */}
          {!c.hidden('warning') && (
          <div className="rounded-card border border-amber-400/20 bg-amber-400/[0.04] p-4 text-sm">
            <div className="flex gap-2 text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <strong>{c.t('warn.title')}</strong>
            </div>
            <ul className="mt-2 space-y-1 text-muted">
              {c.list('warn.items').map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </div>
          )}

          {/* Links */}
          <div className="space-y-2">
            <a href="/install" className="btn-primary w-full">
              {c.t('btn.install')}
            </a>
            <a href="/tutorials" className="btn-secondary-dark w-full">
              {c.t('btn.videos')}
            </a>
          </div>
        </aside>
      </div>

      {/* Prompt preview modal */}
      {previewPrompt && (
        <PromptModal prompt={previewPrompt} onClose={() => setPreviewPrompt(null)} />
      )}
    </div>
  )
}
