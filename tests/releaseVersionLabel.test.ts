import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// @ts-expect-error plain ESM script without type declarations
import { inspectBuild } from '../scripts/release.mjs'

function fakeBuild(version: string, fileName: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'aidesk-label-'))
  const bytes = randomBytes(512)
  const sha512 = createHash('sha512').update(bytes).digest('base64')
  writeFileSync(join(dir, fileName), bytes)
  writeFileSync(join(dir, `${fileName}.blockmap`), 'bm')
  writeFileSync(join(dir, 'latest.yml'), `version: ${version}\nfiles:\n  - url: ${fileName}\n    sha512: ${sha512}\n    size: ${bytes.length}\npath: ${fileName}\nsha512: ${sha512}\nreleaseDate: '2026-10-24T00:00:00.000Z'\n`)
  return dir
}
const deps = { authenticode: () => ({ status: 'NotSigned', signer: '' }) }

test('inspect refuses an installer labelled with another version than latest.yml (e.g. v0.4.0 label, 0.2.0 binary)', async () => {
  await assert.rejects(inspectBuild({ dir: fakeBuild('0.2.0', 'AI-Desk-Setup-0.4.0.exe'), releaseFile: { schemaVersion: 1, releases: [] }, deps }), /does not carry latest\.yml version 0\.2\.0/)
})

test('inspect accepts a consistent build', async () => {
  const r = await inspectBuild({ dir: fakeBuild('0.5.0', 'AI-Desk-Setup-0.5.0.exe'), releaseFile: { schemaVersion: 1, releases: [] }, deps })
  assert.equal(r.record.version, '0.5.0')
})
