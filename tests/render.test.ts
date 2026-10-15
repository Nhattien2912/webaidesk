// Server-renders the real components through Vite's SSR loader (no extra test dependencies)
// and checks structure, links, fail-closed download and the waitlist states.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type ViteDevServer } from 'vite'
import type { ComponentType } from 'react'

let vite: ViteDevServer
let render: (el: unknown) => string
let h: (type: unknown, props?: Record<string, unknown> | null) => unknown

before(async () => {
  vite = await createServer({
    configFile: 'vite.config.ts',
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  // React itself is loaded natively; Vite externalizes it for the SSR modules, so both share one instance.
  const react = (await import('react')) as unknown as { createElement: typeof h }
  const server = (await import('react-dom/server')) as unknown as { renderToStaticMarkup: typeof render }
  h = react.createElement
  render = server.renderToStaticMarkup
})

after(async () => {
  await vite?.close()
})

async function component<T = Record<string, unknown>>(path: string, name: string): Promise<ComponentType<T>> {
  const mod = (await vite.ssrLoadModule(path)) as Record<string, ComponentType<T>>
  return mod[name]
}

async function page(path: string): Promise<string> {
  const App = await component<{ path: string }>('/src/App.tsx', 'App')
  return render(h(App, { path }))
}

const FORBIDDEN = [
  'Closed Beta',
  'Early Bird',
  '40%',
  'v0.8',
  'WebView2',
  '68 MB',
  'aidesk.local',
  'Giữ chỗ',
  'Đã xếp hàng',
]

test('home page renders every section in order with the approved headline', async () => {
  const html = await page('/')
  assert.match(html, /Một bàn làm việc\./)
  assert.match(html, /Nhiều AI cùng phối hợp\./)
  assert.match(html, /Không cần tài khoản AI Desk/)
  const ids = ['capabilities', 'features', 'how-it-works', 'product', 'download', 'roadmap', 'faq', 'community', 'pro-news']
  let last = -1
  for (const id of ids) {
    const at = html.indexOf(`id="${id}"`)
    assert.ok(at > last, `section #${id} missing or out of order`)
    last = at
  }
  assert.match(html, /Từ ý tưởng đến kết quả trong một quy trình rõ ràng/)
  assert.match(html, /Được thiết kế để làm việc thật, mỗi ngày/)
  assert.match(html, /Đăng ký nhận tin khi có AI Desk Pro/)
})

test('every in-page anchor points at an element that exists', async () => {
  const html = await page('/')
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
  const anchors = [...html.matchAll(/href="\/?#([^"]+)"/g)].map((m) => m[1])
  assert.ok(anchors.length > 10)
  for (const anchor of anchors) assert.ok(ids.has(anchor), `broken anchor #${anchor}`)
})

test('internal page links resolve to known routes', async () => {
  const html = await page('/')
  const { resolveRoute } = (await vite.ssrLoadModule('/src/lib/routes.ts')) as { resolveRoute: (p: string) => string }
  const paths = [...html.matchAll(/href="(\/[a-z-]*)"/g)].map((m) => m[1])
  for (const p of ['/privacy', '/terms', '/changelog']) assert.ok(paths.includes(p), `footer must link ${p}`)
  for (const p of paths) assert.notEqual(resolveRoute(p), 'not-found', `dead link ${p}`)
})

test('no outdated or unverified claims and no login, license or payment UI', async () => {
  for (const path of ['/', '/privacy', '/terms', '/changelog']) {
    const html = await page(path)
    for (const phrase of FORBIDDEN) assert.ok(!html.includes(phrase), `${path} contains "${phrase}"`)
    assert.ok(!/đăng nhập để|thanh toán ngay|license key|mã kích hoạt/i.test(html), `${path} has login/payment UI`)
  }
})

test('download is closed (fail-closed) before a manifest is loaded, with no fake values', async () => {
  const html = await page('/')
  assert.match(html, /data-download-state="loading"/)
  assert.ok(!/\.exe"/.test(html), 'no installer link may be rendered without a manifest')
  assert.ok(!/[a-f0-9]{64}/.test(html), 'no checksum may be rendered without a manifest')
})

test('DownloadCard: unavailable state disables the CTA; available state shows manifest values only', async () => {
  const DownloadCard = await component<{ state: unknown }>('/src/components/DownloadSection.tsx', 'DownloadCard')
  const closed = render(h(DownloadCard, { state: { kind: 'unavailable', reason: 'manifest HTTP 404' } }))
  assert.match(closed, /Đang chuẩn bị phát hành/)
  assert.match(closed, /<button[^>]*disabled/)
  assert.ok(!closed.includes('<a href="https'))

  const sha = 'b'.repeat(64)
  const primary = {
    kind: 'installer',
    fileName: 'AI-Desk-Setup-0.1.0-beta.1.exe',
    url: 'https://downloads.example.com/AI-Desk-Setup-0.1.0-beta.1.exe',
    sizeBytes: 120174518,
    sha256: sha,
    signature: 'signed',
  }
  const open = render(
    h(DownloadCard, {
      state: {
        kind: 'available',
        primary,
        manifest: {
          schemaVersion: 1,
          channel: 'public-beta',
          status: 'published',
          approved: true,
          version: '0.1.0-beta.1',
          releasedAt: '2026-11-01',
          minOs: 'Windows 10/11 64-bit',
          files: [primary],
        },
      },
    }),
  )
  assert.match(open, /AI Desk 0\.1\.0-beta\.1/)
  assert.ok(open.includes(sha))
  assert.match(open, /114\.6 MB/)
  assert.ok(open.includes(`href="${primary.url}"`))
})

test('waitlist form: consent, labels and honeypot; success text only in success state', async () => {
  const WaitlistForm = await component('/src/components/WaitlistForm.tsx', 'WaitlistForm')
  const idle = render(h(WaitlistForm, {}))
  assert.match(idle, /type="email"/)
  assert.match(idle, /type="checkbox"/)
  assert.match(idle, /<label[^>]*for="[^"]+-email"/)
  assert.match(idle, /name="website"[^>]*tabindex="-1"|tabindex="-1"[^>]*name="website"/)
  assert.ok(!idle.includes('Đã ghi nhận'), 'idle form must not claim success')

  const failed = render(h(WaitlistForm, { initialStatus: { kind: 'error', code: 'not_configured' } }))
  assert.match(failed, /chưa được lưu/)
  assert.ok(!failed.includes('Đã ghi nhận'))

  const ok = render(h(WaitlistForm, { initialStatus: { kind: 'success' } }))
  assert.match(ok, /Đã ghi nhận email của bạn/)
})

test('social links: unconfigured entries are not rendered as links', async () => {
  const SocialList = await component('/src/components/SocialLinks.tsx', 'SocialList')
  const html = render(
    h(SocialList, {
      links: [
        { id: 'youtube', label: 'YouTube', url: '' },
        { id: 'facebook', label: 'Facebook', url: 'javascript:alert(1)' },
        { id: 'github', label: 'GitHub', url: 'https://github.com/example/repo' },
      ],
    }),
  )
  assert.ok(!html.includes('javascript:'))
  assert.match(html, /data-social-unconfigured="youtube"/)
  assert.match(html, /data-social-unconfigured="facebook"/)
  assert.match(html, /href="https:\/\/github\.com\/example\/repo"[^>]*rel="noopener noreferrer"/)
})

test('dialogs expose role="dialog" and aria-modal', async () => {
  const VideoDialog = await component('/src/components/VideoDialog.tsx', 'VideoDialog')
  const html = render(h(VideoDialog, { open: true, embedUrl: 'https://www.youtube-nocookie.com/embed/abcdefgh', onClose: () => {} }))
  assert.match(html, /role="dialog"/)
  assert.match(html, /aria-modal="true"/)
  assert.match(html, /aria-labelledby="video-dialog-title"/)
})

test('legal pages are marked as drafts that need review', async () => {
  for (const path of ['/privacy', '/terms']) {
    const html = await page(path)
    assert.match(html, /Bản nháp — cần duyệt/)
    assert.match(html, /\[cần cấu hình\]/)
  }
  const changelog = await page('/changelog')
  assert.match(changelog, /Private Alpha RC1/)
  assert.match(changelog, /không phát hành công khai/)
})

test('unknown paths render the not-found page', async () => {
  const html = await page('/does-not-exist')
  assert.match(html, /Không tìm thấy trang/)
})

test('accessibility basics: skip link, single h1, labelled nav', async () => {
  const html = await page('/')
  assert.match(html, /href="#main"/)
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1)
  assert.match(html, /<nav aria-label="Điều hướng chính"/)
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0])
  for (const img of imgs) assert.match(img, /alt="/)
})

test('product previews follow the real AI Desk UI and are labelled as illustrations', async () => {
  const AppPreview = await component('/src/components/AppPreview.tsx', 'AppPreview')
  const routes = ['Desk', 'Monitor', 'Mission', 'Công việc', 'Phiên', 'Projects', 'Workers', 'Hạn mức &amp; định tuyến', 'Settings', 'Control API']
  const screens: Record<string, string[]> = {
    desk: ['GPT Bridge Extension', 'Quota AI workers', 'Flow đang chạy', 'Workers', 'Phiên đã chọn', 'Hội thoại chung'],
    monitor: ['Timeline &amp; system events', 'Shadow routing (read-only)', 'SHADOW_ONLY'],
    sessions: ['Session', 'Status', 'Bound window', 'LOCKED'],
  }
  for (const [screen, labels] of Object.entries(screens)) {
    const html = render(h(AppPreview, { screen }))
    for (const route of routes) assert.ok(html.includes(route), `${screen}: sidebar route ${route} missing`)
    for (const label of labels) assert.ok(html.includes(label), `${screen}: ${label} missing`)
    assert.match(html, /không phải ảnh chụp màn hình/)
    assert.match(html, /role="img"/)
    for (const fake of ['Task Pipeline', 'Rust', 'C++', '4×4', 'LIVE', 'HWND', 'PID', 'req-', 'token']) {
      assert.ok(!html.includes(fake), `${screen}: preview must not contain "${fake}"`)
    }
    assert.ok(!/\d+\s?%|\d+\/\d+ msg|\d+ req/.test(html.replace(/w-\d+\/\d+/g, '')), `${screen}: no quota numbers`)
  }
})

test('product showcase tabs expose tablist semantics', async () => {
  const html = await page('/')
  assert.match(html, /role="tablist"/)
  assert.equal((html.match(/role="tab"/g) ?? []).length, 2)
  assert.match(html, /role="tabpanel"/)
  assert.match(html, /aria-selected="true"/)
})

test('official YouTube and Facebook links render in Community and Footer, opening in a new tab', async () => {
  const html = await page('/')
  const yt = 'https://www.youtube.com/@NhattienIT'
  const fb = 'https://www.facebook.com/profile.php?id=61595065515012'
  for (const url of [yt, fb]) {
    const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]).filter((a) => a.includes(`href="${url}"`))
    assert.equal(anchors.length, 2, `${url} should appear in Community and Footer`)
    for (const a of anchors) {
      assert.match(a, /target="_blank"/)
      assert.match(a, /rel="noopener noreferrer"/)
    }
  }
  assert.match(html, /Video giới thiệu AI Desk, hướng dẫn sử dụng và chia sẻ quá trình phát triển\./)
  assert.match(html, /Theo dõi tin tức, cập nhật sản phẩm và trao đổi cùng cộng đồng AI Desk\./)
  assert.ok(!html.includes('data-social-unconfigured="youtube"'))
  assert.ok(!html.includes('data-social-unconfigured="facebook"'))
  // GitHub has no official URL: stays unconfigured, never guessed.
  assert.match(html, /data-social-unconfigured="github"/)
  assert.ok(!/href="https:\/\/github\.com/.test(html))
  // No other YouTube/Facebook URLs anywhere on the page.
  const socialHrefs = [...html.matchAll(/href="(https:\/\/[^"]*(?:youtube|youtu\.be|facebook)[^"]*)"/g)].map((m) => m[1])
  assert.ok(socialHrefs.every((u) => u === yt || u === fb), socialHrefs.join(', '))
})

test('social links use the local YouTube and Facebook brand icons (decorative, brand colours)', async () => {
  const html = await page('/')
  const links: Array<[string, string, string]> = [
    ['https://www.youtube.com/@NhattienIT', 'youtube', '#FF0000'],
    ['https://www.facebook.com/profile.php?id=61595065515012', 'facebook', '#0866FF'],
  ]
  for (const [url, brand, colour] of links) {
    const anchors = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]).filter((a) => a.includes(`href="${url}"`))
    assert.equal(anchors.length, 2, `${brand}: Community + Footer`)
    for (const a of anchors) {
      const svg = a.match(/<svg\b[^>]*data-brand="([^"]+)"[^>]*>/)
      assert.ok(svg, `${brand}: brand svg missing`)
      assert.equal(svg[1], brand)
      assert.match(svg[0], /aria-hidden="true"/)
      assert.ok(a.includes(`fill="${colour}"`), `${brand}: brand colour missing`)
      assert.match(a, /target="_blank"/)
      assert.match(a, /rel="noopener noreferrer"/)
      assert.ok(a.includes(brand === 'youtube' ? 'YouTube' : 'Facebook'), `${brand}: visible label missing`)
    }
  }
})

test('Navbar and Footer show the official AI Desk lockup image with an accessible home link', async () => {
  const html = await page('/')
  const logos = [...html.matchAll(/<a href="\/" class="inline-flex items-center" aria-label="AI Desk — trang chủ"><img [^>]*>/g)].map((m) => m[0])
  assert.equal(logos.length, 2, 'Navbar + Footer')
  for (const l of logos) {
    assert.match(l, /src="[^"]*aidesk-lockup[^"]*\.png"/)
    assert.match(l, /alt=""/)
    assert.match(l, /height="28"/)
  }
  const preview = render(h(await component('/src/components/AppPreview.tsx', 'AppPreview'), { screen: 'desk' }))
  assert.match(preview, /src="[^"]*aidesk-mark[^"]*\.png"/)
})

test('download config defaults to the same-origin manifest API and the verified production host', async () => {
  const { siteConfig, DEFAULT_DOWNLOAD_HOSTS } = (await vite.ssrLoadModule('/src/config/site.ts')) as {
    siteConfig: { release: { manifestUrl: string; allowedHosts: string[]; allowUnsigned: boolean } }
    DEFAULT_DOWNLOAD_HOSTS: readonly string[]
  }
  assert.equal(siteConfig.release.manifestUrl, '/api/releases/latest')
  assert.deepEqual(siteConfig.release.allowedHosts, ['webaidesk.pages.dev'])
  assert.deepEqual([...DEFAULT_DOWNLOAD_HOSTS], ['webaidesk.pages.dev'])
  assert.equal(siteConfig.release.allowUnsigned, false)
  assert.ok(!siteConfig.release.allowedHosts.some((h) => h.endsWith('r2.dev')))
})
