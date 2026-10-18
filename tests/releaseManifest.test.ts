import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatBytes,
  formatReleaseFileSize,
  formatReleaseVersion,
  loadDownloadState,
  validateReleaseManifest,
} from '../src/lib/releaseManifest.ts'

const policy = { allowedHosts: ['downloads.example.com'], allowUnsigned: false }

function manifest(overrides: Record<string, unknown> = {}, file: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    channel: 'public-beta',
    status: 'published',
    approved: true,
    version: '0.1.0-beta.1',
    releasedAt: '2026-11-01',
    minOs: 'Windows 10/11 64-bit',
    files: [
      {
        kind: 'installer',
        fileName: 'AI-Desk-Setup-0.1.0-beta.1.exe',
        url: 'https://downloads.example.com/AI-Desk-Setup-0.1.0-beta.1.exe',
        sizeBytes: 120_000_000,
        sha256: 'a'.repeat(64),
        signature: 'signed',
        ...file,
      },
    ],
    ...overrides,
  }
}

test('accepts a complete, approved, signed manifest', () => {
  const r = validateReleaseManifest(manifest(), policy)
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.primary.fileName, 'AI-Desk-Setup-0.1.0-beta.1.exe')
    assert.equal(r.manifest.version, '0.1.0-beta.1')
  }
})

test('accepts a signed approved RAR as the primary and formats its verified metadata', () => {
  const raw = manifest(
    { version: '0.2.0-beta' },
    {
      kind: 'archive',
      fileName: 'AI-Desk-0.2-Beta.rar',
      url: 'https://downloads.example.com/AI-Desk-0.2-Beta.rar',
      sizeBytes: 120_193_516,
    },
  )
  const result = validateReleaseManifest(raw, policy)
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.primary.kind, 'archive')
    assert.equal(formatReleaseFileSize(result.primary), '120.19 MB')
    assert.equal(formatReleaseVersion(result.manifest.version, result.primary.kind), '0.2 Beta')
  }
})

const rejects: Array<[string, unknown]> = [
  ['non-object', 'nope'],
  ['wrong schema', manifest({ schemaVersion: 2 })],
  ['unpublished', manifest({ status: 'unpublished' })],
  ['not approved', manifest({ approved: false })],
  ['approved as string', manifest({ approved: 'true' })],
  ['bad version', manifest({ version: 'latest' })],
  ['bad date', manifest({ releasedAt: 'soon' })],
  ['no files', manifest({ files: [] })],
  ['http url', manifest({}, { url: 'http://downloads.example.com/a.exe' })],
  ['foreign host', manifest({}, { url: 'https://evil.example.net/a.exe' })],
  ['credentials in url', manifest({}, { url: 'https://u:p@downloads.example.com/a.exe' })],
  ['short sha', manifest({}, { sha256: 'abc' })],
  ['non-hex sha', manifest({}, { sha256: 'z'.repeat(64) })],
  ['zero size', manifest({}, { sizeBytes: 0 })],
  ['fractional size', manifest({}, { sizeBytes: 1.5 })],
  ['not exe', manifest({}, { fileName: 'setup.zip' })],
  ['archive with exe name', manifest({}, { kind: 'archive' })],
  ['installer with rar name', manifest({}, { fileName: 'setup.rar' })],
  ['path in name', manifest({}, { fileName: '../setup.exe' })],
  ['unsigned', manifest({}, { signature: 'unsigned' })],
  ['portable only', manifest({}, { kind: 'portable' })],
  ['bad commit', manifest({ commit: 'not-a-sha' })],
  ['http notes', manifest({ notesUrl: 'http://x.example.com' })],
]

for (const [name, raw] of rejects) {
  test(`rejects manifest: ${name}`, () => {
    assert.equal(validateReleaseManifest(raw, policy).ok, false)
  })
}

test('empty allowed host list blocks every file', () => {
  assert.equal(validateReleaseManifest(manifest(), { allowedHosts: [], allowUnsigned: false }).ok, false)
})

test('unsigned is accepted only when explicitly allowed', () => {
  const r = validateReleaseManifest(manifest({}, { signature: 'unsigned' }), { ...policy, allowUnsigned: true })
  assert.equal(r.ok, true)
})

function fakeFetch(status: number, body: string, type = 'application/json'): typeof fetch {
  return (async () => new Response(body, { status, headers: { 'content-type': type } })) as typeof fetch
}

test('loadDownloadState fails closed on 404, HTML fallback, bad JSON and network errors', async () => {
  assert.equal((await loadDownloadState('/releases/latest.json', policy, fakeFetch(404, ''))).kind, 'unavailable')
  assert.equal(
    (await loadDownloadState('/releases/latest.json', policy, fakeFetch(200, '<!doctype html>', 'text/html'))).kind,
    'unavailable',
  )
  assert.equal((await loadDownloadState('/releases/latest.json', policy, fakeFetch(200, '{bad'))).kind, 'unavailable')
  const throwing = (async () => {
    throw new Error('offline')
  }) as typeof fetch
  assert.equal((await loadDownloadState('/releases/latest.json', policy, throwing)).kind, 'unavailable')
  assert.equal((await loadDownloadState('', policy, fakeFetch(200, '{}'))).kind, 'unavailable')
})

test('loadDownloadState returns available for a valid manifest', async () => {
  const state = await loadDownloadState('/m.json', policy, fakeFetch(200, JSON.stringify(manifest())))
  assert.equal(state.kind, 'available')
})

test('formatBytes', () => {
  assert.equal(formatBytes(120_174_518), '114.6 MB')
  assert.equal(formatBytes(2048), '2 KB')
})
