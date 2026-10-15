import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveRoute } from '../src/lib/routes.ts'
import { toYouTubeEmbedUrl } from '../src/lib/video.ts'
import { usableUrl } from '../src/lib/social.ts'
import { roadmap } from '../src/data/roadmap.ts'

test('resolveRoute', () => {
  assert.equal(resolveRoute('/'), 'home')
  assert.equal(resolveRoute('/privacy'), 'privacy')
  assert.equal(resolveRoute('/privacy/'), 'privacy')
  assert.equal(resolveRoute('/Terms'), 'terms')
  assert.equal(resolveRoute('/changelog'), 'changelog')
  assert.equal(resolveRoute('/pricing'), 'not-found')
})

test('toYouTubeEmbedUrl only accepts real YouTube video URLs', () => {
  assert.equal(toYouTubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  assert.equal(toYouTubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  for (const bad of ['', 'not a url', 'http://youtu.be/dQw4w9WgXcQ', 'https://evil.example/watch?v=dQw4w9WgXcQ', 'https://youtube.com/watch?v=<x>']) {
    assert.equal(toYouTubeEmbedUrl(bad), null, bad)
  }
})

test('usableUrl only accepts https links', () => {
  assert.equal(usableUrl(''), null)
  assert.equal(usableUrl('javascript:alert(1)'), null)
  assert.equal(usableUrl('http://example.com'), null)
  assert.equal(usableUrl('https://example.com/x'), 'https://example.com/x')
})

test('roadmap never claims a public release and keeps unverified work out of "released"', () => {
  const released = roadmap.find((c) => c.stage === 'released')
  assert.ok(released)
  assert.match(released.note, /Private Alpha/)
  const releasedTitles = released.items.map((i) => i.title).join(' | ')
  for (const notLive of ['Result Store', 'Antigravity', 'OpenCode', 'song song', 'Pro', 'Public Beta']) {
    assert.ok(!releasedTitles.includes(notLive), `${notLive} must not be listed as released`)
  }
})

test('official social URLs are the owner-provided channels and env overrides only when non-empty', async () => {
  const { OFFICIAL_SOCIAL_URLS, socialUrl } = await import('../src/lib/social.ts')
  assert.equal(OFFICIAL_SOCIAL_URLS.youtube, 'https://www.youtube.com/@NhattienIT')
  assert.equal(OFFICIAL_SOCIAL_URLS.facebook, 'https://www.facebook.com/profile.php?id=61595065515012')
  assert.equal(usableUrl(OFFICIAL_SOCIAL_URLS.youtube), OFFICIAL_SOCIAL_URLS.youtube)
  assert.equal(usableUrl(OFFICIAL_SOCIAL_URLS.facebook), OFFICIAL_SOCIAL_URLS.facebook)
  assert.equal(socialUrl(undefined, OFFICIAL_SOCIAL_URLS.youtube), OFFICIAL_SOCIAL_URLS.youtube)
  assert.equal(socialUrl('', OFFICIAL_SOCIAL_URLS.youtube), OFFICIAL_SOCIAL_URLS.youtube)
  assert.equal(socialUrl('   ', OFFICIAL_SOCIAL_URLS.facebook), OFFICIAL_SOCIAL_URLS.facebook)
  assert.equal(socialUrl('https://example.com/x', OFFICIAL_SOCIAL_URLS.youtube), 'https://example.com/x')
})

test('brand favicons and logo assets exist with the expected formats and sizes', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const root = path.resolve(import.meta.dirname, '..')
  const read = (p: string) => fs.readFileSync(path.join(root, p))
  const png = (p: string) => {
    const b = read(p)
    assert.equal(b.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', p)
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] }
  }
  for (const [file, size] of [
    ['public/favicon-16x16.png', 16],
    ['public/favicon-32x32.png', 32],
    ['public/favicon-48x48.png', 48],
    ['public/icon-192.png', 192],
    ['public/icon-512.png', 512],
  ] as const) {
    const info = png(file)
    assert.deepEqual([info.w, info.h, info.colorType], [size, size, 6], file)
  }
  const apple = png('public/apple-touch-icon.png')
  assert.deepEqual([apple.w, apple.h, apple.colorType], [180, 180, 2], 'apple-touch-icon is opaque RGB 180')
  const ico = read('public/favicon.ico')
  assert.equal(ico.readUInt16LE(2), 1)
  const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + i * 16] || 256).sort((a, b) => a - b)
  assert.deepEqual(sizes, [16, 32, 48])
  const lockup = png('src/assets/brand/aidesk-lockup.png')
  assert.equal(lockup.h, 96)
  assert.equal(lockup.colorType, 6)
  assert.ok(read('brand/aidesk-logo-source.jpg').subarray(0, 2).equals(Buffer.from([0xff, 0xd8])))
  const html = read('index.html').toString('utf8')
  for (const href of ['/favicon.ico', '/favicon-32x32.png', '/favicon-16x16.png', '/icon-192.png', '/apple-touch-icon.png']) {
    assert.ok(html.includes(`href="${href}"`), `index.html links ${href}`)
  }
  assert.ok(!html.includes('data:image/svg+xml'), 'old inline SVG favicon removed')
})
