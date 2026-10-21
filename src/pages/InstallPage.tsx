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
import { MarkdownBody } from '../components/MarkdownBody'
import { usePageContent } from '../lib/usePageContent'
import type { PageDoc } from '../content/pageContent'
import './page-extra.css'

// Editorial text comes from the page content registry (CMS-published values over code defaults).
// Layout, icons, colours, links and behaviour below are code-controlled.
const TONE_CLASS: Record<string, string> = {
  emerald: 'text-emerald-300',
  amber: 'text-amber-300',
  accent: 'text-accent-light',
  red: 'text-red-300',
}
const toneClass = (tone: string | undefined): string => TONE_CLASS[tone ?? ''] ?? 'text-muted'

// Optional extra Markdown at the end of a section (empty by default => renders nothing, layout unchanged)
const Extra: React.FC<{ md: string; mediaBase?: string }> = ({ md, mediaBase }) =>
  md.trim() ? (
    <div className="page-extra mt-6 text-sm text-muted">
      <MarkdownBody mediaBase={mediaBase}>{md}</MarkdownBody>
    </div>
  ) : null

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
const TroubleshootingAccordion: React.FC<{ faqs: Array<Record<string, string>> }> = ({ faqs }) => {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="space-y-2">
      {faqs.map((item, i) => (
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

const NumberedSteps: React.FC<{ steps: string[]; tone?: 'neutral' | 'accent' }> = ({ steps, tone = 'neutral' }) => (
  <ol className="space-y-3 text-sm text-muted">
    {steps.map((step, i) => (
      <li key={i} className="flex gap-3">
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
            tone === 'accent' ? 'bg-accent/10' : 'bg-white/[0.04]'
          } text-xs font-bold ${tone === 'accent' ? 'text-accent-light' : 'text-subtle'}`}
        >
          {i + 1}
        </span>
        {step}
      </li>
    ))}
  </ol>
)

const MonoSteps: React.FC<{ steps: string[]; className?: string }> = ({ steps, className = '' }) => (
  <ol className={[className, 'space-y-2 text-sm text-muted'].filter(Boolean).join(' ')}>
    {steps.map((step, i) => (
      <li key={i} className="flex gap-2">
        <span className="font-mono text-subtle">{i + 1}.</span>
        {step}
      </li>
    ))}
  </ol>
)

export const InstallPage: React.FC<{ content?: PageDoc | null; mediaBase?: string }> = ({ content, mediaBase }) => {
  const c = usePageContent('install', content, mediaBase)
  const [activeSection, setActiveSection] = useState('step-1')
  const tocItems = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map((n) => ({ id: `step-${n}`, label: c.t(`toc.${n}`) }))
    .filter((item) => !c.hidden(item.id))

  const handleTocClick = (id: string) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // The first visible step has no top border/padding (as before when step 1 was first)
  const firstVisible = tocItems[0]?.id

  return (
    <div className="premium-page">
      {/* Hero */}
      <div className="border-b border-white/[0.06] bg-navy-950">
        <div className="container-content py-14 sm:py-16">
          <a href="/" className="text-sm font-medium text-accent-light hover:underline">
            ← Về trang chủ
          </a>
          <p className="eyebrow mt-6">{c.t('hero.eyebrow')}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {c.t('hero.title')}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{c.t('hero.intro')}</p>
          {c.t('hero.notice').trim() && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.05] px-3 py-1.5 text-sm text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {c.t('hero.notice')}
            </div>
          )}
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
                {c.t('toc.title')}
              </p>
              <ul className="space-y-1">
                {tocItems.map((item) => (
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
            {!c.hidden('step-1') && (
              <section id="step-1" className="scroll-mt-20">
                <StepHeader number="1" icon={Monitor} title={c.t('s1.title')} subtitle={c.t('s1.subtitle')} />
                <div className="mt-6 space-y-4">
                  <h3 className="font-semibold text-white">{c.t('s1.reqTitle')}</h3>
                  <ul className="space-y-2 text-sm text-muted">
                    {c.list('s1.reqs').map((req) => (
                      <li key={req} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                        {req}
                      </li>
                    ))}
                  </ul>

                  <h3 className="mt-6 font-semibold text-white">{c.t('s1.appsTitle')}</h3>
                  <p className="text-sm text-muted">{c.t('s1.appsIntro')}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {c.items('s1.apps').map(({ name, status, tone }) => (
                      <div key={name} className="card p-3 text-sm">
                        <span className="font-medium text-ink">{name}</span>
                        <span className={`mt-1 block text-xs ${toneClass(tone)}`}>{status}</span>
                      </div>
                    ))}
                  </div>

                  <h3 className="mt-6 font-semibold text-white">{c.t('s1.bridgeTitle')}</h3>
                  <ul className="space-y-2 text-sm text-muted">
                    {c.list('s1.bridgeReqs').map((req) => (
                      <li key={req} className="flex gap-2">
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-accent-light" aria-hidden="true" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                <Extra md={c.t('s1.extra')} mediaBase={c.mediaBase} />
              </section>
            )}

            {/* Step 2: Download */}
            {!c.hidden('step-2') && (
              <section id="step-2" className={`scroll-mt-20 ${firstVisible === 'step-2' ? '' : 'border-t border-line pt-12'}`}>
                <StepHeader number="2" icon={Download} title={c.t('s2.title')} subtitle={c.t('s2.subtitle')} />
                <div className="mt-6 space-y-4">
                  <p className="text-sm leading-relaxed text-muted">{c.t('s2.intro')}</p>

                  <InfoBox type="warning">
                    <strong>{c.t('s2.warnLead')}</strong> {c.t('s2.warnText')}
                  </InfoBox>

                  <div className="card p-5">
                    <h3 className="font-semibold text-white">{c.t('s2.pkgTitle')}</h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <span className="badge mt-0.5 bg-accent/10 text-accent-light ring-1 ring-accent/30">
                          {c.t('s2.pkgBadge')}
                        </span>
                        <div>
                          <span className="font-medium text-ink">{c.t('s2.pkgName')}</span>
                          <p className="mt-0.5 text-muted">{c.t('s2.pkgDesc')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <a href="/download" className="btn-primary">
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {c.t('s2.button')}
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
                <Extra md={c.t('s2.extra')} mediaBase={c.mediaBase} />
              </section>
            )}

            {/* Step 3: Install Desktop */}
            {!c.hidden('step-3') && (
              <section id="step-3" className={`scroll-mt-20 ${firstVisible === 'step-3' ? '' : 'border-t border-line pt-12'}`}>
                <StepHeader number="3" icon={Monitor} title={c.t('s3.title')} subtitle={c.t('s3.subtitle')} />
                <div className="mt-6 space-y-4">
                  <InfoBox type="info">{c.t('s3.info')}</InfoBox>

                  <h3 className="mt-4 font-semibold text-white">{c.t('s3.listTitle')}</h3>
                  <NumberedSteps steps={c.list('s3.steps')} />

                  <InfoBox type="warning">{c.t('s3.warn')}</InfoBox>

                  <InfoBox type="danger">
                    <strong>{c.t('s3.dangerLead')}</strong> {c.t('s3.danger')}
                  </InfoBox>
                </div>
                <Extra md={c.t('s3.extra')} mediaBase={c.mediaBase} />
              </section>
            )}

            {/* Step 4: Extension */}
            {!c.hidden('step-4') && (
              <section id="step-4" className={`scroll-mt-20 ${firstVisible === 'step-4' ? '' : 'border-t border-line pt-12'}`}>
                <StepHeader number="4" icon={Puzzle} title={c.t('s4.title')} subtitle={c.t('s4.subtitle')} />
                <div className="mt-6 space-y-4">
                  <p className="text-sm leading-relaxed text-muted">{c.t('s4.intro')}</p>

                  <InfoBox type="warning">{c.t('s4.warn')}</InfoBox>

                  <h3 className="mt-4 font-semibold text-white">{c.t('s4.listTitle')}</h3>
                  <p className="text-sm text-muted">{c.t('s4.listIntro')}</p>
                  <NumberedSteps steps={c.list('s4.steps')} />
                </div>
                <Extra md={c.t('s4.extra')} mediaBase={c.mediaBase} />
              </section>
            )}

            {/* Step 5: Connect GPT Web */}
            {!c.hidden('step-5') && (
              <section id="step-5" className={`scroll-mt-20 ${firstVisible === 'step-5' ? '' : 'border-t border-line pt-12'}`}>
                <StepHeader number="5" icon={Wifi} title={c.t('s5.title')} subtitle={c.t('s5.subtitle')} />
                <div className="mt-6 space-y-4">
                  <p className="text-sm leading-relaxed text-muted">{c.t('s5.intro')}</p>

                  <div className="card p-5">
                    <h3 className="font-semibold text-white">{c.t('s5.cardTitle')}</h3>
                    <ul className="mt-4 space-y-3 text-sm">
                      {c.items('s5.states').map(({ state, desc, tone }) => (
                        <li key={state} className="flex gap-3">
                          <span className={`font-medium ${toneClass(tone)}`}>{state}</span>
                          <span className="text-muted">{desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <h3 className="mt-4 font-semibold text-white">{c.t('s5.listTitle')}</h3>
                  <MonoSteps steps={c.list('s5.steps')} />
                </div>
                <Extra md={c.t('s5.extra')} mediaBase={c.mediaBase} />
              </section>
            )}

            {/* Step 6: Setup Workers */}
            {!c.hidden('step-6') && (
              <section id="step-6" className={`scroll-mt-20 ${firstVisible === 'step-6' ? '' : 'border-t border-line pt-12'}`}>
                <StepHeader number="6" icon={Zap} title={c.t('s6.title')} subtitle={c.t('s6.subtitle')} />
                <div className="mt-6 space-y-4">
                  <p className="text-sm leading-relaxed text-muted">{c.t('s6.intro')}</p>

                  <div className="space-y-4">
                    {c.items('s6.workers').map(({ name, steps: stepText, status, tone }) => (
                      <div key={name} className="card p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-white">{name}</h3>
                          <span className={`text-xs font-medium ${toneClass(tone)}`}>{status}</span>
                        </div>
                        <MonoSteps steps={(stepText ?? '').split(/\r?\n/).filter(Boolean)} className="mt-4" />
                      </div>
                    ))}
                  </div>
                </div>
                <Extra md={c.t('s6.extra')} mediaBase={c.mediaBase} />
              </section>
            )}

            {/* Step 7: Load Prompt */}
            {!c.hidden('step-7') && (
              <section id="step-7" className={`scroll-mt-20 ${firstVisible === 'step-7' ? '' : 'border-t border-line pt-12'}`}>
                <StepHeader number="7" icon={ExternalLink} title={c.t('s7.title')} subtitle={c.t('s7.subtitle')} />
                <div className="mt-6 space-y-4">
                  <p className="text-sm leading-relaxed text-muted">{c.t('s7.intro')}</p>

                  <NumberedSteps steps={c.list('s7.steps')} />

                  <InfoBox type="info">{c.t('s7.info')}</InfoBox>

                  <div className="mt-4">
                    <a href="/prompts" className="btn-primary">
                      {c.t('s7.button')}
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
                <Extra md={c.t('s7.extra')} mediaBase={c.mediaBase} />
              </section>
            )}

            {/* Step 8: First Task */}
            {!c.hidden('step-8') && (
              <section id="step-8" className={`scroll-mt-20 ${firstVisible === 'step-8' ? '' : 'border-t border-line pt-12'}`}>
                <StepHeader number="8" icon={Zap} title={c.t('s8.title')} subtitle={c.t('s8.subtitle')} />
                <div className="mt-6 space-y-4">
                  <p className="text-sm leading-relaxed text-muted">{c.t('s8.intro')}</p>

                  <div className="card p-5">
                    <h3 className="font-semibold text-white">{c.t('s8.cardTitle')}</h3>
                    <p className="mt-2 text-sm text-muted">{c.t('s8.cardIntro')}</p>
                    <CodeBlock code={c.t('s8.code')} id="first-task" />
                  </div>

                  <h3 className="mt-4 font-semibold text-white">{c.t('s8.listTitle')}</h3>
                  <NumberedSteps steps={c.list('s8.steps')} tone="accent" />

                  <InfoBox type="info">{c.t('s8.info')}</InfoBox>
                </div>
                <Extra md={c.t('s8.extra')} mediaBase={c.mediaBase} />
              </section>
            )}

            {/* Step 9: Troubleshooting */}
            {!c.hidden('step-9') && (
              <section id="step-9" className={`scroll-mt-20 ${firstVisible === 'step-9' ? '' : 'border-t border-line pt-12'}`}>
                <StepHeader number="9" icon={Wrench} title={c.t('s9.title')} subtitle={c.t('s9.subtitle')} />
                <div className="mt-6">
                  <TroubleshootingAccordion faqs={c.items('s9.faqs')} />
                </div>
                <InfoBox type="info">
                  {c.t('s9.infoBefore')}{' '}
                  <a href="/tutorials" className="text-accent-light hover:underline">
                    {c.t('s9.link1')}
                  </a>{' '}
                  {c.t('s9.infoMid')}{' '}
                  <a href="/#community" className="text-accent-light hover:underline">
                    {c.t('s9.link2')}
                  </a>{' '}
                  {c.t('s9.infoAfter')}
                </InfoBox>
                <Extra md={c.t('s9.extra')} mediaBase={c.mediaBase} />
              </section>
            )}

            {/* Security note */}
            {!c.hidden('security') && (
              <div className="rounded-card border border-white/[0.06] bg-navy-900 p-6">
                <div className="flex gap-4">
                  <Shield className="h-6 w-6 shrink-0 text-accent-light" aria-hidden="true" />
                  <div>
                    <h2 className="font-semibold text-white">{c.t('sec.title')}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {c.t('sec.before')} <code className="text-accent-light">{c.t('sec.code')}</code> {c.t('sec.after')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation links */}
            {!c.hidden('nav') && (
              <div className="border-t border-line pt-8">
                <div className="flex flex-wrap gap-3">
                  <a href="/prompts" className="btn-primary">
                    {c.t('nav.prompts')}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a href="/tutorials" className="btn-secondary-dark">
                    {c.t('nav.videos')}
                  </a>
                  <a href="/roadmap" className="btn-secondary-dark">
                    {c.t('nav.roadmap')}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
