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
import { WhyAiDeskPage } from './pages/WhyAiDeskPage'
import { TutorialsPage } from './pages/TutorialsPage'
import { InstallPage } from './pages/InstallPage'
import { RoadmapPage } from './pages/RoadmapPage'
import { PromptsPage } from './pages/PromptsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ROUTE_TITLES, resolveRoute, type RouteId } from './lib/routes'
import { useDownloadState } from './lib/useDownloadState'
import { siteConfig } from './config/site'

// Homepage sections
const KnowledgeCenterSection: React.FC = () => (
  <section aria-labelledby="kc-title" className="section bg-navy-900 border-y border-white/[0.06]">
    <div className="container-content">
      <div className="max-w-3xl mb-12">
        <p className="eyebrow">Tìm hiểu thêm</p>
        <h2 id="kc-title" className="section-title mt-3">
          Tài nguyên & Hướng dẫn
        </h2>
        <p className="section-lead">
          Từ lý do xây dựng đến hướng dẫn cài đặt, video và prompt library — mọi thứ bạn cần để
          bắt đầu với AI Desk.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            href: '/why-ai-desk',
            emoji: '🧠',
            title: 'Vì sao AI Desk?',
            desc: 'Tư duy phát triển, kiến trúc và những đánh đổi kỹ thuật phía sau AI Desk.',
          },
          {
            href: '/install',
            emoji: '⚡',
            title: 'Hướng dẫn cài đặt',
            desc: 'Từng bước từ tải phần mềm đến thực hiện tác vụ đầu tiên — không cần kiến thức lập trình.',
          },
          {
            href: '/tutorials',
            emoji: '🎬',
            title: 'Video hướng dẫn',
            desc: 'Thư viện video từ giới thiệu đến demo quy trình thực tế. Đang chuẩn bị.',
          },
          {
            href: '/roadmap',
            emoji: '🗺',
            title: 'Lộ trình phát triển',
            desc: 'Công khai những gì đã xong, đang làm và dự kiến — không tự đặt ngày ra mắt.',
          },
          {
            href: '/prompts',
            emoji: '📋',
            title: 'Thư viện Prompt',
            desc: 'Mẫu action có schema được đối chiếu với source. Copy hoặc tải nguyên văn để tự kiểm tra.',
          },
          {
            href: '/download',
            emoji: '📥',
            title: 'Tải AI Desk',
            desc: 'Tải bản AI Desk dành cho Windows từ kênh chính thức khi có bản phát hành.',
          },
        ].map(({ href, emoji, title, desc }) => (
          <a
            key={href}
            href={href}
            className="card flex flex-col p-5 transition-colors hover:border-white/20 hover:bg-navy-800/90"
          >
            <span className="text-2xl" aria-hidden="true">{emoji}</span>
            <h3 className="mt-3 font-semibold text-white">{title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{desc}</p>
            <span className="mt-4 text-sm font-medium text-accent-light">
              Xem thêm →
            </span>
          </a>
        ))}
      </div>
    </div>
  </section>
)

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
      <KnowledgeCenterSection />
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
  'why-ai-desk': WhyAiDeskPage,
  tutorials: TutorialsPage,
  install: InstallPage,
  roadmap: RoadmapPage,
  prompts: PromptsPage,
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
