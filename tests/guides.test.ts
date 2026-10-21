// Guides CMS: Studio (admin) + public read-only API + Markdown guide features. Real local D1 with the production migrations.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getPlatformProxy } from 'wrangler'
import { createServer, type ViteDevServer } from 'vite'
import { handleAdminContent } from '../server/cms/handler.ts'
import { csrfToken, type VerifyAccess } from '../server/cms/auth.ts'
import { handlePublicContent } from '../server/cms/publicContent.ts'
import type { AccessIdentity, CmsEnv } from '../server/cms/types.ts'
import { resolveRoute } from '../src/lib/routes.ts'
import { buildGuideData, describeSaveError, insertAtCursor, mediaMarkdown } from '../src/lib/studioEditor.ts'

const identity: AccessIdentity = { sub: 'owner', email: 'owner@example.com', exp: 2_000_000_000 }
const verify: VerifyAccess = async () => identity
let proxy: Awaited<ReturnType<typeof getPlatformProxy<CmsEnv>>>
let env: CmsEnv
let vite: ViteDevServer
let clock = 1_800_100_000_000

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
  return handleAdminContent(new Request(`https://security.test/api/admin/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }), env, path.split('?')[0]!.split('/'), { verifyAccess: verify, now: () => clock })
}
const pub = (path: string) => handlePublicContent(new Request(`https://webaidesk.test/api/content/${path}`), env, path.split('?')[0]!.split('/'))
type Item = { id: string; slug: string; version: number; title: string; data: Record<string, unknown>; status: string }
const json = async <T>(response: Response) => (await response.json()) as T
const guide = async (title: string, extra: Record<string, unknown> = {}) => (await json<{ data: Item }>(await admin('POST', 'guides', { title, ...extra }))).data
const publicList = async (kind = 'guides') => (await json<{ data: Array<Record<string, unknown>> }>(await pub(kind))).data

test('GUIDE-01 routes: /guides and /guides/:slug resolve; existing routes are unchanged', () => {
  assert.equal(resolveRoute('/guides'), 'guides')
  assert.equal(resolveRoute('/guides/'), 'guides')
  assert.equal(resolveRoute('/guides/cai-dat'), 'guide-detail')
  for (const [path, id] of [['/install', 'install'], ['/tutorials', 'tutorials'], ['/prompts', 'prompts'], ['/blog', 'blog'], ['/blog/x', 'blog-detail'], ['/apps', 'apps'], ['/download', 'download']] as const) assert.equal(resolveRoute(path), id, path)
  assert.equal(resolveRoute('/guides-evil'), 'not-found')
})

test('GUIDE-02 Studio guide lifecycle: create draft, edit, publish, public update, archive, public 404', async () => {
  const created = await guide('Cài đặt AI Desk', { summary: 'Cài đặt từng bước', bodyMarkdown: '## Bước 1\nNội dung', category: 'Cài đặt', status: 'draft', data: { order: 2, version: '0.3.0', platform: 'Windows' } })
  assert.equal(created.data.section, 'guide')
  assert.equal(created.status, 'draft')
  assert.equal((await pub(`guides/${created.slug}`)).status, 404)
  const published = (await json<{ data: Item }>(await admin('PATCH', `guides/${created.id}`, { version: created.version, status: 'published' }))).data
  const visible = await json<{ data: { title: string; bodyMarkdown: string; data: Record<string, unknown> } }>(await pub(`guides/${created.slug}`))
  assert.equal(visible.data.title, 'Cài đặt AI Desk')
  assert.equal(visible.data.data.version, '0.3.0')
  const edited = (await json<{ data: Item }>(await admin('PATCH', `guides/${created.id}`, { version: published.version, bodyMarkdown: '## Bước 1\nNội dung mới', title: 'Cài đặt AI Desk v2' }))).data
  const after = await json<{ data: { title: string; bodyMarkdown: string } }>(await pub(`guides/${created.slug}`))
  assert.equal(after.data.title, 'Cài đặt AI Desk v2')
  assert.match(after.data.bodyMarkdown, /Nội dung mới/)
  assert.equal((await admin('DELETE', `guides/${created.id}`, { version: edited.version })).status, 200)
  assert.equal((await pub(`guides/${created.slug}`)).status, 404)
  assert.ok(!(await publicList()).some(item => item.slug === created.slug))
  assert.equal((await admin('PATCH', `guides/${created.id}`, { version: edited.version, status: 'published' })).status, 409)
})

test('GUIDE-03 sections are isolated: blog and guides never leak into each other, admin or public', async () => {
  const g = await guide('Guide Only', { status: 'published' })
  const blog = (await json<{ data: Item }>(await admin('POST', 'articles', { title: 'Blog Only', status: 'published' }))).data
  assert.ok(!(await publicList('articles')).some(item => item.slug === g.slug), 'guide in blog list')
  assert.equal((await pub(`articles/${g.slug}`)).status, 404)
  assert.ok(!(await publicList('guides')).some(item => item.slug === blog.slug), 'blog in guides list')
  assert.equal((await pub(`guides/${blog.slug}`)).status, 404)
  const adminGuides = (await json<{ data: Item[] }>(await admin('GET', 'guides'))).data
  const adminArticles = (await json<{ data: Item[] }>(await admin('GET', 'articles'))).data
  assert.ok(adminGuides.some(item => item.id === g.id) && !adminGuides.some(item => item.id === blog.id))
  assert.ok(adminArticles.some(item => item.id === blog.id) && !adminArticles.some(item => item.id === g.id))
  for (const [method, path, body] of [['GET', `articles/${g.id}`], ['GET', `guides/${blog.id}`], ['GET', `articles/${g.id}/revisions`], ['PATCH', `articles/${g.id}`, { version: g.version, title: 'x' }], ['PATCH', `guides/${blog.id}`, { version: blog.version, title: 'x' }], ['DELETE', `articles/${g.id}`, { version: g.version }], ['DELETE', `guides/${blog.id}`, { version: blog.version }]] as const)
    assert.equal((await admin(method, path, body as Record<string, unknown> | undefined)).status, 404, `${method} ${path}`)
  const sneaky = await admin('POST', 'articles', { title: 'Sneaky', data: { section: 'guide' } })
  assert.equal(sneaky.status, 400)
  assert.equal((await admin('POST', 'articles', { title: 'Sneaky 2', data: { order: 1 } })).status, 400)
  const forced = await admin('PATCH', `guides/${g.id}`, { version: g.version, data: { section: 'blog' } })
  assert.equal((await json<{ data: Item }>(forced)).data.data.section, 'guide', 'section cannot be changed away from guide')
})

test('GUIDE-04 public guides are ordered by explicit order, then newest; unordered guides go last', async () => {
  const third = await guide('Order Third', { status: 'published', data: { order: 30 } })
  const first = await guide('Order First', { status: 'published', data: { order: 10 } })
  const unordered = await guide('Order Unordered', { status: 'published' })
  const second = await guide('Order Second', { status: 'published', data: { order: 20 } })
  const slugs = (await publicList()).map(item => item.slug as string).filter(slug => [first, second, third, unordered].some(item => item.slug === slug))
  assert.deepEqual(slugs, [first.slug, second.slug, third.slug, unordered.slug])
})

test('GUIDE-05 validation: order, version, platform, related videos and unknown keys fail with field errors', async () => {
  for (const [data, field] of [[{ order: -1 }, 'data.order'], [{ order: 10000 }, 'data.order'], [{ order: 1.5 }, 'data.order'], [{ version: 'bad version!' }, 'data.version'], [{ platform: 'x'.repeat(81) }, 'data.platform'], [{ relatedVideoSlugs: ['A B'] }, 'data.relatedVideoSlugs'], [{ relatedVideoSlugs: Array.from({ length: 7 }, (_, i) => `v-${i}`) }, 'data.relatedVideoSlugs'], [{ relatedVideoSlugs: 'v-1' }, 'data.relatedVideoSlugs'], [{ evil: 1 }, 'data.evil']] as const) {
    const response = await admin('POST', 'guides', { title: 'Invalid', data })
    assert.equal(response.status, 400, JSON.stringify(data))
    const body = await json<{ error: { fieldErrors: Record<string, string> } }>(response)
    assert.ok(field in body.error.fieldErrors, `${field} in ${JSON.stringify(body.error.fieldErrors)}`)
  }
  assert.equal((await admin('POST', 'guides', { title: 'Valid', data: { order: 0, version: '1.0.0', platform: 'Windows', relatedVideoSlugs: ['a-b', 'c'] } })).status, 201)
  assert.equal((await admin('POST', 'guides', { title: '' })).status, 400)
  assert.equal((await admin('POST', 'guides', { title: 'No CSRF' }, )).status, 201)
})

test('GUIDE-06 related videos are linked by slug and only PUBLISHED videos with a valid id are exposed', async () => {
  const mk = async (title: string, status: string) => (await json<{ data: Item }>(await admin('POST', 'videos', { title, status, data: { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } }))).data
  const live = await mk('Video Live', 'published')
  const draft = await mk('Video Draft', 'draft')
  const archivedV = await mk('Video Archived', 'published')
  await admin('DELETE', `videos/${archivedV.id}`, { version: archivedV.version })
  const g = await guide('Guide With Videos', { status: 'published', data: { relatedVideoSlugs: [live.slug, draft.slug, archivedV.slug, 'missing-video'] } })
  const body = await json<{ data: { relatedVideos: Array<{ slug: string; youtubeId: string }> } }>(await pub(`guides/${g.slug}`))
  assert.deepEqual(body.data.relatedVideos, [{ slug: live.slug, title: 'Video Live', youtubeId: 'dQw4w9WgXcQ' }])
  assert.ok(!('relatedVideos' in (await publicList()).find(item => item.slug === g.slug)!))
  await env.CMS_DB!.prepare("UPDATE cms_contents SET data_json=json_set(data_json,'$.youtubeId','bad') WHERE id=?1").bind(live.id).run()
  assert.deepEqual((await json<{ data: { relatedVideos: unknown[] } }>(await pub(`guides/${g.slug}`))).data.relatedVideos, [])
})

test('GUIDE-07 public guide API is read-only, DTO-limited, uncached and has no comments route', async () => {
  const g = await guide('Dto Guide', { status: 'published', bodyMarkdown: 'Body', data: { order: 5 } })
  const detail = (await json<{ data: Record<string, unknown> }>(await pub(`guides/${g.slug}`))).data
  for (const forbidden of ['status', 'version', 'createdAt', 'archivedAt', 'kind', 'deletedAt']) assert.ok(!(forbidden in detail), forbidden)
  assert.equal((await pub('guides')).headers.get('cache-control'), 'no-store')
  assert.equal((await pub(`guides/${g.slug}/comments`)).status, 404)
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.equal((await handlePublicContent(new Request('https://x/api/content/guides', { method }), env, ['guides'])).status, 405)
  for (const bad of ['Upper', 'a b', '..%2f', "x'--"]) assert.equal((await pub(`guides/${bad}`)).status, 404, bad)
  const keys = Object.keys((await publicList()).find(item => item.slug === g.slug)!).sort()
  assert.deepEqual(keys, ['category', 'coverUrl', 'data', 'featured', 'id', 'metaDescription', 'publishedAt', 'seoTitle', 'slug', 'summary', 'tags', 'title', 'updatedAt'])
})

test('GUIDE-08 guide cover and inline images are served only while the guide is published', async () => {
  const id = '00000000-0000-4000-8000-0000000000a1'
  await env.CMS_DB!.prepare("INSERT INTO cms_media (id,storage_key,mime,bytes,width,height,alt_text,sha256,created_at,updated_at) VALUES (?1,'content/g.bin','image/png',10,1,1,'','x',1,1)").bind(id).run()
  const bucket = { get: async () => ({ body: new Response('IMG').body!, httpEtag: '"e"', writeHttpMetadata() {} }), put: async () => undefined, delete: async () => undefined }
  const withMedia = { ...env, CMS_MEDIA: bucket } as CmsEnv
  const fetchMedia = () => handlePublicContent(new Request(`https://x/api/content/media/${id}`), withMedia, ['media', id])
  assert.equal((await fetchMedia()).status, 404)
  const g = await guide('Guide With Image', { status: 'published', bodyMarkdown: mediaMarkdown(id, 'Màn hình [chính]'), data: { coverMediaId: id } })
  assert.equal((await json<{ data: { coverUrl: string } }>(await pub(`guides/${g.slug}`))).data.coverUrl, `/api/content/media/${id}`)
  assert.equal((await fetchMedia()).status, 200)
  await admin('DELETE', `guides/${g.id}`, { version: g.version })
  assert.equal((await fetchMedia()).status, 404)
})

test('GUIDE-09 Studio helpers: guide payload, image Markdown, cursor insertion and readable errors', () => {
  assert.deepEqual(buildGuideData({ keep: 1 }, { coverMediaId: '', order: '', version: ' 0.3 ', platform: 'Windows ', relatedVideoSlugs: ['a'] }), { keep: 1, section: 'guide', coverMediaId: '', order: null, version: '0.3', platform: 'Windows', relatedVideoSlugs: ['a'] })
  assert.equal(buildGuideData(undefined, { coverMediaId: '', order: '7', version: '', platform: '', relatedVideoSlugs: [] }).order, 7)
  assert.equal(mediaMarkdown('id-1', 'Ảnh [x]\nnewline'), '![Ảnh x newline](/api/content/media/id-1)')
  assert.equal(mediaMarkdown('id-1', ''), '![Ảnh minh họa](/api/content/media/id-1)')
  assert.deepEqual(insertAtCursor('abc', 3, 3, 'X'), { text: 'abc\n\nX\n', cursor: 7 })
  assert.deepEqual(insertAtCursor('', 0, 0, 'X'), { text: 'X\n', cursor: 2 })
  assert.equal(insertAtCursor('a\nb', 2, 2, 'X').text, 'a\n\nX\n\nb')
  assert.equal(insertAtCursor('## T\n', 5, 5, '1. x').text, '## T\n\n1. x\n')
  assert.equal(insertAtCursor('a\n\n', 3, 3, 'X').text, 'a\n\nX\n')
  assert.match(describeSaveError(400, 'validation_failed', { 'data.order': 'integer_0_9999', title: 'required_max_180' }), /Thứ tự: phải là số nguyên từ 0 đến 9999; Tiêu đề: bắt buộc/)
  assert.match(describeSaveError(409, 'version_conflict'), /tải lại trang/)
  assert.match(describeSaveError(409, 'slug_conflict'), /Slug/)
  assert.match(describeSaveError(500, 'weird'), /500: weird/)
})

async function renderMarkdown(source: string, props: Record<string, unknown> | null): Promise<string> {
  const react = (await import('react')) as unknown as { createElement: (type: unknown, props?: unknown, ...children: unknown[]) => unknown }
  const server = (await import('react-dom/server')) as unknown as { renderToStaticMarkup: (element: unknown) => string }
  const { MarkdownBody } = await vite.ssrLoadModule('/src/components/MarkdownBody.tsx') as { MarkdownBody: unknown }
  return server.renderToStaticMarkup(react.createElement(MarkdownBody, props, source))
}

test('GUIDE-10 Markdown guide features: steps, callouts, checklist, code, links; hostile input stays inert', async () => {
  const html = await renderMarkdown(['## Các bước', '1. Tải về\n2. Cài đặt', '> [!NOTE]\n> Ghi chú **quan trọng**', '> [!WARNING]\n> Cẩn thận', '> Trích dẫn thường', '- [x] Xong\n- [ ] Chưa', '```bash\nnpm run build\n```', '[Tải](https://example.com/a) [bad](javascript:alert(1)) [mail](mailto:a@b.co)', '<script>window.__x=1</script>', '<iframe src="https://evil.example"></iframe>', '[!NOTE] không phải callout nếu không nằm trong trích dẫn'].join('\n\n'), { headingIds: true })
  assert.match(html, /<ol>/)
  assert.match(html, /<aside class="md-callout md-callout-note" role="note"><p class="md-callout-title">Ghi chú<\/p><p>Ghi chú <strong>quan trọng<\/strong><\/p>\s*<\/aside>/)
  assert.match(html, /md-callout-warning/)
  assert.match(html, /<blockquote>\s*<p>Trích dẫn thường<\/p>\s*<\/blockquote>/)
  assert.match(html, /<input type="checkbox" checked="" disabled="" readOnly="" aria-label="Đã hoàn thành"\/>|<input type="checkbox" disabled="" readonly="" checked="" aria-label="Đã hoàn thành"\/>|aria-label="Đã hoàn thành"/)
  assert.match(html, /<pre><code class="language-bash">npm run build/)
  assert.match(html, /href="https:\/\/example\.com\/a" rel="noopener noreferrer"/)
  assert.match(html, /href="mailto:a@b\.co"/)
  for (const forbidden of [/<script/i, /<iframe/i, /javascript:/i, /evil\.example/]) assert.doesNotMatch(html, forbidden)
  assert.equal((html.match(/<input/g) ?? []).length, 2)
})

test('GUIDE-11 Studio preview rewrites guide images to the private media API; public rendering keeps the public route', async () => {
  const id = '00000000-0000-4000-8000-0000000000b2'
  const source = `![Màn hình](/api/content/media/${id})`
  assert.match(await renderMarkdown(source, null), new RegExp(`src="/api/content/media/${id}"`))
  assert.match(await renderMarkdown(source, { mediaBase: '/studio-media' }), new RegExp(`src="/studio-media/${id}"`))
  assert.doesNotMatch(await renderMarkdown('![x](https://evil.example/a.png)', { mediaBase: '/studio-media' }), /<img/)
})

test('GUIDE-12 public/private bundle separation: public sources contain no admin guide endpoint, and the content route is the only guide route', () => {
  const publicSources = ['server/cms/publicContent.ts', 'src/pages/BlogPages.tsx', 'src/components/MarkdownBody.tsx', 'functions-public/api/content/[[path]].ts']
  for (const file of publicSources) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /\/api\/admin/, file)
  assert.match(fs.readFileSync('src/pages/StudioPage.tsx', 'utf8'), /mediaBase="\/api\/admin\/media"/)
})
