// Bug report intake: POST /api/bug-report ("Gửi báo lỗi" in the AI Desk desktop app). Runtime-agnostic so it can be
// tested under Node and served by Cloudflare Pages Functions (functions/api/bug-report.ts, public site only).
//
// Reports are only ever sent manually by the user, after a preview. No Turnstile: the caller is the Electron main
// process, not a browser page. Abuse is bounded by a per-IP-hash rate limit (D1), a global daily cap, a 1 MiB body
// limit and the JSON content type (which a cross-site browser form cannot send without a CORS preflight we never allow).
//
// Storage: metadata row in D1 `bug_reports` (migrations/0007_bug_reports.sql), raw request body (exactly what the user
// previewed) in the PRIVATE R2 bucket bound as BUG_REPORTS under bug-reports/<yyyy-mm>/<reportId>.json.

import {
  MAX_BUG_REPORT_BYTES,
  bundleKeyFor,
  checkBugReport,
  extractErrorCodes,
  extractWorkers,
  randomReportId,
  type BugReportErrorCode,
} from './bugReportRules.ts'

/** Minimal subset of the Cloudflare D1 API used here. */
export interface BugReportD1Statement {
  bind(...values: unknown[]): BugReportD1Statement
  first<T = Record<string, unknown>>(): Promise<T | null>
  run(): Promise<unknown>
}
export interface BugReportD1 {
  prepare(query: string): BugReportD1Statement
}
/** Minimal subset of the Cloudflare R2 API used here. */
export interface BugReportBucket {
  put(key: string, body: ArrayBuffer, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>
}

export interface BugReportEnv {
  /** Same D1 database as the Studio (migrations/ applied, incl. 0007_bug_reports.sql). */
  CMS_DB?: BugReportD1
  /** PRIVATE R2 bucket for raw report bundles. Never public, no r2.dev, no custom domain. */
  BUG_REPORTS?: BugReportBucket
  /** Salt for hashing client IPs (recommended, secret). */
  IP_HASH_SALT?: string
  /** Optional comma-separated list of allowed Origins; requests without Origin (the desktop app) are always allowed. */
  ALLOWED_ORIGINS?: string
}

export interface BugReportDeps {
  now: () => number
  randomId: () => string
}

export const RATE_LIMIT_HOUR_MS = 60 * 60 * 1000
export const RATE_LIMIT_DAY_MS = 24 * RATE_LIMIT_HOUR_MS
export const RATE_LIMIT_PER_HOUR = 5
export const RATE_LIMIT_PER_DAY = 20
/** All IPs together; bounds R2 growth to ~1 GiB/day even under a distributed flood. */
export const GLOBAL_DAILY_MAX = 1000
const ID_ATTEMPTS = 5

const STATUS: Record<BugReportErrorCode, number> = {
  INVALID_CONTENT_TYPE: 400,
  ORIGIN_REJECTED: 400,
  INVALID_JSON: 400,
  INVALID_SCHEMA: 400,
  INVALID_APP_VERSION: 400,
  INVALID_CHANNEL: 400,
  INVALID_OS: 400,
  INVALID_DESCRIPTION: 400,
  INVALID_BUNDLE: 400,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  NOT_CONFIGURED: 500,
  SERVER_ERROR: 500,
}

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
}

function json(body: unknown, status = 200, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } })
}

const fail = (error: BugReportErrorCode) => json({ ok: false, error }, STATUS[error])

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function originAllowed(request: Request, env: BugReportEnv): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true // the desktop app (main process) sends no Origin
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  if (allowed.length > 0) return allowed.includes(origin)
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

function isJsonContentType(value: string | null): boolean {
  return (value ?? '').split(';')[0]!.trim().toLowerCase() === 'application/json'
}

/** Reads the body but never buffers more than `max` bytes. */
async function readCapped(request: Request, max: number): Promise<Uint8Array | 'too_large'> {
  if (!request.body) return new Uint8Array(0)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > max) {
      await reader.cancel().catch(() => undefined)
      return 'too_large'
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

const isUniqueViolation = (error: unknown) => error instanceof Error && /UNIQUE constraint failed|SQLITE_CONSTRAINT/i.test(error.message)

const defaultDeps: BugReportDeps = { now: () => Date.now(), randomId: randomReportId }

export async function handleBugReport(request: Request, env: BugReportEnv, deps: BugReportDeps = defaultDeps): Promise<Response> {
  if (request.method !== 'POST') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405, { allow: 'POST' })
  if (!originAllowed(request, env)) return fail('ORIGIN_REJECTED')
  if (!isJsonContentType(request.headers.get('content-type'))) return fail('INVALID_CONTENT_TYPE')

  const declared = request.headers.get('content-length')
  if (declared !== null && Number(declared) > MAX_BUG_REPORT_BYTES) return fail('PAYLOAD_TOO_LARGE')
  let bytes: Uint8Array | 'too_large'
  try {
    bytes = await readCapped(request, MAX_BUG_REPORT_BYTES)
  } catch {
    return fail('INVALID_JSON')
  }
  if (bytes === 'too_large') return fail('PAYLOAD_TOO_LARGE')

  let raw: unknown
  try {
    raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    return fail('INVALID_JSON')
  }
  const checked = checkBugReport(raw)
  if (!checked.ok) return fail(checked.error)

  const db = env.CMS_DB
  const bucket = env.BUG_REPORTS
  if (!db || !bucket) return fail('NOT_CONFIGURED')

  const now = deps.now()
  const ip = request.headers.get('cf-connecting-ip') ?? ''
  let reportId = ''
  let bundleKey = ''
  try {
    const ipHash = await sha256Hex(`${env.IP_HASH_SALT ?? ''}|${ip || 'unknown'}`)
    const hourAgo = now - RATE_LIMIT_HOUR_MS
    const dayAgo = now - RATE_LIMIT_DAY_MS
    await db.prepare('DELETE FROM bug_report_attempts WHERE created_at <= ?1').bind(dayAgo).run()
    const mine = await db
      .prepare('SELECT COUNT(*) AS day, COALESCE(SUM(CASE WHEN created_at > ?2 THEN 1 ELSE 0 END), 0) AS hour FROM bug_report_attempts WHERE ip_hash = ?1 AND created_at > ?3')
      .bind(ipHash, hourAgo, dayAgo)
      .first<{ day: number; hour: number }>()
    if (Number(mine?.hour ?? 0) >= RATE_LIMIT_PER_HOUR || Number(mine?.day ?? 0) >= RATE_LIMIT_PER_DAY) return fail('RATE_LIMITED')
    const all = await db.prepare('SELECT COUNT(*) AS n FROM bug_report_attempts WHERE created_at > ?1').bind(dayAgo).first<{ n: number }>()
    if (Number(all?.n ?? 0) >= GLOBAL_DAILY_MAX) return fail('RATE_LIMITED')
    await db.prepare('INSERT INTO bug_report_attempts (ip_hash, created_at) VALUES (?1, ?2)').bind(ipHash, now).run()

    const { appVersion, channel, os, description, bundle } = checked.value
    const errorCodes = JSON.stringify(extractErrorCodes(bundle))
    const workers = JSON.stringify(extractWorkers(bundle))
    // Reserve a unique id in D1 first, so an id collision can never overwrite an existing R2 bundle.
    for (let attempt = 0; attempt < ID_ATTEMPTS && !reportId; attempt++) {
      const candidate = deps.randomId()
      const key = bundleKeyFor(candidate, now)
      try {
        await db
          .prepare(
            'INSERT INTO bug_reports (id, created_at, app_version, channel, os, description, ip_hash, bundle_key, bundle_bytes, error_codes, workers) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)',
          )
          .bind(candidate, now, appVersion, channel, os, description, ipHash, key, bytes.byteLength, errorCodes, workers)
          .run()
        reportId = candidate
        bundleKey = key
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
      }
    }
    if (!reportId) return fail('SERVER_ERROR')
  } catch {
    return fail('SERVER_ERROR')
  }

  try {
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    await bucket.put(bundleKey, body, {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
      customMetadata: { reportId, receivedAt: String(now) },
    })
  } catch {
    await db.prepare('DELETE FROM bug_reports WHERE id = ?1').bind(reportId).run().catch(() => undefined)
    return fail('SERVER_ERROR')
  }
  return json({ ok: true, reportId })
}
