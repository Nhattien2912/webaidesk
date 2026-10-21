// FAQ (homepage) and Changelog page content: CMS overrides, fallbacks, validation of links/dates, safe rendering.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type ViteDevServer } from 'vite'
import { PAGES, defaultDoc, validateDoc, type PageDoc } from '../src/content/pageContent.ts'
import { toFaqEntries } from '../src/lib/faqEntries.ts'
import { FAQS } from '../src/data/faq.ts'
import { changelog } from '../src/data/changelog.ts'

let vite: ViteDevServer
let react: { createElement: (type: unknown, props?: unknown) => unknown }
let render: (element: unknown) => string
before(async () => {
  vite = await createServer({ configFile: 'vite.config.ts', logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null } })
  react = (await import('react')) as unknown as typeof react
  render = ((await import('react-dom/server')) as unknown as { renderToStaticMarkup: typeof render }).renderToStaticMarkup
})
after(async () => { await vite.close() })
const faq = async (content: PageDoc) => render(react.createElement(((await vite.ssrLoadModule('/src/components/FaqSection.tsx')) as Record<string, unknown>).FaqSection, { content }))
const log = async (content: PageDoc) => render(react.createElement(((await vite.ssrLoadModule('/src/pages/ChangelogPage.tsx')) as Record<string, unknown>).ChangelogPage, { content }))
const withValues = (page: 'faq' | 'changelog', patch: Record<string, unknown>): PageDoc => ({ values: { ...defaultDoc(PAGES[page]).values, ...patch } as PageDoc['values'], hidden: [] })

test('FAQ-01 defaults reproduce the code FAQ entries exactly (paragraphs and links round-trip)', () => {
  const entries = toFaqEntries(PAGES.faq.sections[1]!.fields[0]!.default as Array<Record<string, string>>)
  assert.deepEqual(entries, FAQS)
})

test('FAQ-02 a CMS edit changes question, answer and link; unrelated entries stay', async () => {
  const items = structuredClone(PAGES.faq.sections[1]!.fields[0]!.default) as Array<Record<string, string>>
  items[0]!.question = 'AI Desk là gì? (đã sửa)'
  items[3]!.links = 'Trang cài đặt | /install'
  items[3]!.answer = 'Xem Trang cài đặt để biết thêm.'
  const html = await faq(withValues('faq', { 'hero.title': 'Hỏi nhanh', 'faq.items': items }))
  assert.ok(html.includes('AI Desk là gì? (đã sửa)'))
  assert.ok(html.includes('Hỏi nhanh'))
  assert.ok(html.includes('<a href="/install">Trang cài đặt</a>'))
  assert.ok(html.includes(FAQS[1]!.question))
})

test('FAQ-03 script-like text is rendered as text (React escaping), never as markup', async () => {
  const items = structuredClone(PAGES.faq.sections[1]!.fields[0]!.default) as Array<Record<string, string>>
  items[0]!.question = '<img src=x onerror=alert(1)>'
  const html = await faq(withValues('faq', { 'faq.items': items }))
  assert.ok(!html.includes('<img src=x'))
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'))
})

test('FAQ-04 validation: link lines must be "text | internal-or-https", ids unique slugs, javascript: rejected', () => {
  const base = () => structuredClone(PAGES.faq.sections[1]!.fields[0]!.default) as Array<Record<string, string>>
  const bad = (mutate: (items: Array<Record<string, string>>) => void) => { const items = base(); mutate(items); return validateDoc('faq', { values: { 'faq.items': items }, hidden: [] }) }
  assert.equal(bad(() => {}).ok, true)
  for (const link of ['x | javascript:alert(1)', 'x | //evil.example', 'x | http://insecure.example', 'no separator']) assert.equal(bad(items => { items[0]!.links = link }).ok, false, link)
  assert.equal(bad(items => { items[0]!.links = 'Tải về | https://example.com/a\nTrang | /install' }).ok, true)
  assert.equal(bad(items => { items[1]!.id = items[0]!.id }).ok, false)
  assert.equal(bad(items => { items[0]!.id = 'Not A Slug' }).ok, false)
  assert.equal(bad(items => { items[0]!.unknown = 'x' }).ok, false)
})

test('CHANGELOG-01 defaults match the code changelog; an edit adds an entry and keeps the layout', async () => {
  const items = structuredClone(PAGES.changelog.sections[1]!.fields[0]!.default) as Array<Record<string, string>>
  assert.equal(items.length, changelog.length)
  assert.deepEqual(items.map(i => i.version), changelog.map(e => e.version))
  items.unshift({ id: 'website-v3-studio', version: 'Website V3 Studio', date: '2026-10-21', scope: 'website', status: 'Đã triển khai', changes: 'Studio riêng tư.\nNội dung chỉnh sửa trong CMS.' })
  const html = await log(withValues('changelog', { 'entries.items': items }))
  assert.ok(html.includes('Website V3 Studio'))
  assert.ok(html.includes('Nội dung chỉnh sửa trong CMS.'))
  assert.ok(html.includes(changelog[0]!.version))
})

test('CHANGELOG-02 validation rejects bad dates, unknown scope and duplicate ids', () => {
  const base = () => structuredClone(PAGES.changelog.sections[1]!.fields[0]!.default) as Array<Record<string, string>>
  const check = (mutate: (items: Array<Record<string, string>>) => void) => { const items = base(); mutate(items); return validateDoc('changelog', { values: { 'entries.items': items }, hidden: [] }).ok }
  assert.equal(check(() => {}), true)
  assert.equal(check(items => { items[0]!.date = '2026-13-40' }), false)
  assert.equal(check(items => { items[0]!.scope = 'other' }), false)
  assert.equal(check(items => { items[1]!.id = items[0]!.id }), false)
})
