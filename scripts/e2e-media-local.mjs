// Local-only R2/D1 media E2E against `npm run cms:dev` (default http://127.0.0.1:8787). Never run against a remote host.
import { deflateSync } from 'node:zlib'

const base = process.argv[2] ?? 'http://127.0.0.1:8787'
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) throw new Error('refusing to run against a non-local host')

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (bytes) => { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type), data]); const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc(body), 8 + data.length); return out }
const png = (w, h) => {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0x55)])
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(Array.from({ length: h }, () => row)))), chunk('IEND', Buffer.alloc(0))])
}

const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`) }

const session = await (await fetch(`${base}/api/admin/session`)).json()
const csrf = session.data.csrfToken
const upload = (body, type, extra = {}) => fetch(`${base}/api/admin/media`, { method: 'POST', headers: { origin: base, 'content-type': type, 'x-alt-text': encodeURIComponent('Ảnh kiểm thử Unicode'), ...extra }, body })

const good = png(64, 32)
let r = await upload(good, 'image/png')
check('upload without CSRF token is rejected', r.status === 403 || r.status === 401, `status ${r.status}`)

r = await upload(good, 'image/png', { 'x-csrf-token': csrf })
const created = r.status === 201 || r.status === 200 ? (await r.json()).data : null
check('valid PNG is stored (201)', Boolean(created), `status ${r.status}`)
if (created) {
  check('response carries dimensions and mime', created.width === 64 && created.height === 32 && created.mime === 'image/png')
  check('object id is a UUID, not user-controlled', /^[0-9a-f-]{36}$/.test(created.id))
  const served = await fetch(`${base}${created.url}`)
  const bytes = Buffer.from(await served.arrayBuffer())
  check('stored object is served back byte-identical', served.status === 200 && bytes.equals(good))
  check('served with image/png + nosniff', served.headers.get('content-type') === 'image/png' && served.headers.get('x-content-type-options') === 'nosniff')
  const listed = (await (await fetch(`${base}/api/admin/media`)).json()).data
  check('listed in inventory with Unicode alt text', listed.some((m) => m.id === created.id && m.altText === 'Ảnh kiểm thử Unicode'))
}

r = await upload(Buffer.from('<?php echo 1; ?>'), 'image/png', { 'x-csrf-token': csrf })
check('text payload declared as image/png is rejected (signature check)', r.status === 400 || r.status === 415, `status ${r.status}`)
r = await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'image/svg+xml', { 'x-csrf-token': csrf })
check('SVG is rejected', r.status === 400 || r.status === 415, `status ${r.status}`)
r = await upload(Buffer.concat([good, Buffer.from('trailing')]), 'image/png', { 'x-csrf-token': csrf })
check('PNG with trailing bytes is rejected', r.status === 400 || r.status === 415, `status ${r.status}`)
r = await upload(Buffer.alloc(6 * 1024 * 1024, 1), 'image/png', { 'x-csrf-token': csrf })
check('over-size upload (6 MB) is rejected', r.status === 413 || r.status === 400, `status ${r.status}`)
r = await upload(good, 'image/png', { 'x-csrf-token': csrf, origin: 'https://evil.example' })
check('cross-origin upload is rejected', r.status === 403, `status ${r.status}`)

const failed = results.filter((x) => !x.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
