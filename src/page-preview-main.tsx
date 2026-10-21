// Private Studio only: renders the real public page components with the working copy sent by the Studio (same origin, behind Access).
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { InstallPage } from './pages/InstallPage'
import { PromptsPage } from './pages/PromptsPage'
import { TutorialsPage } from './pages/TutorialsPage'
import { FaqSection } from './components/FaqSection'
import { ChangelogPage } from './pages/ChangelogPage'
import { PAGE_IDS, defaultDoc, PAGES, validateDoc, type PageDoc, type PageId } from './content/pageContent'

const MEDIA_BASE = '/api/admin/media'

function PreviewApp() {
  const pageId = (PAGE_IDS as readonly string[]).includes(window.location.pathname.split('/').filter(Boolean).at(-1) ?? '')
    ? (window.location.pathname.split('/').filter(Boolean).at(-1) as PageId)
    : 'install'
  const [doc, setDoc] = useState<PageDoc>(() => defaultDoc(PAGES[pageId]))
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return
      const data = event.data as { type?: string; page?: string; doc?: unknown } | null
      if (data?.type !== 'aidesk-page-preview' || data.page !== pageId) return
      const checked = validateDoc(pageId, data.doc)
      if (checked.ok) setDoc(checked.doc)
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'aidesk-preview-ready' }, window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [pageId])
  const Page = { install: InstallPage, prompts: PromptsPage, tutorials: TutorialsPage, faq: FaqSection, changelog: ChangelogPage }[pageId]
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <Page content={doc} mediaBase={MEDIA_BASE} />
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreviewApp />
  </StrictMode>,
)
