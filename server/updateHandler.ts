// Desktop update feed for electron-updater (generic provider), Phase A (server side only).
//
//   GET/HEAD /api/updates/<channel>/latest.yml          electron-builder metadata of the CURRENT release
//   GET/HEAD /api/updates/<channel>/<installer>.exe      NSIS installer (Range/resume supported)
//   GET/HEAD /api/updates/<channel>/<installer>.exe.blockmap
//
// Configure the app with provider "generic", url "https://webaidesk.pages.dev/api/updates/stable":
// electron-updater fetches <url>/latest.yml and resolves the installer URL relative to it.
//
// Rules (all fail closed):
//   * Only records that are valid, published, approved AND signed appear (the unsigned override of
//     the website download does not apply here).
//   * latest.yml is the file electron-builder generated for that build, served verbatim from R2 after
//     its SHA-256 matches the record and it names the same version, installer file and SHA-512.
//   * Installer/blockmap must belong to a servable record of the channel (older versions stay
//     available for differential downloads); R2 objects must match size + SHA-256.
//   * Portable builds are never part of the feed.

import { RELEASE_RECORDS } from './releaseCatalog.ts'
import { serveObject, type DownloadEnv, type R2BucketLike } from './downloadHandler.ts'
import {
  currentRelease,
  isServable,
  MAX_METADATA_BYTES,
  RELEASE_CHANNELS,
  UPDATE_METADATA_FILE,
  type ArtifactRef,
  type ReleaseRecord,
} from './releaseRecords.ts'

export interface UpdateDeps {
  records: readonly ReleaseRecord[]
}

const UPDATE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.exe(\.blockmap)?$/

type UpdateError = 'method_not_allowed' | 'unknown_channel' | 'invalid_filename' | 'not_found' | 'no_release' | 'not_configured' | 'release_unavailable' | 'integrity_mismatch' | 'storage_error'
const STATUS: Record<UpdateError, number> = {
  method_not_allowed: 405,
  unknown_channel: 404,
  invalid_filename: 400,
  not_found: 404,
  no_release: 404,
  not_configured: 503,
  release_unavailable: 503,
  integrity_mismatch: 503,
  storage_error: 502,
}

function fail(error: UpdateError, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status: STATUS[error],
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra },
  })
}

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v.join('/') : (v ?? '')
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** latest.yml must describe exactly this record (electron-builder writes these keys at top level). */
export function metadataMatchesRecord(yml: string, r: ReleaseRecord): boolean {
  const lines = yml.split(/\r?\n/)
  const top = (key: string) => lines.find((l) => l.startsWith(`${key}:`))?.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '')
  const inst = r.artifacts.installer
  return (
    top('version') === r.version &&
    top('path') === inst.fileName &&
    top('sha512') === inst.sha512 &&
    lines.some((l) => /^\s*-?\s*url:\s*/.test(l) && l.replace(/^\s*-?\s*url:\s*/, '').trim().replace(/^['"]|['"]$/g, '') === inst.fileName) &&
    lines.some((l) => /^\s*size:\s*\d+\s*$/.test(l) && Number(l.split(':')[1]) === inst.sizeBytes)
  )
}

async function serveMetadata(request: Request, bucket: R2BucketLike | undefined, r: ReleaseRecord): Promise<Response> {
  if (!bucket) return fail('not_configured')
  const ref: ArtifactRef = r.artifacts.updateMetadata
  let obj
  try {
    obj = await bucket.get(ref.r2Key)
  } catch {
    return fail('storage_error')
  }
  if (!obj) return fail('release_unavailable')
  if (obj.size !== ref.sizeBytes || obj.size > MAX_METADATA_BYTES) return fail('integrity_mismatch')
  let bytes: ArrayBuffer
  try {
    bytes = await new Response(obj.body).arrayBuffer()
  } catch {
    return fail('storage_error')
  }
  if (bytes.byteLength !== ref.sizeBytes || (await sha256Hex(bytes)) !== ref.sha256) return fail('integrity_mismatch')
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  if (!metadataMatchesRecord(text, r)) return fail('integrity_mismatch')
  return new Response(request.method === 'HEAD' ? null : bytes, {
    status: 200,
    headers: {
      'content-type': 'text/yaml; charset=utf-8',
      'content-length': String(bytes.byteLength),
      // Always revalidate: a withdrawn release must disappear from the feed on the next check.
      'cache-control': 'no-cache',
      etag: obj.httpEtag,
      'x-content-type-options': 'nosniff',
      'x-aidesk-release': `${r.channel}/${r.version}`,
    },
  })
}

export async function handleUpdate(
  request: Request,
  env: DownloadEnv,
  channelParam: string | string[] | undefined,
  fileParam: string | string[] | undefined,
  deps: UpdateDeps = { records: RELEASE_RECORDS },
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return fail('method_not_allowed', { allow: 'GET, HEAD' })
  const channel = one(channelParam)
  if (!(RELEASE_CHANNELS as readonly string[]).includes(channel)) return fail('unknown_channel')
  const file = one(fileParam)

  if (file === UPDATE_METADATA_FILE) {
    const current = currentRelease(deps.records, channel)
    if (!current) return fail('no_release')
    return serveMetadata(request, env.RELEASES, current)
  }

  if (!UPDATE_FILE.test(file)) return fail('invalid_filename')
  const servable = deps.records.filter((r) => r.channel === channel && isServable(r))
  for (const r of servable) {
    const inst = r.artifacts.installer
    if (file === inst.fileName) {
      return serveObject(request, env.RELEASES, { ...inst, contentType: 'application/octet-stream', disposition: 'attachment' })
    }
    if (file === inst.blockmap.fileName) {
      return serveObject(request, env.RELEASES, { ...inst.blockmap, contentType: 'application/octet-stream', disposition: 'attachment' })
    }
  }
  return fail('not_found')
}
