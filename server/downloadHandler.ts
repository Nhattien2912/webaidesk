// Release download + latest-manifest API for Cloudflare Pages Functions, backed by a PRIVATE R2
// bucket bound as `RELEASES` (bucket: aidesk-releases). Runtime-agnostic so it is tested under Node.
//
// Safety model:
//   * The request only names a file; the R2 key always comes from the reviewed server catalog
//     (server/releaseCatalog.ts). Unknown, unpublished, unapproved or unsigned entries => 404.
//   * Each entry is re-validated with the same validator the website uses (validateReleaseManifest).
//   * The R2 object must match the catalog size and SHA-256 (custom metadata or R2 checksum), or the
//     download is refused (503). Bodies are streamed from R2, never buffered.

import { validateReleaseManifest, type ReleaseManifest } from '../src/lib/releaseManifest.ts'
import { currentCatalog, RELEASE_CATALOG, type ReleaseEntry } from './releaseCatalog.ts'
import { BETA_ARCHIVE_TARGET } from './archivePolicy.ts'

/** Minimal subset of the Workers R2 API used here. */
export interface R2ObjectLike {
  key: string
  size: number
  httpEtag: string
  uploaded: Date
  customMetadata?: Record<string, string>
  checksums?: { sha256?: ArrayBuffer }
}
export interface R2ObjectBodyLike extends R2ObjectLike {
  body: ReadableStream
}
export interface R2BucketLike {
  head(key: string): Promise<R2ObjectLike | null>
  get(key: string, options?: { range?: { offset: number; length?: number } }): Promise<R2ObjectBodyLike | null>
}

export interface DownloadEnv {
  RELEASES?: R2BucketLike
  /** Server-side mirror of VITE_ALLOW_UNSIGNED_DOWNLOAD. Unsigned stays blocked unless exactly "true". */
  ALLOW_UNSIGNED_DOWNLOAD?: string
}

export interface DownloadDeps {
  catalog: readonly ReleaseEntry[]
}

const defaultDeps: DownloadDeps = { catalog: RELEASE_CATALOG }

export const DOWNLOAD_PATH = '/api/download/'
export const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.(?:exe|rar)$/i

type ErrorCode =
  | 'method_not_allowed'
  | 'invalid_filename'
  | 'not_found'
  | 'no_release'
  | 'not_configured'
  | 'release_unavailable'
  | 'integrity_mismatch'
  | 'storage_error'

const STATUS: Record<ErrorCode, number> = {
  method_not_allowed: 405,
  invalid_filename: 400,
  not_found: 404,
  no_release: 404,
  not_configured: 503,
  release_unavailable: 503,
  integrity_mismatch: 503,
  storage_error: 502,
}

function fail(error: ErrorCode, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status: STATUS[error],
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  })
}

function allowUnsigned(env: DownloadEnv): boolean {
  return env.ALLOW_UNSIGNED_DOWNLOAD === 'true'
}

function safeKey(key: string): boolean {
  return typeof key === 'string' && key.length > 0 && key.length <= 512 && !key.startsWith('/') && !key.split('/').includes('..')
}

function downloadUrl(origin: string, fileName: string): string {
  return new URL(`${DOWNLOAD_PATH}${encodeURIComponent(fileName)}`, origin).toString()
}

function manifestFor(entries: readonly ReleaseEntry[], origin: string): unknown {
  const first = entries[0]
  return {
    schemaVersion: 1,
    channel: first.channel,
    status: first.status,
    approved: first.approved,
    version: first.version,
    releasedAt: first.releasedAt,
    minOs: first.minOs,
    ...(first.commit ? { commit: first.commit } : {}),
    ...(first.notesUrl ? { notesUrl: first.notesUrl } : {}),
    files: entries.map((e) => ({
      kind: e.kind,
      fileName: e.fileName,
      url: downloadUrl(origin, e.fileName),
      sizeBytes: e.sizeBytes,
      sha256: e.sha256,
      signature: e.signature,
      ...(e.signer ? { signer: e.signer } : {}),
    })),
  }
}

/** An entry is downloadable only if it passes the same checks the website applies to a manifest. */
export function isDownloadable(entry: ReleaseEntry, origin: string, env: DownloadEnv): boolean {
  if (!FILE_NAME.test(entry.fileName) || !safeKey(entry.r2Key)) return false
  if (
    entry.kind === 'archive' &&
    (entry.version !== BETA_ARCHIVE_TARGET.version ||
      entry.fileName !== BETA_ARCHIVE_TARGET.fileName ||
      entry.r2Key !== BETA_ARCHIVE_TARGET.r2Key ||
      entry.sizeBytes !== BETA_ARCHIVE_TARGET.sizeBytes ||
      entry.sha256.toLowerCase() !== BETA_ARCHIVE_TARGET.sha256)
  ) {
    return false
  }
  // Unlike legacy EXE development fixtures, the allowlisted archive never has an unsigned override.
  if (entry.kind === 'archive' && entry.signature !== 'signed') return false
  if (entry.status !== 'published' || entry.approved !== true) return false
  const host = new URL(origin).hostname.toLowerCase()
  // Validate portable files as installer-shaped singletons; archive is a valid website primary.
  const asPrimary: ReleaseEntry = entry.kind === 'portable' ? { ...entry, kind: 'installer' } : entry
  return validateReleaseManifest(manifestFor([asPrimary], origin), { allowedHosts: [host], allowUnsigned: allowUnsigned(env) }).ok
}

/** Latest downloadable release (newest releasedAt) as a website manifest, or null. */
export function latestManifest(catalog: readonly ReleaseEntry[], origin: string, env: DownloadEnv): ReleaseManifest | null {
  const ok = catalog.filter((e) => isDownloadable(e, origin, env))
  const primaries = ok.filter((e) => e.kind === 'archive' || e.kind === 'installer').sort((a, b) => Date.parse(b.releasedAt) - Date.parse(a.releasedAt))
  const newest = primaries[0]
  if (!newest) return null
  const sameVersion = ok.filter((e) => e.version === newest.version && e.channel === newest.channel)
  const ordered = [newest, ...sameVersion.filter((e) => e !== newest)]
  const host = new URL(origin).hostname.toLowerCase()
  const check = validateReleaseManifest(manifestFor(ordered, origin), { allowedHosts: [host], allowUnsigned: allowUnsigned(env) })
  return check.ok ? check.manifest : null
}

export async function handleLatestManifest(request: Request, env: DownloadEnv, deps?: DownloadDeps): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return fail('method_not_allowed', { allow: 'GET, HEAD' })
  // Default: only the channel's current release (the same one the update feed offers).
  const catalog = deps ? deps.catalog : currentCatalog(allowUnsigned(env))
  const manifest = latestManifest(catalog, new URL(request.url).origin, env)
  if (!manifest) return fail('no_release')
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(manifest), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    },
  })
}

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** SHA-256 recorded on the R2 object, from custom metadata or the native R2 checksum. */
export function objectSha256(obj: R2ObjectLike): string | null {
  const meta = obj.customMetadata?.sha256?.trim().toLowerCase()
  if (meta && /^[a-f0-9]{64}$/.test(meta)) return meta
  const sum = obj.checksums?.sha256
  return sum && sum.byteLength === 32 ? hex(sum) : null
}

export type RangeResult =
  | { kind: 'full' }
  | { kind: 'partial'; offset: number; length: number }
  | { kind: 'unsatisfiable' }

/** Single byte range per RFC 9110. Multi-range or malformed headers are ignored (full response). */
export function parseRange(header: string | null, size: number): RangeResult {
  if (!header) return { kind: 'full' }
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!m || (m[1] === '' && m[2] === '')) return { kind: 'full' }
  if (size === 0) return { kind: 'unsatisfiable' }
  if (m[1] === '') {
    const suffix = Number(m[2])
    if (suffix === 0) return { kind: 'unsatisfiable' }
    const length = Math.min(suffix, size)
    return { kind: 'partial', offset: size - length, length }
  }
  const start = Number(m[1])
  if (start >= size) return { kind: 'unsatisfiable' }
  const end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)
  if (end < start) return { kind: 'full' }
  return { kind: 'partial', offset: start, length: end - start + 1 }
}

/** What a served object must be, according to the reviewed release records. */
export interface ServableObject {
  r2Key: string
  /** Name used in Content-Disposition. */
  fileName: string
  sizeBytes: number
  sha256: string
  contentType: string
  disposition: 'attachment' | 'inline'
}

function objectHeaders(target: ServableObject, obj: R2ObjectLike): Record<string, string> {
  return {
    'content-type': target.contentType,
    'content-disposition': `${target.disposition}; filename="${target.fileName}"`,
    'accept-ranges': 'bytes',
    etag: obj.httpEtag,
    'last-modified': obj.uploaded.toUTCString(),
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
    'x-aidesk-sha256': target.sha256,
  }
}

/**
 * Streams one R2 object after checking it against the release records (size + SHA-256, ETag stable
 * between HEAD and GET). Supports GET/HEAD, a single Range (206/416), If-Range and If-None-Match.
 */
export async function serveObject(request: Request, bucket: R2BucketLike | undefined, target: ServableObject): Promise<Response> {
  if (!bucket) return fail('not_configured')

  let head: R2ObjectLike | null
  try {
    head = await bucket.head(target.r2Key)
  } catch {
    return fail('storage_error')
  }
  if (!head) return fail('release_unavailable')
  if (head.size !== target.sizeBytes || objectSha256(head) !== target.sha256.toLowerCase()) return fail('integrity_mismatch')

  const headers = objectHeaders(target, head)
  const ifNoneMatch = request.headers.get('if-none-match')
  if (ifNoneMatch && ifNoneMatch.split(',').map((t) => t.trim()).includes(head.httpEtag)) {
    return new Response(null, { status: 304, headers })
  }

  const ifRange = request.headers.get('if-range')
  const rangeHeader = ifRange && ifRange.trim() !== head.httpEtag ? null : request.headers.get('range')
  const range = parseRange(rangeHeader, head.size)
  if (range.kind === 'unsatisfiable') {
    return new Response(null, { status: 416, headers: { ...headers, 'content-range': `bytes */${head.size}`, 'content-length': '0' } })
  }
  const partialHeaders: Record<string, string> =
    range.kind === 'partial'
      ? { 'content-length': String(range.length), 'content-range': `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}` }
      : { 'content-length': String(head.size) }
  const status = range.kind === 'partial' ? 206 : 200

  if (request.method === 'HEAD') return new Response(null, { status, headers: { ...headers, ...partialHeaders } })

  let obj: R2ObjectBodyLike | null
  try {
    obj = await bucket.get(target.r2Key, range.kind === 'partial' ? { range: { offset: range.offset, length: range.length } } : undefined)
  } catch {
    return fail('storage_error')
  }
  if (!obj) return fail('release_unavailable')
  if (obj.httpEtag !== head.httpEtag) return fail('integrity_mismatch')
  return new Response(obj.body, { status, headers: { ...headers, ...partialHeaders } })
}

export async function handleDownload(
  request: Request,
  env: DownloadEnv,
  name: string | string[] | undefined,
  deps: DownloadDeps = defaultDeps,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return fail('method_not_allowed', { allow: 'GET, HEAD' })
  const fileName = Array.isArray(name) ? name.join('/') : (name ?? '')
  if (!FILE_NAME.test(fileName)) return fail('invalid_filename')

  const origin = new URL(request.url).origin
  const entry = deps.catalog.find((e) => e.fileName === fileName)
  // Unknown, unpublished, unapproved and unsigned releases all look the same to the caller.
  if (!entry || !isDownloadable(entry, origin, env)) return fail('not_found')

  return serveObject(request, env.RELEASES, {
    r2Key: entry.r2Key,
    fileName: entry.fileName,
    sizeBytes: entry.sizeBytes,
    sha256: entry.sha256,
    contentType: entry.kind === 'archive' ? BETA_ARCHIVE_TARGET.contentType : 'application/octet-stream',
    disposition: 'attachment',
  })
}
