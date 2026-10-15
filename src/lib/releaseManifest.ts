// Release manifest contract (AIDESK_RELEASE_MANIFEST v1) and a fail-closed validator.
// The website never invents a version, size, checksum or URL: everything shown in the
// download card comes from a manifest that passed validateReleaseManifest().

export type SignatureStatus = 'signed' | 'unsigned'
export type ReleaseFileKind = 'installer' | 'portable'

export interface ReleaseFile {
  kind: ReleaseFileKind
  fileName: string
  url: string
  sizeBytes: number
  sha256: string
  signature: SignatureStatus
  signer?: string
}

export interface ReleaseManifest {
  schemaVersion: 1
  channel: string
  status: 'published' | 'unpublished'
  approved: boolean
  version: string
  releasedAt: string
  minOs: string
  commit?: string
  notesUrl?: string
  files: ReleaseFile[]
}

export interface ValidationPolicy {
  /** Lower-case host names allowed for file URLs. Empty list => no file is acceptable. */
  allowedHosts: string[]
  allowUnsigned: boolean
}

export type ManifestCheck =
  | { ok: true; manifest: ReleaseManifest; primary: ReleaseFile }
  | { ok: false; reason: string }

const SHA256 = /^[a-f0-9]{64}$/i
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown, max = 300): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

function checkFile(raw: unknown, policy: ValidationPolicy): ReleaseFile | string {
  if (!isRecord(raw)) return 'file entry is not an object'
  const { kind, fileName, url, sizeBytes, sha256, signature, signer } = raw
  if (kind !== 'installer' && kind !== 'portable') return 'file.kind must be installer or portable'
  if (!nonEmptyString(fileName, 200) || !/\.exe$/i.test(fileName) || /[\\/]/.test(fileName)) {
    return 'file.fileName must be a plain .exe file name'
  }
  if (!nonEmptyString(url, 2048)) return 'file.url missing'
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return 'file.url is not an absolute URL'
  }
  if (parsed.protocol !== 'https:') return 'file.url must use https'
  if (parsed.username || parsed.password) return 'file.url must not contain credentials'
  if (!policy.allowedHosts.includes(parsed.hostname.toLowerCase())) {
    return `file.url host ${parsed.hostname} is not in the allowed download hosts`
  }
  if (typeof sizeBytes !== 'number' || !Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_SIZE_BYTES) {
    return 'file.sizeBytes must be a positive integer'
  }
  if (typeof sha256 !== 'string' || !SHA256.test(sha256)) return 'file.sha256 must be 64 hex characters'
  if (signature !== 'signed' && signature !== 'unsigned') return 'file.signature must be signed or unsigned'
  if (signature === 'unsigned' && !policy.allowUnsigned) return 'unsigned binaries are not allowed for public download'
  if (signer !== undefined && !nonEmptyString(signer, 200)) return 'file.signer must be a string'
  return {
    kind,
    fileName,
    url: parsed.toString(),
    sizeBytes,
    sha256: sha256.toLowerCase(),
    signature,
    ...(typeof signer === 'string' ? { signer } : {}),
  }
}

export function validateReleaseManifest(raw: unknown, policy: ValidationPolicy): ManifestCheck {
  if (!isRecord(raw)) return { ok: false, reason: 'manifest is not a JSON object' }
  if (raw.schemaVersion !== 1) return { ok: false, reason: 'unsupported schemaVersion' }
  if (raw.status !== 'published') return { ok: false, reason: 'release is not published' }
  if (raw.approved !== true) return { ok: false, reason: 'release is not approved' }
  if (!nonEmptyString(raw.channel, 50)) return { ok: false, reason: 'channel missing' }
  if (typeof raw.version !== 'string' || !VERSION.test(raw.version)) return { ok: false, reason: 'version is not semver' }
  if (typeof raw.releasedAt !== 'string' || Number.isNaN(Date.parse(raw.releasedAt))) {
    return { ok: false, reason: 'releasedAt is not a date' }
  }
  if (!nonEmptyString(raw.minOs, 100)) return { ok: false, reason: 'minOs missing' }
  if (raw.commit !== undefined && (typeof raw.commit !== 'string' || !/^[a-f0-9]{7,40}$/i.test(raw.commit))) {
    return { ok: false, reason: 'commit must be a git sha' }
  }
  let notesUrl: string | undefined
  if (raw.notesUrl !== undefined) {
    try {
      const u = new URL(String(raw.notesUrl))
      if (u.protocol !== 'https:') throw new Error('not https')
      notesUrl = u.toString()
    } catch {
      return { ok: false, reason: 'notesUrl must be an https URL' }
    }
  }
  if (!Array.isArray(raw.files) || raw.files.length === 0) return { ok: false, reason: 'files missing' }
  const files: ReleaseFile[] = []
  for (const entry of raw.files) {
    const checked = checkFile(entry, policy)
    if (typeof checked === 'string') return { ok: false, reason: checked }
    files.push(checked)
  }
  const primary = files.find((f) => f.kind === 'installer')
  if (!primary) return { ok: false, reason: 'no installer file' }
  const manifest: ReleaseManifest = {
    schemaVersion: 1,
    channel: raw.channel,
    status: 'published',
    approved: true,
    version: raw.version,
    releasedAt: raw.releasedAt,
    minOs: raw.minOs,
    ...(typeof raw.commit === 'string' ? { commit: raw.commit } : {}),
    ...(notesUrl ? { notesUrl } : {}),
    files,
  }
  return { ok: true, manifest, primary }
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

export type DownloadState =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'available'; manifest: ReleaseManifest; primary: ReleaseFile }

/** Fetches and validates the manifest. Any failure resolves to `unavailable` (fail closed). */
export async function loadDownloadState(
  manifestUrl: string,
  policy: ValidationPolicy,
  fetchImpl: typeof fetch = fetch,
): Promise<DownloadState> {
  if (!manifestUrl) return { kind: 'unavailable', reason: 'manifest URL is not configured' }
  try {
    const res = await fetchImpl(manifestUrl, { cache: 'no-store', headers: { accept: 'application/json' } })
    if (!res.ok) return { kind: 'unavailable', reason: `manifest HTTP ${res.status}` }
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('json')) return { kind: 'unavailable', reason: 'manifest is not JSON' }
    const check = validateReleaseManifest(await res.json(), policy)
    if (!check.ok) return { kind: 'unavailable', reason: check.reason }
    return { kind: 'available', manifest: check.manifest, primary: check.primary }
  } catch {
    return { kind: 'unavailable', reason: 'manifest could not be loaded' }
  }
}
