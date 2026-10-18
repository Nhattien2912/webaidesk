// Section anchors on the home page. Hrefs are absolute ("/#id") so they also work from the
// Privacy / Terms / Changelog pages.

export interface NavItem {
  label: string
  href?: string
  children?: NavItem[]
}

export const SECTION_IDS = {
  capabilities: 'capabilities',
  features: 'features',
  howItWorks: 'how-it-works',
  showcase: 'product',
  download: 'download',
  roadmap: 'roadmap',
  faq: 'faq',
  community: 'community',
  waitlist: 'pro-news',
} as const

export const mainNav: NavItem[] = [
  { label: 'Tính năng', href: `/#${SECTION_IDS.features}` },
  { label: 'Vì sao AI Desk?', href: '/why-ai-desk' },
  {
    label: 'Hướng dẫn',
    children: [
      { label: 'Hướng dẫn cài đặt', href: '/install' },
      { label: 'Video hướng dẫn', href: '/tutorials' },
      { label: 'Thư viện Prompt', href: '/prompts' },
    ],
  },
  { label: 'Lộ trình', href: '/roadmap' },
  { label: 'Tải về', href: '/download' },
]

export const legalNav: NavItem[] = [
  { label: 'Quyền riêng tư', href: '/privacy' },
  { label: 'Điều khoản', href: '/terms' },
  { label: 'Changelog', href: '/changelog' },
]

export const resourcesNav: NavItem[] = [
  { label: 'Vì sao AI Desk?', href: '/why-ai-desk' },
  { label: 'Hướng dẫn cài đặt', href: '/install' },
  { label: 'Video hướng dẫn', href: '/tutorials' },
  { label: 'Thư viện Prompt', href: '/prompts' },
  { label: 'Lộ trình', href: '/roadmap' },
]
