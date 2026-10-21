// Safe YouTube embeds in CMS Markdown: only a bare YouTube URL alone on a line becomes a nocookie player with a validated 11-char id.
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type ViteDevServer } from 'vite'
import { youtubeFromUrl } from '../src/lib/markdownVideo.ts'

let vite: ViteDevServer
let react: { createElement: (type: unknown, props?: unknown, ...children: unknown[]) => unknown }
let render: (element: unknown) => string
before(async () => {
  vite = await createServer({ configFile: 'vite.config.ts', logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null } })
  react = (await import('react')) as unknown as typeof react
  render = ((await import('react-dom/server')) as unknown as { renderToStaticMarkup: typeof render }).renderToStaticMarkup
})
after(async () => { await vite.close() })
const md = async (text: string) => render(react.createElement(((await vite.ssrLoadModule('/src/components/MarkdownBody.tsx')) as Record<string, unknown>).MarkdownBody, null, text))

test('VIDEO-01 a bare Shorts URL on its own line becomes a vertical nocookie player with a fallback link', async () => {
  const html = await md('Giới thiệu.\n\nhttps://www.youtube.com/shorts/SiR8dIOJiiI\n\nHết.')
  assert.match(html, /<iframe[^>]+src="https:\/\/www\.youtube-nocookie\.com\/embed\/SiR8dIOJiiI"/)
  assert.match(html, /md-video-vertical/)
  assert.match(html, /href="https:\/\/www\.youtube\.com\/shorts\/SiR8dIOJiiI"/)
  assert.equal((html.match(/<iframe/g) ?? []).length, 1)
  assert.match(html, /sandbox="[^"]*allow-scripts/)
})

test('VIDEO-02 watch and youtu.be URLs embed at 16:9', async () => {
  for (const url of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ']) {
    const html = await md(url)
    assert.match(html, /embed\/dQw4w9WgXcQ"/, url)
    assert.match(html, /md-video-wide/, url)
  }
})

test('VIDEO-03 anything that is not a strictly valid YouTube URL stays an ordinary link or text', async () => {
  const bad = [
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ%22onload%3Dx',
    'https://youtube.evil.example/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://user:pw@www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/SiR8dIOJiiI/extra',
    'https://vimeo.com/123456789',
  ]
  for (const url of bad) assert.ok(!(await md(url)).includes('<iframe'), url)
})

test('VIDEO-04 a link with custom text, a URL inside a sentence, raw HTML iframes and javascript: never embed', async () => {
  assert.ok(!(await md('[xem video](https://www.youtube.com/shorts/SiR8dIOJiiI)')).includes('<iframe'))
  assert.ok(!(await md('Xem https://www.youtube.com/shorts/SiR8dIOJiiI nhé')).includes('<iframe'))
  const html = await md('<iframe src="https://evil.example/x"></iframe>\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))')
  assert.ok(!html.includes('<iframe') && !html.includes('<script') && !html.includes('javascript:'))
})

test('VIDEO-05 youtubeFromUrl normalises ids and rejects unsafe input', () => {
  assert.equal(youtubeFromUrl('https://www.youtube.com/shorts/SiR8dIOJiiI')?.embedUrl, 'https://www.youtube-nocookie.com/embed/SiR8dIOJiiI')
  assert.equal(youtubeFromUrl('https://www.youtube.com/shorts/SiR8dIOJiiI')?.vertical, true)
  for (const v of ['', 'not a url', 'javascript:alert(1)', 'https://www.youtube.com/', 'https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ']) assert.equal(youtubeFromUrl(v), null, v)
})
