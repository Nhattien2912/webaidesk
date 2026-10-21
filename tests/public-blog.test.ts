// Public blog: published Studio content must be visible, and only published content, with no redeploy.
// Uses a real local D1 (miniflare) with the production migrations; the Markdown renderer runs through Vite SSR.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getPlatformProxy } from 'wrangler'
import { createServer, type ViteDevServer } from 'vite'
import { handleAdminContent } from '../server/cms/handler.ts'
import { csrfToken, type VerifyAccess } from '../server/cms/auth.ts'
import { handlePublicContent } from '../server/cms/publicContent.ts'
import { extractToc, headingSlug } from '../src/lib/markdownToc.ts'
import type { AccessIdentity, CmsEnv } from '../server/cms/types.ts'

const identity: AccessIdentity = { sub: 'owner', email: 'owner@example.com', exp: 2_000_000_000 }
const verify: VerifyAccess = async () => identity
let proxy: Awaited<ReturnType<typeof getPlatformProxy<CmsEnv>>>
let env: CmsEnv
let vite: ViteDevServer
let clock = 1_800_000_000_000

before(async () => {
  proxy = await getPlatformProxy<CmsEnv>({ configPath: 'wrangler.test.jsonc', persist: false, remoteBindings: false })
  env = proxy.env
  for (const file of ['migrations/0002_studio_cms.sql', 'migrations/0003_studio_rate_limits.sql', 'migrations/0004_comments.sql', 'migrations/0005_mutation_integrity.sql'])
    for (const sql of fs.readFileSync(file, 'utf8').split(/;\s*(?:\r?\n|$)/).map(v => v.trim()).filter(Boolean)) await env.CMS_DB!.prepare(sql).run()
  vite = await createServer({ configFile: 'vite.config.ts', logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null } })
})
after(async () => { await proxy.dispose(); await vite.close() })

async function admin(method: string, path: string, body?: Record<string, unknown>) {
  const headers: Record<string, string> = { 'cf-access-jwt-assertion': 'test-token' }
  if (body) { headers.origin = 'https://security.test'; headers['sec-fetch-site'] = 'same-origin'; headers['content-type'] = 'application/json'; headers['x-csrf-token'] = await csrfToken(identity, env) }
  clock += 1000
  return handleAdminContent(new Request(`https://security.test/api/admin/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }), env, path.split('/'), { verifyAccess: verify, now: () => clock })
}
const pub = (path: string, init?: RequestInit) => handlePublicContent(new Request(`https://webaidesk.test/api/content/${path}`, init), env, path.split('?')[0]!.split('/'))
type Item = { id: string; slug: string; version: number; title: string }
const create = async (title: string, extra: Record<string, unknown> = {}) => (await (await admin('POST', 'articles', { title, ...extra })).json() as { data: Item }).data
const list = async (query = '') => (await (await pub(`articles${query}`)).json() as { data: Array<Record<string, unknown>>; meta: { nextCursor: number | null } })

test('BLOG-01 draft is invisible, publish makes it visible, archive removes it (no redeploy involved)', async () => {
  const article = await create('Lifecycle Article', { summary: 'sum', bodyMarkdown: '## Hi', status: 'draft' })
  assert.equal((await pub(`articles/${article.slug}`)).status, 404)
  assert.ok(!(await list()).data.some(item => item.slug === article.slug))
  const published = await (await admin('PATCH', `articles/${article.id}`, { version: article.version, status: 'published' })).json() as { data: Item }
  const visible = await pub(`articles/${article.slug}`)
  assert.equal(visible.status, 200)
  assert.equal(((await visible.json()) as { data: { title: string } }).data.title, 'Lifecycle Article')
  assert.ok((await list()).data.some(item => item.slug === article.slug))
  assert.equal((await admin('DELETE', `articles/${article.id}`, { version: published.data.version })).status, 200)
  assert.equal((await pub(`articles/${article.slug}`)).status, 404)
  assert.ok(!(await list()).data.some(item => item.slug === article.slug))
})

test('BLOG-02 updating a published article is reflected immediately and responses are never cached', async () => {
  const article = await create('Edit Me', { status: 'published', bodyMarkdown: 'v1' })
  const updated = await admin('PATCH', `articles/${article.id}`, { version: article.version, title: 'Edited Title', bodyMarkdown: 'v2 body' })
  assert.equal(updated.status, 200)
  for (const path of ['articles', `articles/${article.slug}`]) assert.equal((await pub(path)).headers.get('cache-control'), 'no-store')
  const detail = (await (await pub(`articles/${article.slug}`)).json() as { data: { title: string; bodyMarkdown: string } }).data
  assert.equal(detail.title, 'Edited Title')
  assert.equal(detail.bodyMarkdown, 'v2 body')
})

test('BLOG-03 list is newest published first and paginates with a cursor', async () => {
  const first = await create('Order A', { status: 'published' })
  const second = await create('Order B', { status: 'published' })
  const third = await create('Order C', { status: 'published' })
  const slugs = (await list()).data.map(item => item.slug)
  assert.deepEqual([third.slug, second.slug, first.slug], slugs.filter(slug => [first.slug, second.slug, third.slug].includes(String(slug))))
  const all = (await list()).data
  const publishedAt = all.map(item => Number(item.publishedAt))
  assert.deepEqual(publishedAt, [...publishedAt].sort((a, b) => b - a))
  const page = await list('?limit=1')
  assert.equal(page.data.length, 1)
  assert.ok(page.meta.nextCursor)
  const next = await list(`?limit=1&cursor=${page.meta.nextCursor}`)
  assert.notEqual(next.data[0]?.slug, page.data[0]?.slug)
  assert.ok(Number(next.data[0]?.publishedAt) <= Number(page.data[0]?.publishedAt))
})

test('BLOG-04 public DTO is an allow-list: no status, version, audit or body in the list', async () => {
  await create('DTO Check', { status: 'published', bodyMarkdown: 'secret-ish body', tags: ['a'] })
  const item = (await list()).data.find(entry => entry.title === 'DTO Check')!
  assert.deepEqual(Object.keys(item).sort(), ['category', 'coverUrl', 'data', 'featured', 'id', 'metaDescription', 'publishedAt', 'seoTitle', 'slug', 'summary', 'tags', 'title', 'updatedAt'])
  const detail = (await (await pub(`articles/${item.slug}`)).json() as { data: Record<string, unknown> }).data
  assert.equal(detail.bodyMarkdown, 'secret-ish body')
  for (const forbidden of ['status', 'version', 'createdAt', 'archivedAt', 'deletedAt', 'kind']) assert.ok(!(forbidden in detail), forbidden)
})

test('BLOG-05 kinds are isolated and soft-deleted rows are never public', async () => {
  const video = (await (await admin('POST', 'videos', { title: 'Vid', status: 'published', data: { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })).json() as { data: Item }).data
  assert.equal((await pub(`articles/${video.slug}`)).status, 404)
  assert.equal((await pub(`videos/${video.slug}`)).status, 200)
  const article = await create('Deleted Row', { status: 'published' })
  await env.CMS_DB!.prepare('UPDATE cms_contents SET deleted_at=?1 WHERE id=?2').bind(clock, article.id).run()
  assert.equal((await pub(`articles/${article.slug}`)).status, 404)
  assert.ok(!(await list()).data.some(item => item.slug === article.slug))
})

test('BLOG-06 slug, kind, path, limit and cursor validation fail closed', async () => {
  const bad = ['articles/Upper-Case', 'articles/has space', 'articles/..%2f..%2fetc', "articles/x'%20OR%201=1--", 'articles/' + 'a'.repeat(181), 'articles/-lead', 'articles/trail-', 'articles/double--dash']
  for (const path of bad) assert.equal((await handlePublicContent(new Request(`https://x/api/content/${path}`), env, path.split('/'))).status, 404, path)
  for (const kind of ['constructor', '__proto__', 'toString', 'admin', 'comments', '']) assert.equal((await handlePublicContent(new Request('https://x/api/content/x'), env, [kind])).status, 404, kind)
  assert.equal((await handlePublicContent(new Request('https://x/'), env, ['articles', 'a', 'comments', 'extra'])).status, 404)
  assert.equal((await handlePublicContent(new Request('https://x/'), env, ['articles', 'a', 'revisions'])).status, 404)
  assert.equal((await handlePublicContent(new Request('https://x/'), env, ['videos', 'a', 'comments'])).status, 404)
  for (const query of ['?limit=999999', '?limit=-5', '?limit=abc', '?limit=1e9', '?cursor=abc', '?cursor=-1', "?cursor=1;DROP TABLE cms_contents", '?cursor=9999999999999999999']) {
    const response = await pub(`articles${query}`)
    assert.equal(response.status, 200, query)
    assert.ok(((await response.json()) as { data: unknown[] }).data.length <= 50)
  }
  assert.ok(Number((await env.CMS_DB!.prepare('SELECT COUNT(*) c FROM cms_contents').first<{ c: number }>())!.c) > 0)
})

test('BLOG-07 public path is read-only and fails closed without a database', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.equal((await pub('articles', { method })).status, 405, method)
  assert.equal((await pub('articles', { method: 'HEAD' })).status, 200)
  assert.equal((await handlePublicContent(new Request('https://x/api/content/articles'), {}, ['articles'])).status, 503)
  const headers = (await pub('articles')).headers
  assert.equal(headers.get('x-content-type-options'), 'nosniff')
  assert.match(headers.get('content-security-policy') ?? '', /default-src 'none'/)
  assert.equal(headers.get('access-control-allow-origin'), null)
})

test('BLOG-08 public content module contains SELECT only and no admin/Access imports; the route imports only it', () => {
  const source = fs.readFileSync('server/cms/publicContent.ts', 'utf8')
  assert.ok(!/\b(INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER|CREATE)\b/.test(source.replace(/\/\*[\s\S]*?\*\//g, '')))
  assert.ok(!/from '\.\/(auth|handler|repository|media|retention|validation)\.ts'/.test(source))
  const route = fs.readFileSync('functions-public/api/content/[[path]].ts', 'utf8')
  assert.ok(/server\/cms\/publicContent\.ts/.test(route))
  assert.ok(!/(auth|handler|admin|access)/i.test(route.replace(/Admin, Access, or write code/i, '').replace(/No admin, Access or write code is imported here\./, '')))
})

test('BLOG-09 Markdown from the CMS is rendered sanitized on the public article page', async () => {
  const react = (await import('react')) as unknown as { createElement: (type: unknown, props?: unknown, ...children: unknown[]) => unknown }
  const server = (await import('react-dom/server')) as unknown as { renderToStaticMarkup: (element: unknown) => string }
  const { MarkdownBody } = await vite.ssrLoadModule('/src/components/MarkdownBody.tsx') as { MarkdownBody: unknown }
  const source = ['## Title', '**bold** [ok](https://example.com) [mail](mailto:a@b.co)', '<script>window.__x=1</script>', '<img src=x onerror="alert(1)">', '[bad](javascript:alert(1))', '[data](data:text/html;base64,AAAA)', '![remote](https://evil.example/x.png)', '<iframe src="https://evil.example"></iframe>'].join('\n\n')
  const html = server.renderToStaticMarkup(react.createElement(MarkdownBody, null, source))
  assert.match(html, /<h2>Title<\/h2>/)
  assert.match(html, /<strong>bold<\/strong>/)
  assert.match(html, /href="https:\/\/example\.com" rel="noopener noreferrer"/)
  for (const forbidden of [/<script/i, /onerror/i, /javascript:/i, /data:text/i, /<img/i, /<iframe/i, /evil\.example/]) assert.doesNotMatch(html, forbidden)
})

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
async function addMedia(id: string, mime = 'image/png', key = `content/${id}.bin`) {
  await env.CMS_DB!.prepare("INSERT INTO cms_media (id,storage_key,mime,bytes,width,height,alt_text,sha256,created_at,updated_at) VALUES (?1,?2,?3,10,1,1,'','x',1,1)").bind(id, key, mime).run()
}
const bucket = { get: async (key: string) => (key.endsWith('missing.bin') ? null : { body: new Response('IMG').body!, httpEtag: '"e"', writeHttpMetadata() {} }), put: async () => undefined, delete: async () => undefined }
const mediaEnv = () => ({ ...env, CMS_MEDIA: bucket }) as CmsEnv
const media = (id: string, method = 'GET') => handlePublicContent(new Request(`https://x/api/content/media/${id}`, { method }), mediaEnv(), ['media', id])

test('BLOG-10 cover image: DTO exposes only a same-origin media URL and the route serves it only while the article is published', async () => {
  const id = uuid(10); await addMedia(id)
  const article = await create('Cover Article', { status: 'published', data: { coverMediaId: id } })
  const detail = (await (await pub(`articles/${article.slug}`)).json() as { data: { coverUrl: string } }).data
  assert.equal(detail.coverUrl, `/api/content/media/${id}`)
  const ok = await media(id)
  assert.equal(ok.status, 200)
  assert.equal(ok.headers.get('content-type'), 'image/png')
  assert.equal(ok.headers.get('x-content-type-options'), 'nosniff')
  assert.match(ok.headers.get('content-security-policy') ?? '', /sandbox/)
  assert.equal((await media(id, 'HEAD')).status, 200)
  assert.equal((await admin('DELETE', `articles/${article.id}`, { version: article.version })).status, 200)
  assert.equal((await media(id)).status, 404)
})

test('BLOG-11 public media route refuses unreferenced, draft, non-image, deleted, missing and malformed ids', async () => {
  const orphan = uuid(11); await addMedia(orphan)
  assert.equal((await media(orphan)).status, 404)
  const draftMedia = uuid(12); await addMedia(draftMedia)
  await create('Draft Cover', { status: 'draft', data: { coverMediaId: draftMedia } })
  assert.equal((await media(draftMedia)).status, 404)
  // Non-image MIME types cannot even be inserted (CHECK constraint on cms_media.mime), and the route re-checks the allow-list.
  await assert.rejects(addMedia(uuid(13), 'image/svg+xml'))
  const gone = uuid(14); await addMedia(gone)
  await create('Gone Cover', { status: 'published', data: { coverMediaId: gone } })
  await env.CMS_DB!.prepare('UPDATE cms_media SET deleted_at=1 WHERE id=?1').bind(gone).run()
  assert.equal((await media(gone)).status, 404)
  const missing = uuid(15); await addMedia(missing, 'image/png', 'content/missing.bin')
  await create('Missing Object', { status: 'published', data: { coverMediaId: missing } })
  assert.equal((await media(missing)).status, 404)
  for (const bad of ['../etc', 'not-a-uuid', `${uuid(1)}x`, `${uuid(1)}'--`, '%00']) assert.equal((await handlePublicContent(new Request('https://x/'), mediaEnv(), ['media', bad])).status, 404, bad)
  assert.equal((await handlePublicContent(new Request('https://x/'), mediaEnv(), ['media'])).status, 404)
  assert.equal((await handlePublicContent(new Request('https://x/'), mediaEnv(), ['media', uuid(1), 'extra'])).status, 404)
  assert.equal((await handlePublicContent(new Request('https://x/', { method: 'POST' }), mediaEnv(), ['media', orphan])).status, 405)
  assert.equal((await handlePublicContent(new Request('https://x/'), env, ['media', orphan])).status, 404)
})

test('BLOG-12 inline images are served only when embedded in a published article body', async () => {
  const id = uuid(16); await addMedia(id)
  assert.equal((await media(id)).status, 404)
  const article = await create('Inline Image', { status: 'published', bodyMarkdown: `![alt](/api/content/media/${id})` })
  assert.equal((await media(id)).status, 200)
  assert.equal((await admin('DELETE', `articles/${article.id}`, { version: article.version })).status, 200)
  assert.equal((await media(id)).status, 404)
})

async function renderMarkdown(source: string, props: Record<string, unknown> | null): Promise<string> {
  const react = (await import('react')) as unknown as { createElement: (type: unknown, props?: unknown, ...children: unknown[]) => unknown }
  const server = (await import('react-dom/server')) as unknown as { renderToStaticMarkup: (element: unknown) => string }
  const { MarkdownBody } = await vite.ssrLoadModule('/src/components/MarkdownBody.tsx') as { MarkdownBody: unknown }
  return server.renderToStaticMarkup(react.createElement(MarkdownBody, props, source))
}

test('BLOG-13 table of contents matches rendered heading ids, ignores code fences and de-duplicates', async () => {
  const source = ['# Title ignored', '## Giới thiệu', '### Chi tiết **đậm**', '```', '## Not a heading', '```', '## Giới thiệu', '## Đ & Â đặc biệt!', 'text', '#### Too deep'].join('\n\n')
  const toc = extractToc(source)
  assert.deepEqual(toc.map(entry => entry.id), ['gioi-thieu', 'chi-tiet-dam', 'gioi-thieu-2', 'd-a-dac-biet'])
  assert.deepEqual(toc.map(entry => entry.level), [2, 3, 2, 2])
  const html = await renderMarkdown(source, { headingIds: true })
  for (const entry of toc) assert.match(html, new RegExp(`<h[23] id="${entry.id}"`))
  assert.equal(headingSlug(''), 'muc')
  assert.doesNotMatch(await renderMarkdown('## Không id', null), /id=/)
})

test('BLOG-14 Markdown images: only the public media route is rendered; tables are wrapped for horizontal scroll', async () => {
  const good = uuid(20)
  const html = await renderMarkdown([`![ok](/api/content/media/${good})`, '![remote](https://evil.example/a.png)', '![other](/api/other/x)', '![dataurl](data:image/png;base64,AAAA)', ['| a | b |', '| - | - |', '| 1 | 2 |'].join('\n')].join('\n\n'), null)
  assert.match(html, new RegExp(`<img src="/api/content/media/${good}" alt="ok" loading="lazy"`))
  assert.equal((html.match(/<img/g) ?? []).length, 1)
  assert.match(html, /<div class="md-table-wrap"[^>]*><table>/)
})
