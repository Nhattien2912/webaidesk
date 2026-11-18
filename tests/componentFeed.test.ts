import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkComponents, componentsKey, currentComponents, extensionKey, findExtensionPackage, type ComponentRecord } from '../server/componentRecords.ts'
import { handleUpdate } from '../server/updateHandler.ts'
import { onRequest as publicUpdateRoute } from '../functions-public/api/updates/[channel]/[file].ts'
import { COMPONENT_RECORDS, RELEASE_FILE_ERRORS } from '../server/releaseCatalog.ts'
import { RELEASE_DATA } from '../server/releaseData.ts'
import type { R2BucketLike, R2ObjectLike } from '../server/downloadHandler.ts'
import { immutableKey, type ReleaseRecord } from '../server/releaseRecords.ts'
// @ts-expect-error plain ESM script without type declarations
import { applyComponentTransition, buildPayload, componentRecord, desktopEntry, extensionEntry, signPayload, verifyEnvelope } from '../scripts/release-components.mjs'

const sha256 = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex')
const enc = (s: string) => new TextEncoder().encode(s)
const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const SPKI = publicKey.export({ type: 'spki', format: 'der' }).toString('base64')

function pkgBytes(version: string): Uint8Array {
  return enc(JSON.stringify({ format: 'aidesk-extension-package-v1', version, bridgeProtocol: 1, capabilities: ['bridge-ack-v1', 'self-reload-v1'], files: { 'background.js': `bg ${version}`, 'content.js': `cs ${version}` } }))
}

function fixture(sequence: number, version: string, over: Partial<ComponentRecord> = {}, channel = 'stable') {
  const pkg = pkgBytes(version)
  const fileName = `AI-Desk-GPT-Bridge-${version}.aidext.json`
  const manifest = enc(signPayload(buildPayload({ channel, sequence, extension: { version, fileName, sha256: sha256(pkg), sizeBytes: pkg.length, bridgeProtocol: 1, minDesktop: '0.5.0', capabilities: ['bridge-ack-v1', 'self-reload-v1'] } }), privateKey, 'k1'))
  const record: ComponentRecord = {
    channel, sequence, status: 'published', approved: true,
    manifest: { fileName: 'components.json', r2Key: componentsKey(channel, sequence), sizeBytes: manifest.length, sha256: sha256(manifest) },
    extensionPackages: [{ version, fileName, r2Key: extensionKey(channel, version, fileName), sizeBytes: pkg.length, sha256: sha256(pkg) }],
    ...over,
  }
  return { record, manifest, pkg }
}

function bucket(items: { key: string; bytes: Uint8Array; sha?: string }[]) {
  const objects = new Map(items.map((i) => [i.key, i]))
  const info = (key: string, o: { bytes: Uint8Array; sha?: string }): R2ObjectLike => ({ key, size: o.bytes.length, httpEtag: `"${sha256(o.bytes).slice(0, 8)}"`, uploaded: new Date('2026-11-01T10:00:00Z'), customMetadata: { sha256: o.sha ?? sha256(o.bytes) } })
  const calls: string[] = []
  const b: R2BucketLike = {
    async head(key) {
      calls.push(`head ${key}`)
      const o = objects.get(key)
      return o ? info(key, o) : null
    },
    async get(key) {
      calls.push(`get ${key}`)
      const o = objects.get(key)
      return o ? { ...info(key, o), body: new ReadableStream({ start: (c) => (c.enqueue(o.bytes), c.close()) }) } : null
    },
  }
  return { b, calls }
}
const get = (records: ComponentRecord[], b: R2BucketLike, file: string, channel = 'stable', method = 'GET') =>
  handleUpdate(new Request(`https://webaidesk.pages.dev/api/updates/${channel}/${file}`, { method }), { RELEASES: b }, channel, file, { records: [], components: records })
const err = async (r: Response) => ((await r.json()) as { error: string }).error

// State-agnostic: server/releaseData.ts is rewritten by the release pipeline on every PUBLISH (a new beta sequence per
// release), so these tests assert the invariants of whatever it holds — never one fixed snapshot.
test('shipped releaseData: component manifests valid, nothing dropped, beta-only, sequences 1..N with no gap/duplicate', () => {
  assert.deepEqual(RELEASE_FILE_ERRORS, [])
  const raw = (RELEASE_DATA as { components?: unknown[] }).components ?? []
  assert.equal(COMPONENT_RECORDS.length, raw.length, 'no shipped record silently dropped by validation or de-duplication')
  assert.ok(COMPONENT_RECORDS.some((r) => r.sequence === 1 && r.status === 'published'), 'the first production manifest (beta/1) stays in the catalog (records are never deleted)')
  assert.ok(COMPONENT_RECORDS.every((r) => r.channel === 'beta'), 'the pipeline releases the beta channel only — no stable manifest')
  for (const r of COMPONENT_RECORDS) assert.equal(r.manifest.r2Key, componentsKey(r.channel, r.sequence), `beta/${r.sequence}: immutable per-sequence key`)
  const seqs = COMPONENT_RECORDS.map((r) => r.sequence).sort((a, b) => a - b)
  assert.deepEqual(seqs, seqs.map((_, i) => i + 1), 'sequences are exactly 1..N (pipeline assigns max+1; no gap, no duplicate)')
})

test('shipped releaseData: components.json = highest published+approved sequence; unpublished/higher/conflicting records are never selected', async () => {
  const servable = COMPONENT_RECORDS.filter((r) => r.channel === 'beta' && r.status === 'published' && r.approved)
  const top = Math.max(...servable.map((r) => r.sequence))
  assert.equal(currentComponents(COMPONENT_RECORDS, 'beta')?.sequence, top, 'feed picks the highest published+approved sequence')
  assert.equal(currentComponents(COMPONENT_RECORDS, 'stable'), null)
  // adversarial records layered on the REAL shipped data: none of them may become current
  const extra = (sequence: number, over: Partial<ComponentRecord>) => fixture(sequence, `9.${sequence}.0`, over, 'beta').record
  const staged = extra(top + 1, { status: 'staged', approved: false })
  const withdrawn = extra(top + 2, { status: 'withdrawn', approved: true })
  const unapproved = extra(top + 3, { status: 'staged', approved: true })
  const withRogue = checkComponents([...COMPONENT_RECORDS, staged, withdrawn, unapproved])
  assert.deepEqual(withRogue.errors, [])
  assert.equal(currentComponents(withRogue.valid, 'beta')?.sequence, top, 'staged / withdrawn / not-yet-published sequences are never served')
  assert.ok(checkComponents([...COMPONENT_RECORDS, extra(top + 4, { status: 'published', approved: false })]).errors.length > 0, 'published-without-approval is invalid')
  // a second record claiming the current sequence with different bytes knocks BOTH out (fail closed, never the forged one)
  const forged = extra(top, {})
  const conflict = checkComponents([...COMPONENT_RECORDS, forged])
  assert.ok(conflict.errors.some((e) => e.includes(`beta/${top}`)))
  assert.ok(!conflict.valid.some((r) => r.sequence === top), 'conflicting current sequence dropped entirely')
  // the served bytes must still match the record: tampered R2 content for the real current manifest fails closed
  const cur = currentComponents(COMPONENT_RECORDS, 'beta')!
  const { b } = bucket([{ key: cur.manifest.r2Key, bytes: enc('{"tampered":true}'), sha: cur.manifest.sha256 }])
  const res = await get([...COMPONENT_RECORDS], b, 'components.json', 'beta')
  assert.equal(await err(res), 'integrity_mismatch', 'bytes that do not match the shipped record are never served')
})

test('components.json: current = highest published+approved sequence, served verbatim, no-cache; signature verifies', async () => {
  const a = fixture(3, '0.5.1')
  const c = fixture(4, '0.5.2')
  const staged = fixture(5, '0.5.3', { status: 'staged', approved: false })
  const { b } = bucket([a, c, staged].flatMap((f) => [{ key: f.record.manifest.r2Key, bytes: f.manifest }, { key: f.record.extensionPackages[0].r2Key, bytes: f.pkg }]))
  const res = await get([a.record, c.record, staged.record], b, 'components.json')
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('cache-control'), 'no-cache')
  assert.equal(res.headers.get('x-aidesk-components'), 'stable/4')
  const text = await res.text()
  assert.equal(text, new TextDecoder().decode(c.manifest))
  assert.equal(verifyEnvelope(text, 'k1', SPKI).sequence, 4)
  assert.throws(() => verifyEnvelope(text, 'k1', generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' }).toString('base64')), /signature invalid/)
  // extension packages of published records only
  assert.equal((await get([a.record, c.record, staged.record], b, 'AI-Desk-GPT-Bridge-0.5.2.aidext.json')).status, 200)
  assert.equal((await get([a.record, c.record, staged.record], b, 'AI-Desk-GPT-Bridge-0.5.1.aidext.json')).status, 200, 'older package still served')
  assert.equal(await err(await get([a.record, c.record, staged.record], b, 'AI-Desk-GPT-Bridge-0.5.3.aidext.json')), 'not_found', 'staged never served')
  // withdrawn manifest → previous becomes current
  const res2 = await get([a.record, { ...c.record, status: 'withdrawn' }], b, 'components.json')
  assert.equal(res2.headers.get('x-aidesk-components'), 'stable/3')
})

test('fail closed: tampered R2 bytes, missing object, no release, wrong channel, beta separate', async () => {
  const f = fixture(1, '0.5.1')
  const tampered = enc(new TextDecoder().decode(f.manifest).replace('k1', 'k2'))
  const { b } = bucket([{ key: f.record.manifest.r2Key, bytes: tampered, sha: f.record.manifest.sha256 }, { key: f.record.extensionPackages[0].r2Key, bytes: enc('x'.repeat(f.pkg.length)) }])
  assert.equal(await err(await get([f.record], b, 'components.json')), 'integrity_mismatch')
  // Streamed packages are checked against the R2 sha256 metadata written at upload (bytes are re-hashed by AI Desk).
  assert.equal(await err(await get([f.record], b, 'AI-Desk-GPT-Bridge-0.5.1.aidext.json')), 'integrity_mismatch')
  assert.equal(await err(await get([f.record], bucket([]).b, 'components.json')), 'release_unavailable')
  assert.equal(await err(await get([], bucket([]).b, 'components.json')), 'no_release')
  assert.equal(await err(await get([f.record], b, 'components.json', 'nightly')), 'unknown_channel')
  assert.equal(await err(await get([f.record], b, 'components.json', 'beta')), 'no_release', 'stable manifest never served on beta')
  const beta = fixture(1, '0.6.0-beta.1', {}, 'beta')
  const bb = bucket([{ key: beta.record.manifest.r2Key, bytes: beta.manifest }])
  assert.equal((await get([f.record, beta.record], bb.b, 'components.json', 'beta')).status, 200)
  assert.equal((await get([f.record], b, 'components.json', 'stable', 'POST')).status, 405)
  for (const bad of ['../components.json', 'x.aidext.json.exe', 'a/b.aidext.json']) assert.notEqual((await get([f.record], b, bad)).status, 200, bad)
})

test('record validation: immutable keys, approval, duplicates drop every record involved', () => {
  const f = fixture(2, '0.5.1')
  assert.deepEqual(checkComponents([f.record]).errors, [])
  assert.match(checkComponents([{ ...f.record, approved: false }]).errors.join(), /published without approval/)
  assert.match(checkComponents([{ ...f.record, manifest: { ...f.record.manifest, r2Key: 'releases/stable/components.json' } }]).errors.join(), /r2Key must be/)
  assert.match(checkComponents([{ ...f.record, extensionPackages: [{ ...f.record.extensionPackages[0], r2Key: 'releases/stable/x' }] }]).errors.join(), /r2Key must be/)
  const dup = checkComponents([f.record, { ...f.record }])
  assert.equal(dup.valid.length, 0)
  const g = fixture(3, '0.5.1')
  const conflict = checkComponents([f.record, { ...g.record, extensionPackages: [{ ...g.record.extensionPackages[0], sha256: 'b'.repeat(64) }] }])
  assert.equal(conflict.valid.length, 0, 'same immutable key with different bytes')
  assert.equal(checkComponents([f.record, g.record]).valid.length, 2, 'the same package re-listed by a newer sequence is fine')
  assert.equal(currentComponents([f.record, g.record], 'stable')?.sequence, 3)
  assert.equal(findExtensionPackage([f.record], 'stable', 'AI-Desk-GPT-Bridge-0.5.1.aidext.json')?.version, '0.5.1')
})

test('release-components script: entries, unsigned desktop refused, transitions monotonic', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aidesk-comp-'))
  const p = join(dir, 'AI-Desk-GPT-Bridge-0.5.1.aidext.json')
  writeFileSync(p, pkgBytes('0.5.1'))
  const e = extensionEntry(p, { minDesktop: '0.5.0' })
  assert.equal(e.version, '0.5.1')
  assert.equal(e.sha256, sha256(pkgBytes('0.5.1')))
  writeFileSync(join(dir, 'wrong-name.aidext.json'), pkgBytes('0.5.1'))
  assert.throws(() => extensionEntry(join(dir, 'wrong-name.aidext.json'), { minDesktop: '0.5.0' }), /must be named/)
  const evil = join(dir, 'AI-Desk-GPT-Bridge-0.5.9.aidext.json')
  writeFileSync(evil, JSON.stringify({ format: 'aidesk-extension-package-v1', version: '0.5.9', bridgeProtocol: 1, capabilities: [], files: { 'background.js': 'a', 'content.js': 'b', 'manifest.json': '{}' } }))
  assert.throws(() => extensionEntry(evil, { minDesktop: '0.5.0' }), /exactly background\.js \+ content\.js/)
  // desktop: only a SIGNED release record can be authorized
  const yml = join(dir, 'latest.yml')
  const sha512 = createHash('sha512').update('x').digest('base64')
  writeFileSync(yml, `version: 0.5.0\nfiles:\n  - url: AI-Desk-Setup-0.5.0.exe\n    sha512: ${sha512}\n    size: 10\npath: AI-Desk-Setup-0.5.0.exe\nsha512: ${sha512}\n`)
  assert.throws(() => desktopEntry(yml, { schemaVersion: 1, releases: [] }, 'stable'), /no release record/)
  const fileName = 'AI-Desk-Setup-0.5.0.exe'
  const hex = (c: string) => c.repeat(64)
  const rec = (over: Partial<ReleaseRecord>): ReleaseRecord => ({
    version: '0.5.0', channel: 'stable', releasedAt: '2026-11-01T10:00:00.000Z', minOs: 'Windows 10/11 64-bit', signature: 'unsigned', status: 'staged', approved: false,
    artifacts: {
      installer: { fileName, r2Key: immutableKey('stable', '0.5.0', fileName), sizeBytes: 10, sha256: hex('a'), sha512,
        blockmap: { fileName: `${fileName}.blockmap`, r2Key: immutableKey('stable', '0.5.0', `${fileName}.blockmap`), sizeBytes: 1, sha256: hex('b') } },
      updateMetadata: { fileName: 'latest.yml', r2Key: immutableKey('stable', '0.5.0', 'latest.yml'), sizeBytes: 1, sha256: hex('c') },
    },
    ...over,
  })
  assert.throws(() => desktopEntry(yml, { schemaVersion: 1, releases: [rec({})] }, 'stable'), /unsigned/, 'plain unsigned record never authorized')
  const fo = desktopEntry(yml, { schemaVersion: 1, releases: [rec({ updateTrust: 'feed-only', approved: true })] }, 'stable')
  assert.deepEqual(fo, { version: '0.5.0', installer: { fileName, sha512, sizeBytes: 10 } }, 'feed-only unsigned record is authorized through the signed manifest')
  // transitions
  const f1 = fixture(1, '0.5.1', { status: 'staged', approved: false })
  const file = { schemaVersion: 1, releases: [], components: [f1.record] }
  assert.throws(() => applyComponentTransition(file, 'publish', 1, 'stable'), /approve/)
  const approved = applyComponentTransition(file, 'approve', 1, 'stable')
  const published = applyComponentTransition(approved, 'publish', 1, 'stable')
  assert.equal(published.components[0].status, 'published')
  const f0 = componentRecord({ channel: 'stable', sequence: 1, manifestBytes: Buffer.from('{}'), packages: [] })
  assert.equal(f0.status, 'staged')
  const older = { ...published, components: [...published.components, { ...fixture(0 + 1, '0.5.1').record, sequence: 1, status: 'staged', approved: true }] }
  assert.throws(() => applyComponentTransition(older, 'approve', 1, 'stable'), /only staged|duplicate/)
  assert.throws(() => buildPayload({ channel: 'stable', sequence: 0 }), /positive integer/)
  assert.throws(() => buildPayload({ channel: 'stable', sequence: 1, expiresDays: 365 }), /1\.\.180/)
})

test('Pages Function route (public deployment) serves the feed through the same handler; shipped data: stable empty, beta published', async () => {
  const { b } = bucket([])
  for (const file of ['components.json', 'AI-Desk-GPT-Bridge-0.5.1.aidext.json', 'latest.yml']) {
    const res = await publicUpdateRoute({ request: new Request(`https://webaidesk.pages.dev/api/updates/stable/${file}`), env: { RELEASES: b }, params: { channel: 'stable', file } })
    assert.equal(res.status, 404, file)
    assert.equal(res.headers.get('cache-control'), 'no-store')
  }
  const beta = await publicUpdateRoute({ request: new Request('https://webaidesk.pages.dev/api/updates/beta/components.json'), env: { RELEASES: b }, params: { channel: 'beta', file: 'components.json' } })
  // beta has a published manifest (sequence 1); this test bucket is empty, so the handler fails closed on the missing object.
  assert.equal(await err(beta), 'release_unavailable', 'beta channel routed to its published record; empty bucket fails closed')
})

test('revocation flag in payload; cannot revoke the signing key', () => {
  assert.deepEqual(buildPayload({ channel: 'stable', sequence: 2, revokedKeyIds: ['old'], signingKeyId: 'new' }).revokedKeyIds, ['old'])
  assert.throws(() => buildPayload({ channel: 'stable', sequence: 2, revokedKeyIds: ['new'], signingKeyId: 'new' }), /own signing key/)
  assert.equal('revokedKeyIds' in buildPayload({ channel: 'stable', sequence: 2 }), false)
})
