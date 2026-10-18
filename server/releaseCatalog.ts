// Website-download view of the release records (server/releaseData.ts → server/releaseRecords.ts).
//
// /api/download/* and /api/releases/latest work on flat ReleaseEntry items; they are DERIVED from
// the reviewed release records so the website and the desktop update feed always agree. The R2 key
// of every file comes from the records, never from the request. A file is downloadable only when its
// record is published + approved (+ signed unless the server explicitly allows unsigned), and the
// R2 object matches the recorded size and SHA-256.

import { RELEASE_DATA } from './releaseData.ts'
import { checkCatalog, currentRelease, DEFAULT_CHANNEL, type ReleaseRecord } from './releaseRecords.ts'

export type ReleaseKind = 'installer' | 'portable' | 'archive'

export interface ReleaseEntry {
  /** Public file name, also the URL segment: /api/download/<fileName>. */
  fileName: string
  /** Object key inside the aidesk-releases bucket. Never derived from the request. */
  r2Key: string
  kind: ReleaseKind
  version: string
  channel: string
  /** ISO date. */
  releasedAt: string
  minOs: string
  sizeBytes: number
  /** Lower-case hex SHA-256 of the exact uploaded bytes (computed after signing). */
  sha256: string
  signature: 'signed' | 'unsigned'
  signer?: string
  commit?: string
  notesUrl?: string
  status: 'published' | 'unpublished'
  approved: boolean
}

/** Flat download entries (optional archive + installer + optional portable) of one release record. */
export function entriesForRecord(r: ReleaseRecord): ReleaseEntry[] {
  const common = {
    version: r.version,
    channel: r.channel,
    releasedAt: r.releasedAt,
    minOs: r.minOs,
    signature: r.signature,
    ...(r.signer ? { signer: r.signer } : {}),
    ...(r.commit ? { commit: r.commit } : {}),
    ...(r.notesUrl ? { notesUrl: r.notesUrl } : {}),
    status: r.status === 'published' ? ('published' as const) : ('unpublished' as const),
    approved: r.approved,
  }
  const { archive, installer, portable } = r.artifacts
  const out: ReleaseEntry[] = []
  if (archive) {
    out.push({ ...common, kind: 'archive', fileName: archive.fileName, r2Key: archive.r2Key, sizeBytes: archive.sizeBytes, sha256: archive.sha256 })
  }
  out.push({ ...common, kind: 'installer', fileName: installer.fileName, r2Key: installer.r2Key, sizeBytes: installer.sizeBytes, sha256: installer.sha256 })
  if (portable) {
    out.push({ ...common, kind: 'portable', fileName: portable.fileName, r2Key: portable.r2Key, sizeBytes: portable.sizeBytes, sha256: portable.sha256 })
  }
  return out
}

const checked = checkCatalog(RELEASE_DATA)

/** Structurally valid, conflict-free release records (published or not). */
export const RELEASE_RECORDS: readonly ReleaseRecord[] = checked.valid
/** Problems found in server/releaseData.ts (tests assert this is empty). */
export const RELEASE_FILE_ERRORS: readonly string[] = checked.errors

/** All download entries; handleDownload still re-checks status/approval/signature per request. */
export const RELEASE_CATALOG: readonly ReleaseEntry[] = RELEASE_RECORDS.flatMap(entriesForRecord)

/** Entries of the channel's current release only: the website manifest offers exactly what the updater offers. */
export function currentCatalog(allowUnsigned: boolean, records: readonly ReleaseRecord[] = RELEASE_RECORDS): ReleaseEntry[] {
  const current = currentRelease(records, DEFAULT_CHANNEL, { allowUnsigned })
  return current ? entriesForRecord(current) : []
}
