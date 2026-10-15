// Minimal path routing for a static host (Cloudflare Pages serves index.html for unknown paths).

export type RouteId = 'home' | 'privacy' | 'terms' | 'changelog' | 'not-found'

const ROUTES: Record<string, RouteId> = {
  '/': 'home',
  '/index.html': 'home',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/changelog': 'changelog',
}

export const ROUTE_TITLES: Record<RouteId, string> = {
  home: 'AI Desk — Một bàn làm việc. Nhiều AI cùng phối hợp.',
  privacy: 'Chính sách quyền riêng tư — AI Desk',
  terms: 'Điều khoản sử dụng — AI Desk',
  changelog: 'Changelog — AI Desk',
  'not-found': 'Không tìm thấy trang — AI Desk',
}

export function resolveRoute(pathname: string): RouteId {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return ROUTES[clean.toLowerCase()] ?? 'not-found'
}
