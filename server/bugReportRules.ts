// Bug report V1 contract ("Gửi báo lỗi" in the AI Desk desktop app): pure validation and summary helpers shared by
// the public intake (server/bugReportHandler.ts) and the private Studio admin (server/cms/bugReports.ts).
// The contract is fixed: the desktop app is built against it.

export const BUG_REPORT_SCHEMA = 'AIDESK_BUG_REPORT_V1'
/** Whole request body, bytes (1 MiB). Larger Content-Length => 413 before reading, larger stream => 413. */
export const MAX_BUG_REPORT_BYTES = 1024 * 1024
export const MAX_DESCRIPTION_CHARS = 4000
export const CHANNELS = ['stable', 'beta', 'dev'] as const
export type BugReportChannel = (typeof CHANNELS)[number]

/** Crockford base32 (no I, L, O, U). */
export const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const REPORT_ID_RE = /^BR-[0-9A-HJKMNP-TV-Z]{6}$/

export const MAX_SUMMARY_ITEMS = 20
const ERROR_CODE_RE = /^[A-Za-z0-9_.:-]{1,64}$/
const WORKER_RE = /^[a-z0-9][a-z0-9 _.:/-]{0,63}$/
const APP_VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,63}$/
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f]/

export type BugReportErrorCode =
  | 'INVALID_CONTENT_TYPE'
  | 'ORIGIN_REJECTED'
  | 'INVALID_JSON'
  | 'INVALID_SCHEMA'
  | 'INVALID_APP_VERSION'
  | 'INVALID_CHANNEL'
  | 'INVALID_OS'
  | 'INVALID_DESCRIPTION'
  | 'INVALID_BUNDLE'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'NOT_CONFIGURED'
  | 'SERVER_ERROR'

export interface BugReportInput {
  appVersion: string
  channel: BugReportChannel
  os: string
  description: string
  bundle: Record<string, unknown>
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

/** Validates the parsed body. Unknown extra top-level fields are ignored (forward compatible). */
export function checkBugReport(raw: unknown): { ok: true; value: BugReportInput } | { ok: false; error: BugReportErrorCode } {
  if (!isPlainObject(raw) || raw.schema !== BUG_REPORT_SCHEMA) return { ok: false, error: 'INVALID_SCHEMA' }
  const { appVersion, channel, os, description, bundle } = raw
  if (typeof appVersion !== 'string' || !APP_VERSION_RE.test(appVersion)) return { ok: false, error: 'INVALID_APP_VERSION' }
  if (typeof channel !== 'string' || !(CHANNELS as readonly string[]).includes(channel)) return { ok: false, error: 'INVALID_CHANNEL' }
  if (typeof os !== 'string' || !os.trim() || os.length > 128 || CONTROL_RE.test(os)) return { ok: false, error: 'INVALID_OS' }
  // Counted in code points, so a desktop that limits by UTF-16 length (<= 4000) is always accepted.
  if (typeof description !== 'string' || [...description].length > MAX_DESCRIPTION_CHARS) return { ok: false, error: 'INVALID_DESCRIPTION' }
  if (!isPlainObject(bundle)) return { ok: false, error: 'INVALID_BUNDLE' }
  return { ok: true, value: { appVersion, channel: channel as BugReportChannel, os: os.trim(), description, bundle } }
}

function pushUnique(list: string[], value: string) {
  if (list.length < MAX_SUMMARY_ITEMS && !list.includes(value)) list.push(value)
}

/** Distinct `bundle.failures[].errorCode` values (well-formed ones only, at most 20), in first-seen order. */
export function extractErrorCodes(bundle: Record<string, unknown>): string[] {
  const out: string[] = []
  const failures = bundle.failures
  if (!Array.isArray(failures)) return out
  for (const failure of failures) {
    const code = isPlainObject(failure) ? failure.errorCode : undefined
    if (typeof code === 'string' && ERROR_CODE_RE.test(code.trim())) pushUnique(out, code.trim())
  }
  return out
}

function workerName(value: unknown): string | null {
  const candidate = isPlainObject(value) ? (value.id ?? value.name ?? value.kind ?? value.adapter) : value
  if (typeof candidate !== 'string') return null
  const normalized = candidate.trim().toLowerCase()
  return WORKER_RE.test(normalized) ? normalized : null
}

/**
 * Distinct worker names (lower-case, at most 20) from `bundle.workers[]` (strings or objects with id/name/kind/adapter)
 * and `bundle.failures[].worker | workerId | adapter`.
 */
export function extractWorkers(bundle: Record<string, unknown>): string[] {
  const out: string[] = []
  if (Array.isArray(bundle.workers)) for (const worker of bundle.workers) { const name = workerName(worker); if (name) pushUnique(out, name) }
  if (Array.isArray(bundle.failures)) {
    for (const failure of bundle.failures) {
      if (!isPlainObject(failure)) continue
      const name = workerName(failure.worker ?? failure.workerId ?? failure.adapter)
      if (name) pushUnique(out, name)
    }
  }
  return out
}

/** `BR-` + 6 Crockford base32 chars from 6 random bytes (5 bits each, no modulo bias). */
export function reportIdFromBytes(bytes: Uint8Array): string {
  if (bytes.length < 6) throw new Error('need 6 random bytes')
  let id = 'BR-'
  for (let index = 0; index < 6; index++) id += CROCKFORD[bytes[index]! & 31]
  return id
}

export function randomReportId(): string {
  return reportIdFromBytes(crypto.getRandomValues(new Uint8Array(6)))
}

/** Private R2 key: bug-reports/<yyyy-mm>/<reportId>.json (UTC month of receipt). */
export function bundleKeyFor(reportId: string, now: number): string {
  return `bug-reports/${new Date(now).toISOString().slice(0, 7)}/${reportId}.json`
}
