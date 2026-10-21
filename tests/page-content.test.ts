// Editable page content (/install, /prompts, /tutorials): visual/semantic parity with the pre-migration pages, registry validation,
// CMS override behaviour, hiding, and fallbacks. Fixtures in tests/fixtures/page-parity are the frozen HTML of the pages BEFORE the migration.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createServer, type ViteDevServer } from 'vite'
import { PAGES, PAGE_IDS, allFields, defaultDoc, defaultValues, hideIds, validateDoc, type PageDoc, type PageId } from '../src/content/pageContent.ts'

let vite: ViteDevServer
let react: { createElement: (type: unknown, props?: unknown, ...children: unknown[]) => unknown }
let render: (element: unknown) => string
const norm = (html: string) => html.replace(/\s+/g, ' ').replace(/> </g, '><').trim()
const EXPORTS: Record<PageId, [string, string]> = { install: ['pages/InstallPage', 'InstallPage'], prompts: ['pages/PromptsPage', 'PromptsPage'], tutorials: ['pages/TutorialsPage', 'TutorialsPage'], faq: ['components/FaqSection', 'FaqSection'], changelog: ['pages/ChangelogPage', 'ChangelogPage'] }

before(async () => {
  vite = await createServer({ configFile: 'vite.config.ts', logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null } })
  react = (await import('react')) as unknown as typeof react
  render = ((await import('react-dom/server')) as unknown as { renderToStaticMarkup: typeof render }).renderToStaticMarkup
})
after(async () => { await vite.close() })

async function page(id: PageId, content?: PageDoc | null): Promise<string> {
  const [file, name] = EXPORTS[id]
  const mod = await vite.ssrLoadModule(`/src/${file}.tsx`) as Record<string, unknown>
  return norm(render(react.createElement(mod[name], content === undefined ? null : { content })))
}
const fixture = (id: PageId) => fs.readFileSync(`tests/fixtures/page-parity/${id}.html`, 'utf8')
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

for (const id of PAGE_IDS) {
  test(`PAGE-PARITY ${id}: rendering with code defaults is identical to the pre-migration page`, async () => {
    assert.equal(await page(id), fixture(id))
  })
  test(`PAGE-PARITY ${id}: a CMS document seeded from the defaults renders identically (activating the import changes nothing)`, async () => {
    assert.equal(await page(id, defaultDoc(PAGES[id])), fixture(id))
    assert.equal(await page(id, { values: {}, hidden: [] }), fixture(id))
  })
}

test('PAGE-CONTENT every field has a unique key, a non-empty label and a valid default', () => {
  for (const id of PAGE_IDS) {
    const keys = new Set<string>()
    for (const field of allFields(PAGES[id])) {
      assert.ok(!keys.has(field.key), `${id}.${field.key} duplicated`)
      keys.add(field.key)
      assert.ok(field.label.length > 0)
    }
    assert.equal(validateDoc(id, defaultDoc(PAGES[id])).ok, true, `${id} defaults must validate`)
  }
})

test('PAGE-OVERRIDE install: texts, lists, items and hidden blocks change only what the editor changed', async () => {
  const base = defaultDoc(PAGES.install)
  const html = await page('install', {
    values: { ...base.values, 'hero.title': 'Tiêu đề mới', 's1.reqs': ['Chỉ một yêu cầu'], 's6.workers': [{ name: 'Worker Mới', status: 'Mới', tone: 'amber', steps: 'Bước A\nBước B' }], 's9.faqs': [{ q: 'Hỏi gì?', a: 'Đáp thế.' }], 's8.code': 'echo "an toàn <b>không phải HTML</b>"', 's2.extra': '## Thêm\n\nĐoạn **markdown**.\n\n<script>alert(1)</script>' },
    hidden: ['step-3', 'security'],
  })
  const body = text(html)
  assert.match(body, /Tiêu đề mới/)
  assert.doesNotMatch(body, /Hướng dẫn cài đặt AI Desk\s/)
  assert.match(body, /Chỉ một yêu cầu/)
  assert.doesNotMatch(body, /Windows 10 \(64-bit\)/)
  assert.match(body, /Worker Mới/)
  assert.match(body, /Bước A/)
  assert.match(body, /Hỏi gì\?/)
  assert.doesNotMatch(body, /Extension không kết nối với AI Desk Desktop/)
  assert.doesNotMatch(html, /id="step-3"/)
  assert.doesNotMatch(html, /Lưu ý về bảo mật/)
  assert.doesNotMatch(body, /3\. Cài AI Desk Desktop/)
  assert.match(html, /<h2>Thêm<\/h2>/)
  assert.match(html, /<strong>markdown<\/strong>/)
  assert.doesNotMatch(html, /<script/i)
  assert.match(html, /&lt;b&gt;không phải HTML&lt;\/b&gt;/)
  assert.match(html, /href="\/download"/)
  assert.match(html, /id="step-2"/)
})

test('PAGE-OVERRIDE install: the download button target and the release wording flow through code, not content', async () => {
  const html = await page('install', { values: { 's2.button': 'Tải ngay' }, hidden: [] })
  assert.match(html, /<a href="\/download" class="btn-primary">.*Tải ngay/)
})

test('PAGE-OVERRIDE prompts: prompt cards, categories, statuses, hidden blocks and links', async () => {
  const base = defaultValues(PAGES.prompts)
  const html = await page('prompts', {
    values: {
      ...base,
      'cat.items': [{ id: 'khac', label: 'Danh mục khác' }],
      'prompts.items': [{ id: 'mau-moi', title: 'Prompt mới', description: 'Mô tả mới', category: 'khac', mode: 'Chế độ X', workers: 'Codex\nAuto', aiDeskVersion: 'v9', status: 'experimental', statusNote: 'Ghi chú', updatedAt: '2026-10-21', content: 'Dòng 1\nDòng 2 <script>x</script>' }],
    },
    hidden: ['quickstart', 'warning'],
  })
  const body = text(html)
  assert.match(body, /Prompt mới/)
  assert.match(body, /Danh mục khác/)
  assert.match(body, /Thử nghiệm/)
  assert.doesNotMatch(body, /Manager Action — mẫu theo source/)
  assert.doesNotMatch(body, /Bắt đầu nhanh — 5 bước/)
  assert.doesNotMatch(body, /Lưu ý quan trọng/)
  assert.match(body, /Cách sử dụng prompt/)
  assert.doesNotMatch(html, /<script/i)
  assert.match(html, /href="\/install"/)
})

test('PAGE-OVERRIDE tutorials: videos keep playback rules (only published + real YouTube id is playable), custom thumbnails use the public media route', async () => {
  const base = defaultValues(PAGES.tutorials)
  const id = '00000000-0000-4000-8000-0000000000c3'
  const html = await page('tutorials', {
    values: {
      ...base,
      'videos.items': [
        { id: 'co-video', title: 'Video thật', description: 'Mô tả', category: 'intro', youtubeId: 'dQw4w9WgXcQ', duration: '03:20', publishedAt: '2026-10-21', status: 'published', thumbnailMediaId: id },
        { id: 'chua-co', title: 'Video chưa có', description: 'Mô tả', category: 'intro', youtubeId: '', duration: '', publishedAt: '', status: 'published', thumbnailMediaId: '' },
      ],
    },
    hidden: ['coming-soon', 'notice'],
  })
  assert.match(html, new RegExp(`src="/api/content/media/${id}"`))
  assert.equal((html.match(/Xem video/g) ?? []).length >= 1, true)
  assert.match(text(html), /Sắp ra mắt/)
  assert.doesNotMatch(text(html), /Video đang được sản xuất/)
  assert.doesNotMatch(html, /i\.ytimg\.com\/vi\/dQw4w9WgXcQ/)
})

test('PAGE-VALIDATION accepts valid documents and rejects unknown keys, bad shapes, dangerous URLs, bad ids and oversize values', () => {
  const ok = validateDoc('install', { values: { 'hero.title': 'OK' }, hidden: ['step-1'] })
  assert.equal(ok.ok, true)
  const bad = (page: string, doc: unknown) => { const r = validateDoc(page, doc); assert.equal(r.ok, false, JSON.stringify(doc)); return r.ok ? {} : r.problems }
  assert.ok('nope' in bad('install', { values: { nope: 'x' } }))
  assert.ok('hero.title' in bad('install', { values: { 'hero.title': 5 } }))
  assert.ok('hero.title' in bad('install', { values: { 'hero.title': 'x'.repeat(161) } }))
  assert.ok('hero.title' in bad('install', { values: { 'hero.title': 'a\nb' } }))
  assert.ok('hero.title' in bad('install', { values: { 'hero.title': 'a\u0000b' } }))
  assert.ok('s1.reqs' in bad('install', { values: { 's1.reqs': 'not a list' } }))
  assert.ok('s1.reqs' in bad('install', { values: { 's1.reqs': Array.from({ length: 13 }, () => 'x') } }))
  assert.ok('s1.apps[0].tone' in bad('install', { values: { 's1.apps': [{ name: 'A', status: 'B', tone: 'javascript:alert(1)' }] } }))
  assert.ok('s1.apps[0].evil' in bad('install', { values: { 's1.apps': [{ name: 'A', evil: 'x' }] } }))
  assert.ok('hidden' in bad('install', { values: {}, hidden: ['step-99'] }))
  assert.ok('hidden' in bad('install', { values: {}, hidden: 'step-1' }))
  assert.ok('page' in bad('about', { values: {} }))
  assert.ok('evil' in bad('install', { values: {}, evil: 1 }))
  assert.ok('qs.steps[0].href' in bad('prompts', { values: { 'qs.steps': [{ label: 'a', desc: 'b', href: 'javascript:alert(1)' }] } }))
  assert.ok('qs.steps[0].href' in bad('prompts', { values: { 'qs.steps': [{ label: 'a', desc: 'b', href: '//evil.example' }] } }))
  assert.ok('qs.steps[0].href' in bad('prompts', { values: { 'qs.steps': [{ label: 'a', desc: 'b', href: 'http://insecure.example' }] } }))
  assert.equal(validateDoc('prompts', { values: { 'qs.steps': [{ label: 'a', desc: 'b', href: 'https://example.com/x' }, { label: 'c', desc: 'd', href: '/install#step-4' }, { label: 'e', desc: 'f', href: '' }] } }).ok, true)
  assert.ok('prompts.items[0].id' in bad('prompts', { values: { 'prompts.items': [{ id: 'Bad Id', title: 't' }] } }))
  assert.ok('prompts.items[1].id' in bad('prompts', { values: { 'prompts.items': [{ id: 'a' }, { id: 'a' }] } }))
  assert.ok('prompts.items[0].status' in bad('prompts', { values: { 'prompts.items': [{ id: 'a', status: 'hacked' }] } }))
  assert.ok('prompts.items[0].updatedAt' in bad('prompts', { values: { 'prompts.items': [{ id: 'a', updatedAt: '2026-13-45' }] } }))
  assert.ok('videos.items[0].youtubeId' in bad('tutorials', { values: { 'videos.items': [{ id: 'a', youtubeId: 'https://evil.example/x' }] } }))
  assert.ok('videos.items[0].thumbnailMediaId' in bad('tutorials', { values: { 'videos.items': [{ id: 'a', thumbnailMediaId: '../../etc/passwd' }] } }))
  assert.ok('videos.items[0].duration' in bad('tutorials', { values: { 'videos.items': [{ id: 'a', duration: 'long' }] } }))
  assert.ok('doc' in bad('install', { values: { 's1.extra': 'x'.repeat(20000), 's2.extra': 'x'.repeat(20000), 's3.extra': 'x'.repeat(20000), 's4.extra': 'x'.repeat(20000), 's5.extra': 'x'.repeat(20000), 's6.extra': 'x'.repeat(20000), 's7.extra': 'x'.repeat(20000), 's8.extra': 'x'.repeat(20000) } }))
  assert.ok(hideIds(PAGES.install).includes('step-9'))
})

test('PAGE-SOURCE editorial boundary: download resolution, release logic and security rules are not content fields', () => {
  const keys = PAGE_IDS.flatMap(id => allFields(PAGES[id]).map(field => `${id}.${field.key}`))
  for (const forbidden of [/token/i, /secret/i, /sha/i, /r2/i, /manifest/i, /releases?\./i, /download\.(url|href)/i, /href\./]) assert.ok(!keys.some(key => forbidden.test(key)), String(forbidden))
  const install = fs.readFileSync('src/pages/InstallPage.tsx', 'utf8')
  assert.match(install, /<a href="\/download" className="btn-primary">/)
  assert.doesNotMatch(install, /dangerouslySetInnerHTML/)
  for (const file of ['InstallPage', 'PromptsPage', 'TutorialsPage']) assert.doesNotMatch(fs.readFileSync(`src/pages/${file}.tsx`, 'utf8'), /dangerouslySetInnerHTML|innerHTML/, file)
})
