// Page content CMS API: idempotent import, Studio draft/publish/archive workflow, public read-only contract, section isolation, media rules.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getPlatformProxy } from 'wrangler'
import { handleAdminContent } from '../server/cms/handler.ts'
import { csrfToken, type VerifyAccess } from '../server/cms/auth.ts'
import { handlePublicContent } from '../server/cms/publicContent.ts'
import type { AccessIdentity, CmsEnv } from '../server/cms/types.ts'
import { PAGES, defaultDoc, type PageDoc } from '../src/content/pageContent.ts'

const identity: AccessIdentity = { sub: 'owner', email: 'owner@example.com', exp: 2_000_000_000 }
const verify: VerifyAccess = async () => identity
let proxy: Awaited<ReturnType<typeof getPlatformProxy<CmsEnv>>>
let env: CmsEnv
let clock = 1_800_200_000_000

before(async () => {
  proxy = await getPlatformProxy<CmsEnv>({ configPath: 'wrangler.test.jsonc', persist: false, remoteBindings: false })
  env = proxy.env
  for (const file of ['migrations/0002_studio_cms.sql', 'migrations/0003_studio_rate_limits.sql', 'migrations/0004_comments.sql', 'migrations/0005_mutation_integrity.sql'])
    for (const sql of fs.readFileSync(file, 'utf8').split(/;\s*(?:\r?\n|$)/).map(v => v.trim()).filter(Boolean)) await env.CMS_DB!.prepare(sql).run()
})
after(async () => { await proxy.dispose() })

async function admin(method: string, path: string, body?: Record<string, unknown>) {
  const headers: Record<string, string> = { 'cf-access-jwt-assertion': 'test-token' }
  if (body) { headers.origin = 'https://security.test'; headers['sec-fetch-site'] = 'same-origin'; headers['content-type'] = 'application/json'; headers['x-csrf-token'] = await csrfToken(identity, env) }
  clock += 1000
  return handleAdminContent(new Request(`https://security.test/api/admin/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }), env, path.split('/'), { verifyAccess: verify, now: () => clock })
}
const pub = (path: string, e: CmsEnv = env) => handlePublicContent(new Request(`https://webaidesk.test/api/content/${path}`), e, path.split('?')[0]!.split('/'))
const json = async <T>(r: Response) => (await r.json()) as T
type Item = { id: string; slug: string; version: number; status: string; data: { section?: string; page?: { draft: PageDoc | null; published: PageDoc | null } } }

function applySeed(): Promise<unknown[]> {
  const sql = fs.readFileSync('docs/page-content-inventory/seed-page-content.sql', 'utf8')
  const statements = sql.replace(/^--.*\n/gm, '').split(/;\n(?=INSERT|$)/).map(s => s.trim()).filter(Boolean)
  return Promise.all(statements.map(s => env.CMS_DB!.prepare(s.endsWith(';') ? s.slice(0, -1) : s).run()))
}
const count = async (table: string, where = '1=1') => Number((await env.CMS_DB!.prepare(`SELECT COUNT(*) c FROM ${table} WHERE ${where}`).first<{ c: number }>())!.c)
const docWith = (page: 'install' | 'prompts' | 'tutorials', patch: Record<string, unknown>, hidden: string[] = []): PageDoc => ({ values: { ...defaultDoc(PAGES[page]).values, ...patch } as PageDoc['values'], hidden })

test('PAGE-API-01 the import is idempotent and creates unpublished drafts (public pages unchanged)', async () => {
  await applySeed()
  assert.equal(await count('cms_contents', "kind='article' AND json_extract(data_json,'$.section')='page'"), 3)
  await applySeed()
  await applySeed()
  assert.equal(await count('cms_contents', "kind='article' AND json_extract(data_json,'$.section')='page'"), 3, 'no duplicates after retries')
  assert.equal(await count('cms_content_revisions', "snapshot_json LIKE '%\"section\":\"page\"%'"), 3)
  assert.equal(await count('cms_audit_events', "actor='seed-import'"), 3)
  const row = await env.CMS_DB!.prepare("SELECT status, json_extract(data_json,'$.page.published') p, json_extract(data_json,'$.page.draft.values.\"hero.title\"') t FROM cms_contents WHERE slug='install'").first<{ status: string; p: unknown; t: string }>()
  assert.equal(row!.status, 'draft')
  assert.equal(row!.p, null)
  assert.equal(row!.t, 'Hướng dẫn cài đặt AI Desk')
  for (const id of ['install', 'prompts', 'tutorials']) assert.equal((await pub(`pages/${id}`)).status, 404, id)
})

test('PAGE-API-02 the seeded draft equals the code defaults (so publishing it changes nothing)', async () => {
  for (const id of ['install', 'prompts', 'tutorials'] as const) {
    const row = await env.CMS_DB!.prepare("SELECT json_extract(data_json,'$.page.draft') d FROM cms_contents WHERE slug=?1").bind(id).first<{ d: string }>()
    assert.deepEqual(JSON.parse(row!.d), JSON.parse(JSON.stringify(defaultDoc(PAGES[id]))), id)
  }
})

test('PAGE-API-03 Studio workflow: save draft keeps the public page, publish updates it, a second edit updates it, a later draft does not', async () => {
  const items = (await json<{ data: Item[] }>(await admin('GET', 'pages'))).data
  assert.deepEqual(items.map(i => i.slug).sort(), ['install', 'prompts', 'tutorials'])
  const install = items.find(i => i.slug === 'install')!
  const first = docWith('install', { 'hero.title': 'Tiêu đề lần 1' })
  // Draft only: public still 404 (code defaults stay in force)
  const drafted = await json<{ data: Item }>(await admin('PATCH', `pages/${install.id}`, { version: install.version, data: { page: { draft: first, published: null } } }))
  assert.equal(drafted.data.status, 'draft')
  assert.equal((await pub('pages/install')).status, 404)
  // Publish
  const published = await json<{ data: Item }>(await admin('PATCH', `pages/${install.id}`, { version: drafted.data.version, status: 'published', data: { page: { draft: first, published: first } } }))
  assert.equal(published.data.status, 'published')
  const live = await json<{ data: { id: string; content: PageDoc; updatedAt: number } }>(await pub('pages/install'))
  assert.equal(live.data.content.values['hero.title'], 'Tiêu đề lần 1')
  assert.deepEqual(Object.keys(live.data).sort(), ['content', 'id', 'updatedAt'])
  // Second edit: publish again
  const second = docWith('install', { 'hero.title': 'Tiêu đề lần 2' }, ['step-3'])
  const again = await json<{ data: Item }>(await admin('PATCH', `pages/${install.id}`, { version: published.data.version, data: { page: { draft: second, published: second } } }))
  const live2 = await json<{ data: { content: PageDoc } }>(await pub('pages/install'))
  assert.equal(live2.data.content.values['hero.title'], 'Tiêu đề lần 2')
  assert.deepEqual(live2.data.content.hidden, ['step-3'])
  // A later incomplete draft must NOT replace the live content and must not leak
  const secret = docWith('install', { 'hero.title': 'BẢN NHÁP CHƯA XUẤT BẢN' })
  const draftOnly = await json<{ data: Item }>(await admin('PATCH', `pages/${install.id}`, { version: again.data.version, data: { page: { draft: secret, published: second } } }))
  assert.equal(draftOnly.data.status, 'published')
  const stillLive = await (await pub('pages/install')).text()
  assert.match(stillLive, /Tiêu đề lần 2/)
  assert.doesNotMatch(stillLive, /BẢN NHÁP/)
  // Archive: back to code defaults (404), then restore through draft and republish
  assert.equal((await admin('DELETE', `pages/${install.id}`, { version: draftOnly.data.version })).status, 200)
  assert.equal((await pub('pages/install')).status, 404)
  const archived = (await json<{ data: Item[] }>(await admin('GET', 'pages'))).data.find(i => i.slug === 'install')!
  assert.equal(archived.status, 'archived')
  const restored = await json<{ data: Item }>(await admin('PATCH', `pages/${install.id}`, { version: archived.version, status: 'draft' }))
  const republished = await json<{ data: Item }>(await admin('PATCH', `pages/${install.id}`, { version: restored.data.version, status: 'published' }))
  assert.equal(republished.data.status, 'published')
  assert.match(await (await pub('pages/install')).text(), /Tiêu đề lần 2/)
})

test('PAGE-API-04 validation errors are field-level and nothing invalid is stored', async () => {
  const prompts = (await json<{ data: Item[] }>(await admin('GET', 'pages'))).data.find(i => i.slug === 'prompts')!
  const bad = docWith('prompts', { 'qs.steps': [{ label: 'a', desc: 'b', href: 'javascript:alert(1)' }], 'hero.title': 'x'.repeat(500) })
  const response = await admin('PATCH', `pages/${prompts.id}`, { version: prompts.version, data: { page: { draft: bad, published: null } } })
  assert.equal(response.status, 400)
  const body = await json<{ error: { fieldErrors: Record<string, string> } }>(response)
  assert.ok('data.page.draft.qs.steps[0].href' in body.error.fieldErrors)
  assert.ok('data.page.draft.hero.title' in body.error.fieldErrors)
  const unchanged = (await json<{ data: Item }>(await admin('GET', `pages/${prompts.id}`))).data
  assert.equal(unchanged.version, prompts.version)
  for (const data of [{ page: { draft: { values: { nope: 'x' }, hidden: [] }, published: null } }, { page: { other: {} } }, { page: 'string' }, { order: 1 }]) assert.equal((await admin('PATCH', `pages/${prompts.id}`, { version: prompts.version, data })).status, 400, JSON.stringify(data))
})

test('PAGE-API-04b the section of a page record cannot be changed away from page', async () => {
  const prompts = (await json<{ data: Item[] }>(await admin('GET', 'pages'))).data.find(i => i.slug === 'prompts')!
  const response = await admin('PATCH', `pages/${prompts.id}`, { version: prompts.version, data: { section: 'blog' } })
  assert.equal((await json<{ data: Item }>(response)).data.data.section, 'page')
})

test('PAGE-API-05 page records cannot be created for arbitrary slugs and never mix with blog or guides', async () => {
  assert.equal((await admin('POST', 'pages', { title: 'Trang lạ', slug: 'about' })).status, 400)
  assert.equal((await admin('POST', 'pages', { title: 'Install', slug: 'install' })).status, 409)
  const blog = (await json<{ data: Item[] }>(await admin('GET', 'articles'))).data
  const guides = (await json<{ data: Item[] }>(await admin('GET', 'guides'))).data
  for (const list of [blog, guides]) assert.ok(!list.some(i => ['install', 'prompts', 'tutorials'].includes(i.slug)))
  const pagesList = (await json<{ data: Item[] }>(await admin('GET', 'pages'))).data
  const install = pagesList.find(i => i.slug === 'install')!
  for (const path of [`articles/${install.id}`, `guides/${install.id}`]) assert.equal((await admin('GET', path)).status, 404, path)
  assert.equal((await admin('PATCH', `articles/${install.id}`, { version: install.version, title: 'x' })).status, 404)
  const publicBlog = (await json<{ data: Array<{ slug: string }> }>(await pub('articles'))).data
  const publicGuides = (await json<{ data: Array<{ slug: string }> }>(await pub('guides'))).data
  for (const list of [publicBlog, publicGuides]) assert.ok(!list.some(i => ['install', 'prompts', 'tutorials'].includes(i.slug)))
  for (const slug of ['install', 'prompts', 'tutorials']) { assert.equal((await pub(`articles/${slug}`)).status, 404); assert.equal((await pub(`guides/${slug}`)).status, 404) }
  const sneaky = await admin('POST', 'articles', { title: 'Lén', data: { page: { draft: null } } })
  assert.equal(sneaky.status, 400)
})

test('PAGE-API-06 public pages endpoint validates ids and is read-only, uncached and DTO-limited', async () => {
  for (const bad of ['pages', 'pages/about', 'pages/Install', 'pages/install/extra', 'pages/../x', "pages/install'--"]) assert.equal((await pub(bad)).status, 404, bad)
  for (const method of ['POST', 'PUT', 'DELETE']) assert.equal((await handlePublicContent(new Request('https://x/api/content/pages/install', { method }), env, ['pages', 'install'])).status, 405)
  assert.equal((await handlePublicContent(new Request('https://x/'), {}, ['pages', 'install'])).status, 503)
  const response = await pub('pages/install')
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  const body = JSON.parse(await response.text()) as { data: { content: Record<string, unknown> } }
  assert.deepEqual(Object.keys(body).sort(), ['data'])
  assert.deepEqual(Object.keys(body.data).sort(), ['content', 'id', 'updatedAt'])
  assert.deepEqual(Object.keys(body.data.content).sort(), ['hidden', 'values'])
})

test('PAGE-API-07 a corrupted published document fails closed to 404 (the website keeps its built-in content)', async () => {
  await env.CMS_DB!.prepare("UPDATE cms_contents SET data_json=json_set(data_json,'$.page.published',json('{\"values\":{\"unknown.key\":\"x\"},\"hidden\":[]}')) WHERE slug='install'").run()
  assert.equal((await pub('pages/install')).status, 404)
  await env.CMS_DB!.prepare("UPDATE cms_contents SET data_json=json_set(data_json,'$.page.published',json('{\"values\":{\"hero.title\":\"Khôi phục\"},\"hidden\":[]}')) WHERE slug='install'").run()
  assert.equal((await pub('pages/install')).status, 200)
})

test('PAGE-API-08 tutorial thumbnails: a media id is public only through the PUBLISHED document', async () => {
  const id = '00000000-0000-4000-8000-0000000000d1'
  await env.CMS_DB!.prepare("INSERT INTO cms_media (id,storage_key,mime,bytes,width,height,alt_text,sha256,created_at,updated_at) VALUES (?1,'content/t.bin','image/png',10,1,1,'','x',1,1)").bind(id).run()
  const bucket = { get: async () => ({ body: new Response('IMG').body!, httpEtag: '"e"', writeHttpMetadata() {} }), put: async () => undefined, delete: async () => undefined }
  const withMedia = { ...env, CMS_MEDIA: bucket } as CmsEnv
  const media = () => handlePublicContent(new Request(`https://x/api/content/media/${id}`), withMedia, ['media', id])
  const tut = (await json<{ data: Item[] }>(await admin('GET', 'pages'))).data.find(i => i.slug === 'tutorials')!
  const video = { id: 'v1', title: 'V', description: 'D', category: 'intro', youtubeId: '', duration: '', publishedAt: '', status: 'coming-soon', thumbnailMediaId: id }
  const doc = docWith('tutorials', { 'videos.items': [video] })
  const drafted = await json<{ data: Item }>(await admin('PATCH', `pages/${tut.id}`, { version: tut.version, data: { page: { draft: doc, published: null } } }))
  assert.equal((await media()).status, 404, 'draft-only reference must not be public')
  const published = await json<{ data: Item }>(await admin('PATCH', `pages/${tut.id}`, { version: drafted.data.version, status: 'published', data: { page: { draft: doc, published: doc } } }))
  assert.equal((await media()).status, 200)
  assert.equal((await admin('PATCH', `pages/${tut.id}`, { version: published.data.version, data: { page: { draft: doc, published: docWith('tutorials', {}) } } })).status, 200)
  assert.equal((await media()).status, 404, 'removed from the published document')
})
