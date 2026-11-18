// Staging/production catalog selection of the update feed: production unchanged, staging only on its own host, every
// mismatch refused (503 target_mismatch) instead of serving the other environment's releases.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectReleaseTarget, PRODUCTION_HOSTS, STAGING_HOSTS } from '../server/releaseTarget.ts'
import { handleUpdate } from '../server/updateHandler.ts'
import { RELEASE_RECORDS, STAGING_RELEASE_FILE_ERRORS, STAGING_RELEASE_RECORDS, STAGING_COMPONENT_RECORDS } from '../server/releaseCatalog.ts'

const req = (host: string, file = 'latest.yml') => new Request(`https://${host}/api/updates/beta/${file}`)
const err = async (r: Response) => ((await r.json()) as { error: string }).error
const emptyBucket = { async get() { return null }, async head() { return null } }

test('selectReleaseTarget: production by default; staging only with RELEASE_TARGET=staging on a staging host', () => {
  assert.deepEqual(selectReleaseTarget(undefined, 'webaidesk.pages.dev'), { ok: true, target: 'production' })
  assert.deepEqual(selectReleaseTarget('', 'c9a784d1.webaidesk.pages.dev'), { ok: true, target: 'production' }, 'production previews unchanged')
  assert.deepEqual(selectReleaseTarget('production', 'webaidesk.pages.dev'), { ok: true, target: 'production' })
  assert.deepEqual(selectReleaseTarget('staging', 'webaidesk-staging.pages.dev'), { ok: true, target: 'staging' })
  assert.deepEqual(selectReleaseTarget('STAGING', 'abc123.webaidesk-staging.pages.dev'), { ok: true, target: 'staging' }, 'staging previews')
  assert.equal(selectReleaseTarget('staging', 'webaidesk.pages.dev').ok, false, 'staging catalog never on the production host')
  assert.equal(selectReleaseTarget('staging', 'evil.example').ok, false)
  assert.equal(selectReleaseTarget('staging', 'webaidesk-staging.pages.dev.evil.example').ok, false, 'suffix tricks refused')
  assert.equal(selectReleaseTarget(undefined, 'webaidesk-staging.pages.dev').ok, false, 'staging host without the variable = misconfigured project')
  assert.equal(selectReleaseTarget('qa', 'webaidesk-staging.pages.dev').ok, false)
  assert.ok(!PRODUCTION_HOSTS.some((h) => STAGING_HOSTS.includes(h)))
})

test('shipped staging catalog is valid and separate from production', () => {
  assert.deepEqual([...STAGING_RELEASE_FILE_ERRORS], [])
  assert.ok(STAGING_RELEASE_RECORDS.every((r) => !RELEASE_RECORDS.includes(r)))
  // State-agnostic: the staging catalog is written by the pipeline (QA releases). Whatever it holds must never reuse a
  // production record's installer (different builds, different keys) and every component manifest is a beta-channel one.
  const prodInstallers = new Set(RELEASE_RECORDS.map((r) => r.artifacts.installer.sha512))
  assert.ok(STAGING_RELEASE_RECORDS.every((r) => !prodInstallers.has(r.artifacts.installer.sha512)), 'no production installer in the staging catalog')
  assert.ok(STAGING_COMPONENT_RECORDS.every((c) => c.channel === 'beta'))
})

test('feed route: target mismatch → 503 target_mismatch, never the other catalog', async () => {
  const prodOnStagingVar = await handleUpdate(req('webaidesk.pages.dev'), { RELEASES: emptyBucket, RELEASE_TARGET: 'staging' }, 'beta', 'latest.yml')
  assert.equal(prodOnStagingVar.status, 503)
  assert.equal(await err(prodOnStagingVar), 'target_mismatch')
  const stagingHostNoVar = await handleUpdate(req('webaidesk-staging.pages.dev', 'components.json'), { RELEASES: emptyBucket }, 'beta', 'components.json')
  assert.equal(await err(stagingHostNoVar), 'target_mismatch')
  // correctly configured staging: its OWN catalog (empty → no_release; a QA release → its record, bucket consulted →
  // unavailable with this empty test bucket) — never production's beta.2
  const staging = await handleUpdate(req('webaidesk-staging.pages.dev'), { RELEASES: emptyBucket, RELEASE_TARGET: 'staging' }, 'beta', 'latest.yml')
  assert.equal(await err(staging), STAGING_RELEASE_RECORDS.some((r) => r.channel === 'beta' && r.status === 'published') ? 'release_unavailable' : 'no_release')
  // production host, variable unset: production catalog exactly as before (record found → bucket consulted → unavailable here)
  const prod = await handleUpdate(req('webaidesk.pages.dev'), { RELEASES: emptyBucket }, 'beta', 'latest.yml')
  assert.equal(await err(prod), RELEASE_RECORDS.some((r) => r.channel === 'beta' && r.status === 'published') ? 'release_unavailable' : 'no_release')
  // explicit deps (tests / callers) keep working unchanged
  const explicit = await handleUpdate(req('webaidesk.pages.dev'), { RELEASES: emptyBucket, RELEASE_TARGET: 'staging' }, 'beta', 'latest.yml', { records: [] })
  assert.equal(await err(explicit), 'no_release')
})
