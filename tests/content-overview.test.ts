import assert from 'node:assert/strict'
import test from 'node:test'
import type { StudioItem } from '../src/data/studioFixtures.ts'
import { PAGE_IDS } from '../src/content/pageContent.ts'
import { buildOverview, filterOverview, summarize } from '../src/lib/contentOverview.ts'

const item = (partial: Partial<StudioItem> & Pick<StudioItem, 'id' | 'type' | 'title' | 'status'>): StudioItem => ({
  category: '',
  updatedAt: '',
  tags: [],
  ...partial,
})

test('overview reconciles CMS records with code defaults without duplicating page rows', () => {
  const rows = buildOverview([
    item({ id: 'article-ads', type: 'article', slug: 'ads', title: 'ads', status: 'published', updatedAtMs: 30 }),
    item({ id: 'page-install', type: 'page', slug: 'install', title: 'Cài đặt', status: 'draft', updatedAtMs: 20, data: { section: 'page', page: { draft: {}, published: null } } }),
    item({ id: 'page-prompts', type: 'page', slug: 'prompts', title: 'Prompt', status: 'published', updatedAtMs: 10, data: { section: 'page', page: { draft: {}, published: {} } } }),
  ])

  assert.equal(rows.filter((row) => row.type === 'page').length, PAGE_IDS.length)
  assert.equal(rows.filter((row) => row.key === 'page:install').length, 1)
  assert.equal(rows.find((row) => row.key === 'page:install')?.status, 'draft')
  assert.equal(rows.find((row) => row.key === 'page:install')?.liveFrom, 'code')
  assert.equal(rows.find((row) => row.key === 'page:prompts')?.status, 'published')
  assert.equal(rows.find((row) => row.key === 'page:prompts')?.liveFrom, 'cms')
  assert.equal(rows.find((row) => row.key === 'page:faq')?.canCreateDraft, true)
  assert.equal(rows.find((row) => row.key === 'article:article-ads')?.publicUrl, '/blog/ads')
})

test('overview search is accent-insensitive and archived CMS tests stay hidden by default', () => {
  const rows = buildOverview([
    item({ id: 'guide-1', type: 'guide', slug: 'cai-dat', title: 'Hướng dẫn cài đặt', status: 'published' }),
    item({ id: 'archived-test', type: 'article', slug: 'zz-test', title: 'Archived test', status: 'archived' }),
  ])

  const visible = filterOverview(rows, { query: 'huong dan cai dat', type: 'all', source: 'all', status: 'all', area: 'all', showArchived: false })
  assert.equal(visible.some((row) => row.key === 'guide:guide-1'), true)
  assert.equal(filterOverview(rows, { query: '', type: 'all', source: 'all', status: 'all', area: 'all', showArchived: false }).some((row) => row.key === 'article:archived-test'), false)
  assert.equal(filterOverview(rows, { query: '', type: 'all', source: 'all', status: 'archived', area: 'all', showArchived: false }).some((row) => row.key === 'article:archived-test'), true)
})

test('overview summary separates live CMS content from code fallbacks', () => {
  const rows = buildOverview([
    item({ id: 'article-ads', type: 'article', slug: 'ads', title: 'ads', status: 'published' }),
  ])
  const summary = summarize(rows)
  assert.equal(summary.liveCms, 1)
  assert.equal(summary.liveCode, PAGE_IDS.length)
  assert.equal(summary.default, PAGE_IDS.length)
})
