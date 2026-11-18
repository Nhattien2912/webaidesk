// Signed component manifests (components.json) + GPT Bridge extension packages for the Desktop-managed updaters.
//
// The Ed25519 signature inside components.json is made OFFLINE by the release owner (scripts/release.mjs components-sign)
// and verified by AI Desk with the public key compiled into the app; this server never holds a signing key. The server's
// job is the same as for latest.yml: serve only reviewed records (published + approved) whose R2 bytes still match the
// recorded size and SHA-256 (fail closed), with immutable keys and no-cache revalidation so withdrawals take effect.
//
//   releases/<channel>/components/<sequence>/components.json
//   releases/<channel>/extension/<version>/<AI-Desk-GPT-Bridge-<version>.aidext.json>

import { compareSemver, immutableKey, RELEASE_CHANNELS, type ArtifactRef, type RecordStatus } from './releaseRecords.ts'

export const COMPONENTS_FILE = 'components.json'
export const EXTENSION_PACKAGE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.aidext\.json$/
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const SHA256 = /^[a-f0-9]{64}$/

export interface ExtensionPackageRef extends ArtifactRef {
  version: string
}

export interface ComponentRecord {
  channel: string
  /** Monotonic manifest sequence (anti-rollback on the client). */
  sequence: number
  status: RecordStatus
  approved: boolean
  manifest: ArtifactRef
  extensionPackages: ExtensionPackageRef[]
}

export const componentsKey = (channel: string, sequence: number): string => `releases/${channel}/components/${sequence}/${COMPONENTS_FILE}`
export const extensionKey = (channel: string, version: string, fileName: string): string => immutableKey(channel, `extension/${version}`, fileName)

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function checkRef(raw: unknown, label: string, key: string | null, name: RegExp | string): string[] {
  if (!isObj(raw)) return [`${label} missing`]
  const e: string[] = []
  if (typeof raw.fileName !== 'string' || (typeof name === 'string' ? raw.fileName !== name : !name.test(raw.fileName))) e.push(`${label}.fileName invalid`)
  if (key !== null && raw.r2Key !== key) e.push(`${label}.r2Key must be ${key}`)
  if (typeof raw.sizeBytes !== 'number' || !Number.isInteger(raw.sizeBytes) || raw.sizeBytes <= 0) e.push(`${label}.sizeBytes invalid`)
  if (typeof raw.sha256 !== 'string' || !SHA256.test(raw.sha256)) e.push(`${label}.sha256 invalid`)
  return e
}

export function validateComponentRecord(raw: unknown): string[] {
  if (!isObj(raw)) return ['component record is not an object']
  const e: string[] = []
  const { channel, sequence, status, approved, manifest, extensionPackages } = raw
  if (typeof channel !== 'string' || !(RELEASE_CHANNELS as readonly string[]).includes(channel)) e.push('unknown channel')
  if (typeof sequence !== 'number' || !Number.isSafeInteger(sequence) || sequence < 1) e.push('sequence invalid')
  if (status !== 'staged' && status !== 'published' && status !== 'withdrawn') e.push('status invalid')
  if (typeof approved !== 'boolean') e.push('approved must be boolean')
  if (status === 'published' && approved !== true) e.push('published without approval')
  if (e.length) return e
  e.push(...checkRef(manifest, 'manifest', componentsKey(channel as string, sequence as number), COMPONENTS_FILE))
  if (isObj(manifest) && typeof manifest.sizeBytes === 'number' && manifest.sizeBytes > 64 * 1024) e.push('manifest too large')
  if (!Array.isArray(extensionPackages)) return [...e, 'extensionPackages must be an array']
  extensionPackages.forEach((p, i) => {
    if (!isObj(p) || typeof p.version !== 'string' || !SEMVER.test(p.version)) return void e.push(`extensionPackages[${i}].version invalid`)
    e.push(...checkRef(p, `extensionPackages[${i}]`, typeof p.fileName === 'string' ? extensionKey(channel as string, p.version, p.fileName) : null, EXTENSION_PACKAGE))
    if (typeof p.sizeBytes === 'number' && p.sizeBytes > 4 * 1024 * 1024) e.push(`extensionPackages[${i}] too large`)
  })
  return e
}

/** Valid records; duplicates (same channel+sequence, same R2 key with different bytes) drop every record involved. */
export function checkComponents(raw: unknown): { valid: ComponentRecord[]; errors: string[] } {
  if (raw === undefined) return { valid: [], errors: [] }
  if (!Array.isArray(raw)) return { valid: [], errors: ['components must be an array'] }
  const errors: string[] = []
  const ok: ComponentRecord[] = []
  raw.forEach((r, i) => {
    const e = validateComponentRecord(r)
    if (e.length) errors.push(...e.map((m) => `components[${i}]: ${m}`))
    else ok.push(r as ComponentRecord)
  })
  const seq = new Map<string, number>()
  const keyBytes = new Map<string, Set<string>>()
  for (const r of ok) {
    seq.set(`${r.channel}/${r.sequence}`, (seq.get(`${r.channel}/${r.sequence}`) ?? 0) + 1)
    for (const p of [r.manifest, ...r.extensionPackages]) {
      const s = keyBytes.get(p.r2Key) ?? new Set<string>()
      s.add(`${p.sizeBytes}:${p.sha256}`)
      keyBytes.set(p.r2Key, s)
    }
  }
  const valid = ok.filter((r) => {
    const dup = (seq.get(`${r.channel}/${r.sequence}`) ?? 0) > 1 || [r.manifest, ...r.extensionPackages].some((p) => (keyBytes.get(p.r2Key)?.size ?? 0) > 1)
    if (dup) errors.push(`components ${r.channel}/${r.sequence}: duplicate sequence or conflicting immutable key`)
    return !dup
  })
  return { valid, errors }
}

export const isServableComponent = (r: ComponentRecord): boolean => r.status === 'published' && r.approved === true

/** Current manifest of a channel = highest published + approved sequence. */
export function currentComponents(records: readonly ComponentRecord[], channel: string): ComponentRecord | null {
  return records.filter((r) => r.channel === channel && isServableComponent(r)).sort((a, b) => b.sequence - a.sequence)[0] ?? null
}

/** Package lookup across published records of the channel (newest first), so a re-signed manifest can keep a package. */
export function findExtensionPackage(records: readonly ComponentRecord[], channel: string, fileName: string): ExtensionPackageRef | null {
  const pkgs = records
    .filter((r) => r.channel === channel && isServableComponent(r))
    .flatMap((r) => r.extensionPackages)
    .filter((p) => p.fileName === fileName)
    .sort((a, b) => compareSemver(b.version, a.version))
  return pkgs[0] ?? null
}
