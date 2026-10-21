// Local-only backup/restore drill for the CMS D1 database (miniflare sqlite file).
// 1) consistent snapshot via VACUUM INTO, 2) restore the snapshot into an empty database file,
// 3) compare row counts + content hashes + integrity. Never touches remote Cloudflare resources.
import { DatabaseSync } from 'node:sqlite'
import { createHash } from 'node:crypto'
import { mkdirSync, rmSync, existsSync, readdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const persist = process.argv[2] ?? '.wrangler/state/final-e2e-20261020'
const outDir = process.argv[3] ?? 'artifacts/final-completion/backup-drill'
const d1Dir = join(persist, 'v3/d1/miniflare-D1DatabaseObject')
const source = readdirSync(d1Dir).find((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite')
if (!source) throw new Error(`no D1 sqlite file in ${d1Dir}`)

mkdirSync(outDir, { recursive: true })
const backup = join(outDir, 'cms-backup.sqlite')
const restored = join(outDir, 'cms-restored.sqlite')
for (const f of [backup, restored]) if (existsSync(f)) rmSync(f)

const live = new DatabaseSync(join(d1Dir, source), { readOnly: true })
live.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`)
live.close()

copyFileSync(backup, restored) // restore = place the snapshot as the database file
const tables = (db) => db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name").all().map((r) => r.name)
const fingerprint = (db) => {
  const out = {}
  for (const table of tables(db)) {
    const rows = db.prepare(`SELECT * FROM "${table}" ORDER BY 1`).all()
    out[table] = { rows: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0, 16) }
  }
  return out
}

const a = new DatabaseSync(join(d1Dir, source), { readOnly: true })
const b = new DatabaseSync(restored, { readOnly: true })
const before = fingerprint(a)
const after = fingerprint(b)
const integrity = b.prepare('PRAGMA integrity_check').get()
a.close(); b.close()

let ok = integrity.integrity_check === 'ok'
console.log('table'.padEnd(28), 'rows', 'match')
for (const table of Object.keys(before)) {
  const same = JSON.stringify(before[table]) === JSON.stringify(after[table])
  ok &&= same
  console.log(table.padEnd(28), String(before[table].rows).padEnd(4), same ? 'PASS' : 'FAIL')
}
console.log(`integrity_check: ${integrity.integrity_check}`)
console.log(ok ? 'RESTORE DRILL PASS' : 'RESTORE DRILL FAIL')
process.exit(ok ? 0 : 1)
