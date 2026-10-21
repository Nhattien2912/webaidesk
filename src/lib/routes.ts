// Minimal path routing for a static host (Cloudflare Pages serves index.html for unknown paths).

export type RouteId =
  | 'home'
  | 'download'
  | 'privacy'
  | 'terms'
  | 'changelog'
  | 'why-ai-desk'
  | 'tutorials'
  | 'install'
  | 'roadmap'
  | 'prompts'
  | 'blog'
  | 'blog-detail'
  | 'guides'
  | 'guide-detail'
  | 'apps'
  | 'app-detail'
  | 'not-found'

const ROUTES: Record<string, RouteId> = {
  '/': 'home',
  '/index.html': 'home',
  '/download': 'download',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/changelog': 'changelog',
  '/why-ai-desk': 'why-ai-desk',
  '/tutorials': 'tutorials',
  '/install': 'install',
  '/roadmap': 'roadmap',
  '/prompts': 'prompts',
  '/blog': 'blog',
  '/guides': 'guides',
  '/apps': 'apps',
}

export const ROUTE_TITLES: Record<RouteId, string> = {
  home: 'AI Desk — Một bàn làm việc. Nhiều AI cùng phối hợp.',
  download: 'Tải AI Desk Public Alpha cho Windows',
  privacy: 'Chính sách quyền riêng tư — AI Desk',
  terms: 'Điều khoản sử dụng — AI Desk',
  changelog: 'Changelog — AI Desk',
  'why-ai-desk': 'Vì sao tôi xây dựng AI Desk? — AI Desk',
  tutorials: 'Video hướng dẫn — AI Desk',
  install: 'Hướng dẫn cài đặt — AI Desk',
  roadmap: 'Lộ trình phát triển — AI Desk',
  prompts: 'Thư viện Prompt — AI Desk',
  blog: 'Blog công nghệ — AI Desk',
  'blog-detail': 'Bài viết — AI Desk',
  guides: 'Trung tâm hướng dẫn — AI Desk',
  'guide-detail': 'Hướng dẫn — AI Desk',
  apps: 'Ứng dụng — AI Desk',
  'app-detail': 'Sản phẩm — AI Desk',
  'not-found': 'Không tìm thấy trang — AI Desk',
}

export function resolveRoute(pathname: string): RouteId {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (clean.startsWith('/blog/')) return 'blog-detail'
  if (clean.toLowerCase().startsWith('/guides/')) return 'guide-detail'
  if (clean.startsWith('/apps/')) return 'app-detail'
  return ROUTES[clean.toLowerCase()] ?? 'not-found'
}
