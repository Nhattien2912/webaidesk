// Regression tests for the final-completion pass: app versions/changelog, CMS video mapping,
// shared Markdown renderer safety and the public CSP / embed alignment.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer, type ViteDevServer } from 'vite'
import { validateContent } from '../server/cms/validation.ts'
import { buildAppData, buildVideoData, formatChangelog, parseChangelog } from '../src/lib/studioEditor.ts'
import { orderCmsVideos, toTutorialVideo, type CmsVideoRecord } from '../src/lib/cmsVideos.ts'

const env = { CMS_ALLOWED_IMAGE_HOSTS: 'i.ytimg.com', CMS_ALLOWED_DOWNLOAD_HOSTS: 'downloads.example.test' }
const app = (data: Record<string, unknown>) => validateContent({ title: 'AI Desk', data }, 'app', undefined, env)

test('app validation accepts version, documentation and well-formed changelog', () => {
  const result = app({
    currentVersion: '1.2.3-beta.1',
    documentationUrl: 'https://docs.example.test/start',
    downloadUrl: 'https://downloads.example.test/AIDesk.exe',
    changelog: [{ version: '1.2.3', date: '2026-10-20', notes: 'Bản đầu tiên' }],
  })
  assert.equal(result.ok, true)
})

test('app validation rejects malformed version, calendar-invalid date, extra keys and untrusted URLs', () => {
  for (const [field, data] of [
    ['data.currentVersion', { currentVersion: '1 2' }],
    ['data.changelog', { changelog: [{ version: '1.0', date: '2026-02-31', notes: 'x' }] }],
    ['data.changelog', { changelog: [{ version: '1.0', date: '2026-02-01', notes: 'x', html: '<b>' }] }],
    ['data.changelog', { changelog: [{ version: '1.0', date: '2026-02-01', notes: '' }] }],
    ['data.changelog', { changelog: Array.from({ length: 51 }, () => ({ version: '1', date: '2026-01-01', notes: 'x' })) }],
    ['data.documentationUrl', { documentationUrl: 'http://docs.example.test' }],
    ['data.downloadUrl', { downloadUrl: 'https://evil.example/AIDesk.exe' }],
  ] as const) {
    const result = app(data as Record<string, unknown>)
    assert.equal(result.ok, false, field)
    if (!result.ok) assert.ok(field in result.fields, `${field} in ${JSON.stringify(result.fields)}`)
  }
})

test('changelog text round-trips and reports the offending line', () => {
  const text = '1.1.0 | 2026-10-20 | Thêm bản xem trước | có dấu gạch\n\n1.0.0 | 2026-09-01 | Bản đầu'
  const parsed = parseChangelog(text)
  assert.equal(parsed.ok, true)
  if (parsed.ok) {
    assert.equal(parsed.entries.length, 2)
    assert.equal(parsed.entries[0]!.notes, 'Thêm bản xem trước | có dấu gạch')
    assert.equal(parseChangelog(formatChangelog(parsed.entries)).ok, true)
  }
  assert.deepEqual(parseChangelog('1.0 | 2026-01-01 | ok\nbroken line'), { ok: false, line: 2 })
})

test('buildAppData preserves unmanaged keys, trims, and splits lists', () => {
  const built = buildAppData({ logoMediaId: 'keep' }, { websiteUrl: ' https://a.test ', githubUrl: '', downloadUrl: '', documentationUrl: '', currentVersion: ' 1.0 ', platforms: 'Windows, Web', features: 'A\n\nB', changelog: '' })
  assert.equal(built.ok, true)
  if (built.ok) {
    assert.equal(built.data.logoMediaId, 'keep')
    assert.equal(built.data.websiteUrl, 'https://a.test')
    assert.deepEqual(built.data.platforms, ['Windows', 'Web'])
    assert.deepEqual(built.data.features, ['A', 'B'])
  }
  assert.equal(buildAppData(undefined, { websiteUrl: '', githubUrl: '', downloadUrl: '', documentationUrl: '', currentVersion: '', platforms: '', features: '', changelog: 'bad' }).ok, false)
})

test('buildVideoData maps blank order to null and keeps unmanaged keys', () => {
  assert.deepEqual(buildVideoData({ extra: 1 }, { youtubeId: 'dQw4w9WgXcQ', thumbnailUrl: ' ', displayOrder: '' }), { extra: 1, youtubeId: 'dQw4w9WgXcQ', thumbnailUrl: '', displayOrder: null })
  assert.equal(buildVideoData(undefined, { youtubeId: 'dQw4w9WgXcQ', thumbnailUrl: '', displayOrder: '7' }).displayOrder, 7)
})

const video = (over: Partial<CmsVideoRecord> & { data?: Record<string, unknown> }): CmsVideoRecord => ({ slug: 's', title: 'T', summary: 'S', category: 'intro', publishedAt: 1_700_000_000_000, data: {}, ...over })

test('CMS videos become cards only with a real YouTube id; thumbnails are limited to the CSP-allowed host', () => {
  assert.equal(toTutorialVideo(video({ data: {} })), null)
  assert.equal(toTutorialVideo(video({ data: { youtubeId: 'not-an-id' } })), null)
  const ok = toTutorialVideo(video({ data: { youtubeId: 'dQw4w9WgXcQ', thumbnailUrl: 'https://evil.example/x.jpg' } }))
  assert.equal(ok?.status, 'published')
  assert.equal(ok?.youtubeId, 'dQw4w9WgXcQ')
  assert.equal(ok?.thumbnail, '')
  assert.equal(toTutorialVideo(video({ data: { youtubeId: 'dQw4w9WgXcQ', thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' } }))?.thumbnail, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
})

test('CMS videos are ordered by displayOrder, then newest first', () => {
  const ordered = orderCmsVideos([
    video({ slug: 'late', publishedAt: 1, data: {} }),
    video({ slug: 'second', publishedAt: 5, data: { displayOrder: 2 } }),
    video({ slug: 'first', publishedAt: 1, data: { displayOrder: 1 } }),
    video({ slug: 'new', publishedAt: 9, data: {} }),
  ]).map((v) => v.slug)
  assert.deepEqual(ordered, ['first', 'second', 'new', 'late'])
})

test('public CSP allows YouTube thumbnails and the embed host used by the player', async () => {
  const headers = await readFile('public/_headers', 'utf8')
  const csp = headers.split('\n').find((line) => line.includes('Content-Security-Policy')) ?? ''
  assert.match(csp, /img-src [^;]*https:\/\/i\.ytimg\.com/)
  assert.match(csp, /frame-src [^;]*https:\/\/www\.youtube-nocookie\.com/)
  const page = await readFile('src/pages/TutorialsPage.tsx', 'utf8')
  assert.doesNotMatch(page, /https:\/\/www\.youtube\.com\/embed/)
  assert.doesNotMatch(page, /img\.youtube\.com/)
  assert.match(page, /youtube-nocookie\.com\/embed/)
})

let vite: ViteDevServer
before(async () => {
  vite = await createServer({ configFile: 'vite.config.ts', logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null } })
})
after(async () => { await vite.close() })

test('MarkdownBody skips raw HTML, neutralizes javascript: links, drops images and leaks no React props', async () => {
  const react = (await import('react')) as unknown as { createElement: (t: unknown, p?: unknown, ...c: unknown[]) => unknown }
  const server = (await import('react-dom/server')) as unknown as { renderToStaticMarkup: (e: unknown) => string }
  const { MarkdownBody } = (await vite.ssrLoadModule('/src/components/MarkdownBody.tsx')) as { MarkdownBody: unknown }
  const html = server.renderToStaticMarkup(react.createElement(MarkdownBody, null, '## Tiêu đề\n\n<script>alert(1)</script><img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1)) [ok](https://example.com) ![i](https://evil.example/i.png)'))
  assert.match(html, /<h2>Tiêu đề<\/h2>/)
  assert.doesNotMatch(html, /<script|<img|onerror|javascript:|object Object/i)
  assert.match(html, /href="https:\/\/example\.com" rel="noopener noreferrer"/)
})

test('public content pages ship their own stylesheet instead of relying on the private Studio CSS', async () => {
  const page = await readFile('src/pages/PublicContentPages.tsx', 'utf8')
  assert.match(page, /import "\.\/public-content\.css"/)
  assert.doesNotMatch(page, /studio\.css/)
  const css = await readFile('src/pages/public-content.css', 'utf8')
  for (const selector of ['.content-hero', '.content-shell', '.detail-empty', '.comments-section', '.comment-form', '.metric-grid', '.studio-card', '.app-facts', '.app-changelog', '.preview-body']) {
    assert.ok(css.includes(selector), `${selector} missing from public-content.css`)
  }
})

test('Studio editor fields are bound to saved data (no decorative inputs)', async () => {
  const studio = await readFile('src/pages/StudioPage.tsx', 'utf8')
  for (const bound of ['setCategory', 'setTags', 'setSeoTitle', 'setMetaDescription', 'setDownloadUrl', 'setChangelog', 'setThumbnailUrl']) {
    assert.ok(studio.includes(bound), `${bound} missing`)
  }
  assert.doesNotMatch(studio, /<input value=\{title\} readOnly/)
  assert.doesNotMatch(studio, /Prototype nội bộ|Dữ liệu prototype/)
})
