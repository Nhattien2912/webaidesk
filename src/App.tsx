import React, { useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { Capabilities } from './components/Capabilities'
import { Features } from './components/Features'
import { HowItWorks } from './components/HowItWorks'
import { Showcase } from './components/Showcase'
import { DownloadSection } from './components/DownloadSection'
import { Roadmap } from './components/Roadmap'
import { FaqSection } from './components/FaqSection'
import { Community } from './components/Community'
import { Footer } from './components/Footer'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'
import { ChangelogPage } from './pages/ChangelogPage'
import { DownloadPage } from './pages/DownloadPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ROUTE_TITLES, resolveRoute, type RouteId } from './lib/routes'
import { useDownloadState } from './lib/useDownloadState'
import { siteConfig } from './config/site'

const HomePage: React.FC = () => {
  const download = useDownloadState()
  return (
    <>
      <Hero download={download} />
      <Capabilities />
      <Features />
      <HowItWorks />
      <Showcase />
      <DownloadSection state={download} />
      <Roadmap />
      <FaqSection />
      <Community />
    </>
  )
}

const PAGES: Record<RouteId, React.FC> = {
  home: HomePage,
  download: DownloadPage,
  privacy: PrivacyPage,
  terms: TermsPage,
  changelog: ChangelogPage,
  'not-found': NotFoundPage,
}

function currentPath(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname
}

export const App: React.FC<{ path?: string }> = ({ path }) => {
  const route = resolveRoute(path ?? currentPath())
  const Page = PAGES[route]

  useEffect(() => {
    // Content renders after load, so the browser's own hash jump (e.g. /#download from
    // another page) happens too early; repeat it once the sections exist.
    const hash = decodeURIComponent(window.location.hash.slice(1))
    if (route === 'home' && hash) {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'instant' })
    }
  }, [route])

  useEffect(() => {
    document.title = ROUTE_TITLES[route]
    if (siteConfig.siteUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.rel = 'canonical'
        document.head.appendChild(link)
      }
      link.href = new URL(window.location.pathname, siteConfig.siteUrl).toString()
    }
    if (route === 'not-found') {
      const meta = document.createElement('meta')
      meta.name = 'robots'
      meta.content = 'noindex'
      document.head.appendChild(meta)
      return () => meta.remove()
    }
  }, [route])

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Bỏ qua tới nội dung chính
      </a>
      <Navbar />
      <main id="main" className="flex-1" tabIndex={-1}>
        <Page />
      </main>
      <Footer />
    </div>
  )
}

export default App
