import test from 'node:test'
import assert from 'node:assert/strict'
import { publicAlphaRelease } from '../src/data/publicAlphaRelease.ts'
import { resolveRoute } from '../src/lib/routes.ts'

test('Public Alpha copy matches the reviewed desktop release without duplicating artifact metadata', () => {
  assert.equal(publicAlphaRelease.version, '0.3.0')
  assert.equal(publicAlphaRelease.platform, 'Windows x64')
  assert.equal(publicAlphaRelease.sourceCommit, 'cef17b1cadf91eef9c60c8505ad7165eb8c02ff2')
  assert.equal(publicAlphaRelease.metadataCommit, '39a0b38f151b919f2e40ec04a157830ea5a8a716')
  assert.ok(!('downloadUrl' in publicAlphaRelease))
  assert.ok(!('sha256' in publicAlphaRelease))
})

test('/download is a known route without changing unknown-path behavior', () => {
  assert.equal(resolveRoute('/download'), 'download')
  assert.equal(resolveRoute('/download/'), 'download')
  assert.equal(resolveRoute('/downloads'), 'not-found')
})
