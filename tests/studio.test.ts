import test from 'node:test'
import assert from 'node:assert/strict'
import { canTransition, isAdminPath, parseYouTubeId, slugify } from '../src/lib/studio.ts'
import { resolveRoute } from '../src/lib/routes.ts'

test('parses supported YouTube URLs and rejects untrusted hosts', () => {
  const id = 'dQw4w9WgXcQ'
  assert.equal(parseYouTubeId(`https://www.youtube.com/watch?v=${id}`), id)
  assert.equal(parseYouTubeId(`https://youtu.be/${id}?t=2`), id)
  assert.equal(parseYouTubeId(`https://youtube.com/shorts/${id}`), id)
  assert.equal(parseYouTubeId(`https://youtube.com/embed/${id}`), id)
  assert.equal(parseYouTubeId(`https://example.com/watch?v=${id}`), null)
  assert.equal(parseYouTubeId('not-a-url'), null)
})

test('creates stable Vietnamese article slugs', () => {
  assert.equal(slugify('Thiết kế Quy Trình Đa AI!'), 'thiet-ke-quy-trinh-da-ai')
})

test('allows editorial transitions but not archived to published directly', () => {
  assert.equal(canTransition('draft', 'published'), true)
  assert.equal(canTransition('published', 'archived'), true)
  assert.equal(canTransition('archived', 'published'), false)
})

test('routes public content and recognizes isolated admin paths', () => {
  assert.equal(resolveRoute('/blog'), 'blog')
  assert.equal(resolveRoute('/blog/hello'), 'blog-detail')
  assert.equal(resolveRoute('/apps'), 'apps')
  assert.equal(resolveRoute('/apps/ai-desk'), 'app-detail')
  assert.equal(resolveRoute('/admin/videos/new'), 'not-found')
  assert.equal(isAdminPath('/admin/settings'), true)
  assert.equal(isAdminPath('/administrator'), false)
})
