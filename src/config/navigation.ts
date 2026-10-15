// Section anchors on the home page. Hrefs are absolute ("/#id") so they also work from the
// Privacy / Terms / Changelog pages.

export interface NavItem {
  label: string
  href: string
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
  { label: 'Cách hoạt động', href: `/#${SECTION_IDS.howItWorks}` },
  { label: 'Sản phẩm', href: `/#${SECTION_IDS.showcase}` },
  { label: 'Tải về', href: `/#${SECTION_IDS.download}` },
  { label: 'Roadmap', href: `/#${SECTION_IDS.roadmap}` },
  { label: 'FAQ', href: `/#${SECTION_IDS.faq}` },
  { label: 'Cộng đồng', href: `/#${SECTION_IDS.community}` },
]

export const legalNav: NavItem[] = [
  { label: 'Quyền riêng tư', href: '/privacy' },
  { label: 'Điều khoản', href: '/terms' },
  { label: 'Changelog', href: '/changelog' },
]
