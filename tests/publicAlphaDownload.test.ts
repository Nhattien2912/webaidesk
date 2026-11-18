import test from 'node:test'
import assert from 'node:assert/strict'
import { publicAlphaRelease } from '../src/data/publicAlphaRelease.ts'
import { resolveRoute } from '../src/lib/routes.ts'

test('Public Alpha copy matches the reviewed desktop release without duplicating artifact metadata', () => {
  assert.equal(publicAlphaRelease.version, '0.5.0-beta.2')
  assert.equal(publicAlphaRelease.platform, 'Windows x64')
  assert.equal(publicAlphaRelease.sourceCommit, 'e3595ed7dc32e12ceb9ec76d7664049c3b29800d')
  assert.equal(publicAlphaRelease.metadataCommit, 'e3595ed7dc32e12ceb9ec76d7664049c3b29800d')
  const copy = [...publicAlphaRelease.onboardingSteps, ...publicAlphaRelease.releaseNotes, ...publicAlphaRelease.knownLimitations].join('\n')
  assert.doesNotMatch(copy, /0\.4\.0|0\.4 Beta|\.rar\b|gói RAR/i, 'no 0.4 / RAR copy left')
  assert.match(copy, /AI-Desk-Setup-0\.5\.0-beta\.2\.exe/)
  assert.match(copy, /AI-Desk-Extension-0\.5\.0-beta\.2\.zip/)
  assert.match(copy, /Load unpacked/)
  assert.match(copy, /Repair GPT Bridge/)
  assert.ok(!('downloadUrl' in publicAlphaRelease))
  assert.ok(!('sha256' in publicAlphaRelease))
})

test('/download is a known route without changing unknown-path behavior', () => {
  assert.equal(resolveRoute('/download'), 'download')
  assert.equal(resolveRoute('/download/'), 'download')
  assert.equal(resolveRoute('/downloads'), 'not-found')
})
