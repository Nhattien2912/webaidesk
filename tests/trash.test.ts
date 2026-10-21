// Trash (soft delete), restore and guarded permanent delete. All data is synthetic and local (in-memory D1); nothing touches a real database.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getPlatformProxy } from 'wrangler'
import { handleAdminContent } from '../server/cms/handler.ts'
import { csrfToken, type VerifyAccess } from '../server/cms/auth.ts'
import { handlePublicContent } from '../server/cms/publicContent.ts'
import type { AccessIdentity, CmsEnv, R2BucketLike } from '../server/cms/types.ts'

const identity: AccessIdentity = { sub: 'owner', email: 'owner@example.com', exp: 2_000_000_000 }
const verify: VerifyAccess = async () => identity
let proxy: Awaited<ReturnType<typeof getPlatformProxy<CmsEnv>>>
let baseEnv: CmsEnv
let clock = 1_800_300_000_000
const MEDIA_ID = '11111111-1111-4111-8111-111111111111'
const bucket: R2BucketLike = {
  async put() { return null },
  async get() { return { body: new Blob(['png']).stream(), httpEtag: '"e"', writeHttpMetadata() {} } },
  async delete() { throw new Error('R2 delete must never be called') },
}
const withR2 = (extra: Partial<CmsEnv> = {}): CmsEnv => ({ ...baseEnv, CMS_MEDIA: bucket, ...extra })

before(async () => {
  proxy = await getPlatformProxy<CmsEnv>({ configPath: 'wrangler.test.jsonc', persist: false, remoteBindings: false })
  baseEnv = proxy.env
  for (const file of ['migrations/0002_studio_cms.sql', 'migrations/0003_studio_rate_limits.sql', 'migrations/0004_comments.sql', 'migrations/0005_mutation_integrity.sql', 'migrations/0006_trash_index.sql'])
    for (const sql of fs.readFileSync(file, 'utf8').split(/;\s*(?:\r?\n|$)/).map(v => v.trim()).filter(Boolean)) await baseEnv.CMS_DB!.prepare(sql).run()
  await baseEnv.CMS_DB!.prepare("INSERT INTO cms_media (id,storage_key,mime,bytes,width,height,alt_text,sha256,created_at,updated_at) VALUES (?1,'media/test.png','image/png',10,10,10,'', 'abc',1,1)").bind(MEDIA_ID).run()
})
after(async () => { await proxy.dispose() })

async function admin(method: string, path: string, body?: Record<string, unknown>, env: CmsEnv = baseEnv, opts: { csrf?: boolean; origin?: string | null; verifyAccess?: VerifyAccess; token?: string | null } = {}) {
  const headers: Record<string, string> = {}
  if (opts.token !== null) headers['cf-access-jwt-assertion'] = opts.token ?? 'test-token'
  if (body) {
    if (opts.origin !== null) headers.origin = opts.origin ?? 'https://security.test'
    headers['sec-fetch-site'] = 'same-origin'
    headers['content-type'] = 'application/json'
    if (opts.csrf !== false) headers['x-csrf-token'] = await csrfToken(identity, env)
  }
  clock += 1000
  await baseEnv.CMS_DB!.prepare('DELETE FROM cms_rate_limits').run() // synthetic test DB: the per-minute admin limiter is not under test here
  return handleAdminContent(new Request(`https://security.test/api/admin/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }), env, path.split('?')[0]!.split('/'), { verifyAccess: opts.verifyAccess ?? verify, now: () => clock })
}
const pub = (path: string, env: CmsEnv = withR2()) => handlePublicContent(new Request(`https://webaidesk.test/api/content/${path}`), env, path.split('?')[0]!.split('/'))
const j = async <T = Record<string, any>>(r: Response) => (await r.json()) as T // eslint-disable-line @typescript-eslint/no-explicit-any
type Created = { id: string; version: number; slug: string }

const SPECS = {
  article: { resource: 'articles', data: {} },
  guide: { resource: 'guides', data: {} },
  video: { resource: 'videos', data: { youtubeId: 'dQw4w9WgXcQ' } },
  app: { resource: 'apps', data: {} },
} as const
type Type = keyof typeof SPECS

async function create(type: Type, slug: string, status: 'draft' | 'published' | 'archived' = 'draft', extra: Record<string, unknown> = {}): Promise<Created> {
  const spec = SPECS[type]
  const r = await admin('POST', spec.resource, { title: `Synthetic ${type} ${slug}`, slug, status: status === 'archived' ? 'draft' : status, category: 'test', data: { ...spec.data, ...(extra.data as object | undefined) }, ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== 'data')) })
  assert.equal(r.status, 201, `create ${type}: ${JSON.stringify(await r.clone().json())}`)
  let item = (await j<{ data: Created }>(r)).data
  if (status === 'archived') {
    const a = await admin('PATCH', `${spec.resource}/${item.id}`, { version: item.version, status: 'archived' })
    assert.equal(a.status, 200)
    item = (await j<{ data: Created }>(a)).data
  }
  return item
}
const trash = (type: Type, item: Created, version = item.version, env = baseEnv) => admin('POST', `${SPECS[type].resource}/${item.id}/trash`, { version }, env)
const restore = (id: string, version: number, slug?: string) => admin('POST', `trash/${id}/restore`, { version, ...(slug ? { slug } : {}) })
const publicStatus = async (type: Type, slug: string) => (await pub(`${SPECS[type].resource}/${slug}`)).status
const publicListHas = async (type: Type, slug: string) => (await j<{ data: Array<{ slug: string }> }>(await pub(SPECS[type].resource))).data.some(i => i.slug === slug)
const adminListHas = async (type: Type, id: string) => (await j<{ data: Array<{ id: string }> }>(await admin('GET', `${SPECS[type].resource}?limit=100`))).data.some(i => i.id === id)
const trashList = async (q = '') => (await j<{ data: Array<Record<string, any>>; meta: Record<string, any> }>(await admin('GET', `trash?limit=50${q}`))) // eslint-disable-line @typescript-eslint/no-explicit-any
const count = async (sql: string, ...v: unknown[]) => Number((await baseEnv.CMS_DB!.prepare(sql).bind(...v).first<{ c: number }>())!.c)

for (const type of Object.keys(SPECS) as Type[]) {
  test(`TRASH-01 ${type}: soft delete hides a published item from every public API and normal list, keeps the row, revisions and original status`, async () => {
    const item = await create(type, `pub-${type}`, 'published')
    assert.equal(await publicListHas(type, item.slug), true)
    assert.equal(await adminListHas(type, item.id), true)
    const res = await trash(type, item)
    assert.equal(res.status, 200)
    const body = await j<{ data: Record<string, any>; meta: { alreadyTrashed: boolean } }>(res) // eslint-disable-line @typescript-eslint/no-explicit-any
    assert.equal(body.data.originalStatus, 'published')
    assert.equal(body.data.type, type)
    assert.equal(body.meta.alreadyTrashed, false)
    assert.equal(await publicListHas(type, item.slug), false)
    if (type === 'article' || type === 'guide') assert.equal(await publicStatus(type, item.slug), 404)
    assert.equal(await adminListHas(type, item.id), false, 'normal Studio list must not show trashed items')
    const row = await baseEnv.CMS_DB!.prepare('SELECT status,deleted_at,title,version FROM cms_contents WHERE id=?1').bind(item.id).first<Record<string, any>>() // eslint-disable-line @typescript-eslint/no-explicit-any
    assert.equal(row!.status, 'published', 'original status preserved')
    assert.ok(Number(row!.deleted_at) > 0)
    assert.equal(row!.version, item.version + 1)
    assert.ok(await count('SELECT COUNT(*) c FROM cms_content_revisions WHERE content_id=?1', item.id) >= 2)
    assert.equal(await count("SELECT COUNT(*) c FROM cms_audit_events WHERE entity_id=?1 AND operation='trash'", item.id), 1)
    const listed = (await trashList()).data.find(i => i.id === item.id)
    assert.ok(listed)
    assert.equal(listed!.originalStatus, 'published')
    assert.ok(listed!.deletedAt > 0)
  })

  test(`TRASH-02 ${type}: draft and archived items also disappear from lists, stay archived-vs-trashed distinct, and never leak publicly`, async () => {
    const draft = await create(type, `draft-${type}`, 'draft')
    const archived = await create(type, `arch-${type}`, 'archived')
    assert.equal(await adminListHas(type, archived.id), true, 'archive is NOT trash: still in the normal list')
    assert.equal((await trashList()).data.some(i => i.id === archived.id), false)
    for (const [item, status] of [[draft, 'draft'], [archived, 'archived']] as const) {
      const r = await trash(type, item, item.version)
      assert.equal(r.status, 200)
      assert.equal((await j<{ data: { originalStatus: string } }>(r)).data.originalStatus, status)
      assert.equal(await adminListHas(type, item.id), false)
      assert.equal(await publicListHas(type, item.slug), false)
    }
  })

  test(`TRASH-03 ${type}: restore returns a draft (never silently public), then an explicit publish makes it public again; revisions stay coherent`, async () => {
    const item = await create(type, `rest-${type}`, 'published')
    const t = await j<{ data: { version: number } }>(await trash(type, item))
    const res = await restore(item.id, t.data.version)
    assert.equal(res.status, 200)
    const body = await j<{ data: { version: number }; meta: { restoredStatus: string } }>(res)
    assert.equal(body.meta.restoredStatus, 'draft')
    assert.equal(await adminListHas(type, item.id), true)
    assert.equal(await publicListHas(type, item.slug), false, 'restored item must not be public before an explicit publish')
    const pubd = await admin('PATCH', `${SPECS[type].resource}/${item.id}`, { version: body.data.version, status: 'published' })
    assert.equal(pubd.status, 200)
    assert.equal(await publicListHas(type, item.slug), true)
    const versions = (await baseEnv.CMS_DB!.prepare('SELECT version FROM cms_content_revisions WHERE content_id=?1 ORDER BY version').bind(item.id).all<{ version: number }>()).results!.map(r => r.version)
    assert.deepEqual(versions, [...new Set(versions)].sort((a, b) => a - b), 'revision versions unique and ordered')
    assert.equal(versions.at(-1), (await baseEnv.CMS_DB!.prepare('SELECT version v FROM cms_contents WHERE id=?1').bind(item.id).first<{ v: number }>())!.v)
  })
}

test('TRASH-04 published article/guide cover media stops being public when the owner is trashed, and returns only after explicit publish', async () => {
  const item = await create('article', 'cover-article', 'published', { data: { coverMediaId: MEDIA_ID } })
  assert.equal((await pub(`media/${MEDIA_ID}`)).status, 200)
  const t = await j<{ data: { version: number } }>(await trash('article', item))
  assert.equal((await pub(`media/${MEDIA_ID}`)).status, 404)
  assert.equal(await count('SELECT COUNT(*) c FROM cms_media WHERE id=?1 AND deleted_at IS NULL', MEDIA_ID), 1, 'media row kept')
  const r = await j<{ data: { version: number } }>(await restore(item.id, t.data.version))
  assert.equal((await pub(`media/${MEDIA_ID}`)).status, 404, 'still hidden while the restored item is a draft')
  await admin('PATCH', `articles/${item.id}`, { version: r.data.version, status: 'published' })
  assert.equal((await pub(`media/${MEDIA_ID}`)).status, 200)
})

test('TRASH-05 double submit and stale versions: repeated trash/restore are idempotent, wrong versions conflict', async () => {
  const item = await create('article', 'idem', 'published')
  assert.equal((await trash('article', item, item.version + 5)).status, 409)
  const first = await trash('article', item)
  const second = await trash('article', item)
  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.equal((await j<{ meta: { alreadyTrashed: boolean } }>(second)).meta.alreadyTrashed, true)
  assert.equal(await count("SELECT COUNT(*) c FROM cms_audit_events WHERE entity_id=?1 AND operation='trash'", item.id), 1, 'no second audit/revision for the duplicate request')
  const v = (await j<{ data: { version: number } }>(first)).data.version
  assert.equal((await restore(item.id, v + 3)).status, 409)
  const r1 = await restore(item.id, v)
  const r2 = await restore(item.id, v)
  assert.equal(r1.status, 200)
  assert.equal((await j<{ meta: { alreadyRestored: boolean } }>(r2)).meta.alreadyRestored, true)
  assert.equal(await count("SELECT COUNT(*) c FROM cms_audit_events WHERE entity_id=?1 AND operation='restore'", item.id), 1)
})

test('TRASH-06 slug collision on restore: 409 with a suggestion; restoring with a new slug works; nothing is overwritten', async () => {
  const a = await create('article', 'collide', 'published')
  const t = await j<{ data: { version: number } }>(await trash('article', a))
  const b = await create('article', 'collide', 'draft')
  const res = await restore(a.id, t.data.version)
  assert.equal(res.status, 409)
  const err = await j<{ error: { code: string; suggestedSlug: string } }>(res)
  assert.equal(err.error.code, 'slug_conflict')
  assert.equal(err.error.suggestedSlug, 'collide-2')
  assert.equal(await count('SELECT COUNT(*) c FROM cms_contents WHERE id=?1 AND deleted_at IS NOT NULL', a.id), 1, 'failed restore leaves the item in Trash')
  assert.equal(await count("SELECT COUNT(*) c FROM cms_contents WHERE id=?1 AND slug='collide' AND deleted_at IS NULL", b.id), 1)
  assert.equal((await restore(a.id, t.data.version, 'Khôi Phục Bài')).status, 200)
  assert.equal((await baseEnv.CMS_DB!.prepare('SELECT slug FROM cms_contents WHERE id=?1').bind(a.id).first<{ slug: string }>())!.slug, 'khoi-phuc-bai')
})

test('TRASH-07 restore reports media that no longer exists instead of failing or silently dropping it', async () => {
  const item = await create('article', 'missing-media', 'draft')
  await baseEnv.CMS_DB!.prepare("UPDATE cms_contents SET data_json=json_set(data_json,'$.coverMediaId','22222222-2222-4222-8222-222222222222') WHERE id=?1").bind(item.id).run()
  const t = await j<{ data: { version: number } }>(await trash('article', item))
  const r = await j<{ meta: { missingMediaIds: string[] } }>(await restore(item.id, t.data.version))
  assert.deepEqual(r.meta.missingMediaIds, ['22222222-2222-4222-8222-222222222222'])
})

test('TRASH-08 a trashed item cannot be edited or published through the normal endpoints', async () => {
  const item = await create('guide', 'locked', 'published')
  await trash('guide', item)
  const r = await admin('PATCH', `guides/${item.id}`, { version: item.version + 1, status: 'published' })
  assert.equal(r.status, 404)
  assert.equal(await publicStatus('guide', item.slug), 404)
})

test('TRASH-09 trash list: type filter, search, pagination without gaps or duplicates (including equal timestamps)', async () => {
  const ids: string[] = []
  for (let n = 0; n < 5; n++) { const it = await create('video', `page-v-${n}`, 'draft'); ids.push(it.id); await trash('video', it) }
  await baseEnv.CMS_DB!.prepare("UPDATE cms_contents SET deleted_at=1800300999999 WHERE id IN (?1,?2,?3)").bind(ids[0], ids[1], ids[2]).run()
  const all = (await trashList('&type=video&q=page-v')).data
  assert.equal(all.length, 5)
  const seen: string[] = []
  let cursor: string | null = null
  for (let guard = 0; guard < 10; guard++) {
    const r = await j<{ data: Array<{ id: string }>; meta: { nextCursor: string | null; total: number } }>(await admin('GET', `trash?limit=2&type=video&q=page-v${cursor ? `&cursor=${cursor}` : ''}`))
    assert.equal(r.meta.total, 5)
    seen.push(...r.data.map(i => i.id))
    cursor = r.meta.nextCursor
    if (!cursor) break
  }
  assert.equal(seen.length, 5)
  assert.equal(new Set(seen).size, 5)
  assert.ok((await trashList('&type=guide&q=page-v')).data.length === 0)
  assert.equal((await admin('GET', 'trash?type=bogus')).status, 400)
  assert.equal((await admin('GET', 'trash?cursor=bad')).status, 400)
})

test('TRASH-10 fixed website pages can never be trashed, restored or purged (protected); archive/revert workflow is separate', async () => {
  const page = await admin('POST', 'pages', { title: 'Hướng dẫn cài đặt AI Desk', slug: 'install', status: 'draft', category: 'Trang nội dung', data: { section: 'page', page: { draft: null, published: null } } })
  assert.equal(page.status, 201)
  const created = (await j<{ data: Created }>(page)).data
  assert.equal((await admin('POST', `pages/${created.id}/trash`, { version: created.version })).status, 403)
  assert.equal((await admin('POST', `articles/${created.id}/trash`, { version: created.version })).status, 403)
  assert.equal((await admin('POST', `trash/${created.id}/restore`, { version: created.version })).status, 403)
  assert.equal((await admin('POST', `trash/${created.id}/purge`, { version: created.version, confirm: 'XOA VINH VIEN', slug: 'install' }, withR2({ CMS_PERMANENT_DELETE_ENABLED: 'true' }))).status, 403)
  assert.equal(await count("SELECT COUNT(*) c FROM cms_contents WHERE id=?1 AND deleted_at IS NULL", created.id), 1)
  assert.equal((await trashList()).data.some(i => i.id === created.id), false)
  const archived = await admin('PATCH', `pages/${created.id}`, { version: created.version, status: 'archived' })
  assert.equal(archived.status, 200, 'removing a custom publication (archive) is still allowed')
})

test('TRASH-11 permanent delete is disabled unless the flag is on, requires the typed phrase, the slug, Trash state, version and zero comments', async () => {
  const item = await create('article', 'purge-me', 'draft')
  const on = withR2({ CMS_PERMANENT_DELETE_ENABLED: 'true' })
  const purge = (body: Record<string, unknown>, env: CmsEnv) => admin('POST', `trash/${item.id}/purge`, body, env)
  assert.equal((await purge({ version: item.version, confirm: 'XOA VINH VIEN', slug: 'purge-me' }, baseEnv)).status, 403, 'flag off')
  assert.equal((await purge({ version: item.version, confirm: 'XOA VINH VIEN', slug: 'purge-me' }, on)).status, 409, 'not in trash yet')
  const t = await j<{ data: { version: number } }>(await trash('article', item))
  const v = t.data.version
  assert.equal((await purge({ version: v, slug: 'purge-me' }, on)).status, 400, 'phrase missing')
  assert.equal((await purge({ version: v, confirm: 'xoa vinh vien', slug: 'purge-me' }, on)).status, 400, 'phrase is case-sensitive')
  assert.equal((await purge({ version: v, confirm: 'XOA VINH VIEN', slug: 'other' }, on)).status, 400, 'slug mismatch')
  assert.equal((await purge({ version: v + 1, confirm: 'XOA VINH VIEN', slug: 'purge-me' }, on)).status, 409, 'stale version')
  await baseEnv.CMS_DB!.prepare("INSERT INTO cms_comments (id,content_id,content_kind,display_name,body,status,abuse_key,version,created_at,updated_at) VALUES ('c1',?1,'article','Tester','Synthetic comment','approved','k',1,1,1)").bind(item.id).run()
  const blocked = await purge({ version: v, confirm: 'XOA VINH VIEN', slug: 'purge-me' }, on)
  assert.equal(blocked.status, 409)
  assert.equal((await j<{ error: { code: string } }>(blocked)).error.code, 'has_comments')
  assert.equal(await count('SELECT COUNT(*) c FROM cms_contents WHERE id=?1', item.id), 1, 'nothing deleted while blocked')
})

test('TRASH-12 permanent delete (synthetic data only): removes the item and its revisions atomically, keeps media, writes a minimal audit record, and repeats safely', async () => {
  const item = await create('video', 'purge-ok', 'published', { data: { youtubeId: 'dQw4w9WgXcQ' } })
  const t = await j<{ data: { version: number } }>(await trash('video', item))
  const on = withR2({ CMS_PERMANENT_DELETE_ENABLED: 'true' })
  const mediaBefore = await count('SELECT COUNT(*) c FROM cms_media')
  const res = await admin('POST', `trash/${item.id}/purge`, { version: t.data.version, confirm: 'XOA VINH VIEN', slug: 'purge-ok' }, on)
  assert.equal(res.status, 200)
  assert.equal(await count('SELECT COUNT(*) c FROM cms_contents WHERE id=?1', item.id), 0)
  assert.equal(await count('SELECT COUNT(*) c FROM cms_content_revisions WHERE content_id=?1', item.id), 0)
  assert.equal(await count('SELECT COUNT(*) c FROM cms_media'), mediaBefore, 'cms_media rows untouched (R2 delete would throw in this test)')
  const audit = await baseEnv.CMS_DB!.prepare("SELECT metadata_json m FROM cms_audit_events WHERE entity_id=?1 AND operation='purge'").bind(item.id).first<{ m: string }>()
  assert.deepEqual(JSON.parse(audit!.m), { kind: 'video', slug: 'purge-ok', lastVersion: t.data.version })
  assert.ok(!audit!.m.includes('Synthetic'), 'no title or body in the audit record')
  assert.equal((await admin('POST', `trash/${item.id}/purge`, { version: t.data.version, confirm: 'XOA VINH VIEN', slug: 'purge-ok' }, on)).status, 404, 'repeat is a safe 404')
  assert.equal((await trashList()).data.some(i => i.id === item.id), false)
})

test('TRASH-13 authentication, Origin and CSRF are enforced on every trash endpoint; GET list requires authentication', async () => {
  const item = await create('article', 'authz', 'draft')
  const urls: Array<[string, string, Record<string, unknown>]> = [['POST', `articles/${item.id}/trash`, { version: item.version }], ['POST', `trash/${item.id}/restore`, { version: 1 }], ['POST', `trash/${item.id}/purge`, { version: 1, confirm: 'XOA VINH VIEN', slug: 'authz' }]]
  for (const [m, p, b] of urls) {
    assert.equal((await admin(m, p, b, baseEnv, { token: null })).status, 401, `${p} unauthenticated`)
    assert.equal((await admin(m, p, b, baseEnv, { csrf: false })).status, 403, `${p} missing CSRF`)
    assert.equal((await admin(m, p, b, baseEnv, { origin: 'https://evil.example' })).status, 403, `${p} foreign origin`)
    assert.equal((await admin(m, p, b, baseEnv, { origin: null })).status, 403, `${p} no origin`)
    assert.equal((await admin(m, p, b, baseEnv, { verifyAccess: async () => { throw new Error('access_forbidden') } })).status, 403, `${p} not an owner`)
  }
  assert.equal((await admin('GET', 'trash', undefined, baseEnv, { token: null })).status, 401)
  assert.equal((await admin('GET', 'trash', undefined, baseEnv, { verifyAccess: async () => { throw new Error('access_forbidden') } })).status, 403)
  assert.equal(await count('SELECT COUNT(*) c FROM cms_contents WHERE id=?1 AND deleted_at IS NULL', item.id), 1, 'rejected requests changed nothing')
})

test('TRASH-14 malformed input is rejected; hostile titles are returned as inert JSON and never executed or reflected as HTML', async () => {
  const xss = await create('article', 'xss-title', 'draft', { title: '<img src=x onerror=alert(1)>' })
  assert.equal((await admin('POST', `articles/not-a-uuid/trash`, { version: 1 })).status, 404)
  assert.equal((await admin('POST', `articles/${xss.id}/trash`, { version: 'x' })).status, 400)
  assert.equal((await admin('POST', `articles/${xss.id}/trash`, { version: 0 })).status, 400)
  assert.equal((await admin('POST', `widgets/${xss.id}/trash`, { version: 1 })).status, 404)
  assert.equal((await admin('POST', `videos/${xss.id}/trash`, { version: xss.version })).status, 404, 'wrong content type for the id')
  assert.equal((await trash('article', xss)).status, 200)
  const r = await admin('GET', 'trash?limit=50')
  assert.match(r.headers.get('content-type') ?? '', /^application\/json/)
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
  assert.ok((await j<{ data: Array<{ id: string }> }>(r)).data.some(i => i.id === xss.id))
  const tooBig = await admin('POST', `trash/${xss.id}/restore`, { version: 1, pad: 'x'.repeat(10_000) })
  assert.equal(tooBig.status, 413)
})

test('TRASH-15 comment endpoints do not expose comments of a trashed item', async () => {
  const item = await create('article', 'with-comments', 'published')
  assert.equal((await pub(`articles/${item.slug}/comments`)).status, 200)
  await trash('article', item)
  assert.equal((await pub(`articles/${item.slug}/comments`)).status, 404)
})
