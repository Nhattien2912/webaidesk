import test from 'node:test'
import assert from 'node:assert/strict'
import { publicAlphaRelease, publicDownloadIsOpen, type PublicAlphaRelease } from '../src/data/publicAlphaRelease.ts'
import { resolveRoute } from '../src/lib/routes.ts'

test('Public Alpha metadata matches the reviewed desktop release and remains closed', () => {
  assert.equal(publicAlphaRelease.version, '0.2.0')
  assert.equal(publicAlphaRelease.platform, 'Windows x64')
  assert.equal(publicAlphaRelease.sourceCommit, 'cef17b1cadf91eef9c60c8505ad7165eb8c02ff2')
  assert.equal(publicAlphaRelease.availability, 'coming-soon')
  assert.equal(publicAlphaRelease.approved, false)
  assert.equal(publicAlphaRelease.signed, false)
  assert.equal(publicAlphaRelease.downloadUrl, null)
  assert.equal(publicAlphaRelease.sha256, null)
  assert.equal(publicAlphaRelease.metadataCommit, '39a0b38f151b919f2e40ec04a157830ea5a8a716')
  assert.equal(publicDownloadIsOpen(publicAlphaRelease), false)
})

test('download gate requires every release signal and rejects incomplete metadata', () => {
  const candidate: PublicAlphaRelease = {
    ...publicAlphaRelease,
    availability: 'available',
    approved: true,
    signed: true,
    downloadUrl: 'https://webaidesk.pages.dev/api/download/test-artifact.exe',
    sha256: 'a'.repeat(64),
  }
  assert.equal(publicDownloadIsOpen(candidate), true)
  assert.equal(publicDownloadIsOpen({ ...candidate, approved: false }), false)
  assert.equal(publicDownloadIsOpen({ ...candidate, signed: false }), false)
  assert.equal(publicDownloadIsOpen({ ...candidate, downloadUrl: 'http://example.com/a.exe' }), false)
  assert.equal(publicDownloadIsOpen({ ...candidate, downloadUrl: 'https://example.com/a.exe' }), false)
  assert.equal(publicDownloadIsOpen({ ...candidate, sha256: 'not-a-checksum' }), false)
})

test('/download is a known route without changing unknown-path behavior', () => {
  assert.equal(resolveRoute('/download'), 'download')
  assert.equal(resolveRoute('/download/'), 'download')
  assert.equal(resolveRoute('/downloads'), 'not-found')
})
