import test from 'node:test'
import assert from 'node:assert/strict'
import { onRequest as latestRelease } from '../functions/api/releases/latest.ts'
import { onRequest as downloadFile } from '../functions/api/download/[name].ts'

const ORIGIN = 'https://webaidesk.pages.dev'

test('Pages /api/releases/latest wrapper treats the shipped empty catalog as normal no_release', async () => {
  const response = await latestRelease({ request: new Request(`${ORIGIN}/api/releases/latest`), env: {} })
  assert.equal(response.status, 404)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { ok: false, error: 'no_release' })
})

test('Pages /api/download/[name] wrapper stays closed without a reviewed release record', async () => {
  const response = await downloadFile({
    request: new Request(`${ORIGIN}/api/download/AI-Desk-Setup-0.2.0.exe`),
    env: {},
    params: { name: 'AI-Desk-Setup-0.2.0.exe' },
  })
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { ok: false, error: 'not_found' })
})

test('Pages release wrappers preserve method and filename validation', async () => {
  const method = await latestRelease({ request: new Request(`${ORIGIN}/api/releases/latest`, { method: 'POST' }), env: {} })
  assert.equal(method.status, 405)
  assert.equal(method.headers.get('allow'), 'GET, HEAD')

  const filename = await downloadFile({
    request: new Request(`${ORIGIN}/api/download/..%2Funsafe.exe`),
    env: {},
    params: { name: '../unsafe.exe' },
  })
  assert.equal(filename.status, 400)
  assert.deepEqual(await filename.json(), { ok: false, error: 'invalid_filename' })
})
