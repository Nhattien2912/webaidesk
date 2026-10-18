// Minimal path routing for a static host (Cloudflare Pages serves index.html for unknown paths).

export type RouteId = 'home' | 'download' | 'privacy' | 'terms' | 'changelog' | 'not-found'

const ROUTES: Record<string, RouteId> = {
  '/': 'home',
  '/index.html': 'home',
  '/download': 'download',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/changelog': 'changelog',
}

export const ROUTE_TITLES: Record<RouteId, string> = {
  home: 'AI Desk — Một bàn làm việc. Nhiều AI cùng phối hợp.',
  download: 'Tải AI Desk Public Alpha cho Windows',
  privacy: 'Chính sách quyền riêng tư — AI Desk',
  terms: 'Điều khoản sử dụng — AI Desk',
  changelog: 'Changelog — AI Desk',
  'not-found': 'Không tìm thấy trang — AI Desk',
}

export function resolveRoute(pathname: string): RouteId {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return ROUTES[clean.toLowerCase()] ?? 'not-found'
}
