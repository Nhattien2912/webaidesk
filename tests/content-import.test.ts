// Import reconciliation: the seed is insert-only keyed by the stable page slug, so it can never overwrite Studio edits,
// publications or archives, and it never publishes anything.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getPlatformProxy } from 'wrangler'
import type { CmsEnv } from '../server/cms/types.ts'
import { PAGE_IDS } from '../src/content/pageContent.ts'

let proxy: Awaited<ReturnType<typeof getPlatformProxy<CmsEnv>>>
let env: CmsEnv
before(async () => {
  proxy = await getPlatformProxy<CmsEnv>({ configPath: 'wrangler.test.jsonc', persist: false, remoteBindings: false })
  env = proxy.env
  for (const file of ['migrations/0002_studio_cms.sql', 'migrations/0003_studio_rate_limits.sql', 'migrations/0004_comments.sql', 'migrations/0005_mutation_integrity.sql'])
    for (const sql of fs.readFileSync(file, 'utf8').split(/;\s*(?:\r?\n|$)/).map(v => v.trim()).filter(Boolean)) await env.CMS_DB!.prepare(sql).run()
})
after(async () => { await proxy.dispose() })

const seed = async () => {
  const sql = fs.readFileSync('docs/page-content-inventory/seed-page-content.sql', 'utf8')
  const statements = sql.replace(/^--.*\n/gm, '').split(/;\n(?=INSERT|$)/).map(s => s.trim()).filter(Boolean)
  for (const s of statements) await env.CMS_DB!.prepare(s.endsWith(';') ? s.slice(0, -1) : s).run()
}
const rows = async () => (await env.CMS_DB!.prepare("SELECT slug,status,version,title,data_json FROM cms_contents WHERE json_extract(data_json,'$.section')='page' ORDER BY slug").all<{ slug: string; status: string; version: number; title: string; data_json: string }>()).results

test('IMPORT-01 first import creates only drafts with provenance and no published document', async () => {
  await seed()
  const all = await rows()
  assert.deepEqual(all.map(r => r.slug).sort(), [...PAGE_IDS].sort())
  for (const row of all) {
    const data = JSON.parse(row.data_json) as { page: { published: unknown }; provenance: { source: string } }
    assert.equal(row.status, 'draft')
    assert.equal(data.page.published, null)
    assert.equal(data.provenance.source, 'code-default')
  }
})

test('IMPORT-02 a record edited, published or archived in the Studio is never touched by a repeated import', async () => {
  const published = JSON.stringify({ section: 'page', page: { draft: { values: { 'hero.title': 'Sửa trong Studio' }, hidden: [] }, published: { values: { 'hero.title': 'Sửa trong Studio' }, hidden: [] } } })
  await env.CMS_DB!.prepare("UPDATE cms_contents SET status='published', version=4, title='Sửa trong Studio', data_json=?1 WHERE slug='install'").bind(published).run()
  await env.CMS_DB!.prepare("UPDATE cms_contents SET status='archived', version=3 WHERE slug='faq'").run()
  const before = await rows()
  await seed()
  await seed()
  const after = await rows()
  assert.deepEqual(after, before, 'repeated import changed existing records')
  assert.equal(after.length, PAGE_IDS.length, 'no duplicates')
})
