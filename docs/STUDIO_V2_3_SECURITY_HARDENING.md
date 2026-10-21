# AI Desk Studio V2.3 — Final Security Hardening Before Staging

Date: 2026-10-19. Branch/HEAD at start: `feature/website-v3-premium-light` / `6ef0c74f44ff54ce14128cd02b9bc6365752f975`. No commit, push, merge, deploy, production Cloudflare mutation, release-bucket mutation, or owner D1 reset was performed.

## Evidence boundary

- Baseline checkpoint: `C:\Users\clubb\Desktop\WedAiDesk-checkpoints\studio-v2-3-security-baseline-20261019.zip` (32,709,822 bytes).
- Interrupted-work checkpoint: `C:\Users\clubb\Desktop\WedAiDesk-checkpoints\studio-v2-3-in-progress-20261019-1819.zip` (32,739,652 bytes).
- Baseline hash manifest: `artifacts/studio-v2-3-security/baseline-sha256.txt` (296 files).
- E2E D1 was isolated at `%LOCALAPPDATA%\Temp\aidesk-v23-e2e-20261019-2108`; the owner's `.wrangler/state/cms-v2-1` was neither used nor deleted.
- Staging/production Cloudflare configuration, Access policy/MFA, WAF, Turnstile hostname, D1/R2 bindings, backup restore, and purge behavior remain **NOT VERIFIED**.

## Finding disposition

| Finding | Status | Change/evidence |
|---|---|---|
| STUDIO-17 content data validation | **FIXED** | Per-kind validation covers every allowlisted key; canonical HTTPS parsing rejects controls, credentials and noncanonical values; image/download hosts are explicit env allowlists; gallery is bounded and validates every element; media IDs must be UUIDs and exist in `cms_media`. Authenticated `GET /api/admin/security/url-audit` reports legacy rows without deleting them. |
| STUDIO-18 stale public cache | **FIXED** | Public content list/detail now return `Cache-Control: no-store`. Browser E2E observed publish, update and archive immediately, with final API 404 after archive. |
| STUDIO-10 retention/orphans | **PARTIAL** | Authenticated `POST /api/admin/media/cleanup` accepts only `{dryRun:true}`, lists max 500 old unreferenced rows, reports rate-limit rows and writes an audit event; it deletes zero objects. Retention is configurable 7–365 days. Scheduled execution, R2↔D1 reconciliation and deletion remain intentionally unimplemented until staging bindings/backup drills exist. |
| STUDIO-04 Markdown | **FIXED** | Regex sanitizer removed. Source is normalized and rendered by maintained `react-markdown` + `remark-gfm`; raw HTML is skipped, image rendering is disabled, and link schemes are transformed to relative/fragment/HTTPS/mailto only. Browser payload `<script>` did not render and `javascript:` did not survive as an executable link. |
| STUDIO-05 image upload | **PARTIAL** | Server ignores client dimension headers, parses dimensions from bytes, checks complete PNG/JPEG/WebP container boundaries, caps bytes/pixels, compensates R2/D1/audit failures, and serves with `nosniff` + sandbox CSP. It does not fully decode/re-encode pixels; therefore public media serving/upload enablement remains a production blocker. |
| STUDIO-03 error mapping | **FIXED** | Syntax/body/DB paths are separated; duplicate active kind+slug maps to `409 slug_conflict` for create and update; unexpected DB errors are generic 500 with request-scoped structured log. Real D1 integration test covers create and update collision. |
| STUDIO-08 comment spam | **FIXED in app layer** | NFKC normalization plus maintained `linkify-it` detects Unicode/fuzzy/bare domains, including prior bypass forms. Turnstile and D1 rate limiting remain. Edge WAF/rate rule is **NOT VERIFIED**. |
| STUDIO-19 auth disclosure | **FIXED** | JWT/library exception text is never returned. Responses use `access_invalid`, `access_forbidden`, or `access_not_configured`; structured logs contain category only. |
| STUDIO-20 Admin environment gate | **FIXED** | Server accepts only exact `staging` or `production`; local harness deliberately uses staging semantics and remains outside Pages Functions bundle. Gate still defaults disabled. |
| STUDIO-21 artifact scanner | **FIXED** | Scanner compiles Pages Functions with Wrangler and scans both `dist` and actual Function bundle for local/test identities, secrets, harnesses and placeholders. It validates staging defaults to disabled. |
| 390 px overflow | **FIXED (code), browser viewport NOT VERIFIED** | Scoped table screen-reader header no longer escapes the scroll container; table wrapper/card receive explicit mobile width/min-width constraints. Exact 390 px emulation was unavailable in the in-app browser session. |

## Retention design (no destructive execution in V2.3)

The future scheduled worker should: (1) acquire a single-run lease in D1; (2) delete rate-limit rows older than 24 hours; (3) rotate/remove comment `abuse_key` after the documented privacy window; (4) claim orphan candidates older than retention in a transaction; (5) re-check references immediately before each R2 delete; (6) delete R2 first, then soft-delete D1, recording success/failure; (7) release or expire claims after partial failure. Every run must emit counts, byte totals and bounded IDs, never tokens, raw IPs or secrets. V2.3 exposes only a dry run so races and rollback cannot destroy data.

## Dependency audit

`npm audit` reports 7 development-only findings: `tailwindcss` (direct), with transitive `chokidar`, `fast-glob`, `micromatch`, `braces`, `postcss-nested`, and `postcss-selector-parser` (5 high, 2 moderate). These packages run in the local build toolchain and are absent from `npm audit --omit=dev`, which reports 0 vulnerabilities. No blind major upgrade was applied. New runtime dependencies (`react-markdown`, `remark-gfm`, `linkify-it`) are covered by typecheck, render tests, CMS tests, production build and browser E2E.

## Verification

- `npm run typecheck`: PASS.
- `npm run lint`: PASS, zero warnings.
- `npm test`: PASS 186/186.
- `npm run cms:test:local`: PASS 47/47 against isolated real D1/workerd.
- `npm run build`: PASS; Vite warning only for a 648 kB chunk.
- artifact scanner: PASS for static assets and compiled Pages Functions.
- `npm audit --omit=dev`: PASS, 0 vulnerabilities.
- `git diff --check`: PASS (Git emitted only existing LF→CRLF working-copy notices).
- Browser E2E: PASS for draft save + refresh persistence, publish, safe Markdown rendering, comment submit/pending/approve/public visibility, published update without stale API data, archive with immediate public removal, and disabled-gate `/admin` returning 404. Exact 390 px viewport is NOT VERIFIED.

## Release gates

Local is **GO**. Staging remains **CONDITIONAL GO** only after distinct real D1/R2/AUD/secrets are provisioned, Access covers `/admin`, `/admin/*`, `/api/admin`, `/api/admin/*` with MFA, real Turnstile hostname is tested, and placeholders are removed. Production remains **NO-GO** until staging E2E, WAF/rate rules, backup/restore plus RTO/RPO drill, image decode/re-encode or disabled public media, and the scheduled retention/reconciliation job are verified.

Stop point: ready for independent Claude audit. No deployment was attempted.
