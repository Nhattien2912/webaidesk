# AI Desk Website V3 — Public R2 & Studio Deployment Report

Date: 2026-10-21 (Asia/Bangkok)

## Final verdict

- **PUBLIC WEBSITE: DEPLOYED VERIFIED** — production deployment `4e2daed1-0dd5-4d90-86cc-9d652538ec73` is live at `https://webaidesk.pages.dev/`.
- **PRIVATE STUDIO: EXTERNAL ACTION REQUIRED** — staging D1 is migrated, but Studio was not deployed because the Cloudflare account currently has zero Access applications and zero identity providers. Deploying it would violate the owner-only/fail-closed gate.

## Source and checkpoint

- Repository: `C:\Users\clubb\Desktop\WedAiDesk`
- Branch/HEAD at deployment: `feature/website-v3-premium-light` / `6ef0c74f44ff54ce14128cd02b9bc6365752f975`.
- The worktree was already dirty and two commits ahead of `origin/main`; no reset, clean, commit, push or force-push was performed.
- Recoverable pre-change checkpoint: `C:\Users\clubb\Desktop\WedAiDesk-checkpoints\website-v3-r2-studio-20261021-124754` (repository bundle, tracked binary patch, status, untracked inventory and source snapshot).
- Final public artifact manifest SHA-256: `580cde3bd2ef71e891d503df2773474f4be981618d7da32a51a46c7eaf9f6902`.

Files changed in this milestone:

- `src/lib/directDownload.ts`: typed authoritative website-only V0.3/V0.2 metadata; desktop update metadata remains untouched.
- `src/components/DownloadSection.tsx`, `src/pages/DownloadPage.tsx`: V0.3 CTA/facts/checksum, unsigned/Beta caveats, explicit V0.2 unavailable state, no silent fallback, mobile overflow fix.
- `src/components/Hero.tsx`, `src/data/publicAlphaRelease.ts`, `src/pages/InstallPage.tsx`, `src/pages/PromptsPage.tsx`, `src/content/prompts/index.ts`: consistent V0.3 user-facing copy.
- `functions-public/api/[[path]].ts`: fail-closed JSON 404 for unmatched public API paths, including `/api/admin/*`.
- `tests/render.test.ts`, `tests/publicAlphaDownload.test.ts`: V0.3 metadata and V0.2-unavailable regressions.
- This report.

All other pre-existing dirty and untracked files were preserved.

## Cloudflare inventory

- Authenticated owner: `<OWNER_EMAIL>`.
- Account ID: `<CLOUDFLARE_ACCOUNT_ID>`.
- Public Pages project: `webaidesk`, Git-connected, domain `webaidesk.pages.dev`.
- Private Pages project: `aidesk-studio-private`, direct-upload project, domain `aidesk-studio-private.pages.dev`.
- R2: `aidesk-releases` and `aidesk-studio-media-staging`.
- D1: `aidesk-studio-staging` (`<STAGING_D1_ID>`) and unrelated waitlist preview DB.

## Release objects and download evidence

Cloudflare R2 reports `aidesk-releases` with `object_count: 1`, bucket size about 120 MB.

### V0.3 — verified latest website download

- Object key / filename: `BoCaiDatAIDesk 0.3 Beta.rar`.
- Public URL: `https://pub-afeeb98d61ba4ab4b97137b6b1bdf3c0.r2.dev/BoCaiDatAIDesk%200.3%20Beta.rar`.
- HEAD: HTTP 200 over TLS; `Content-Type: application/x-compressed`; `Content-Length: 120629335`; ETag `e12e1e9228524251e280f5b76bd0ea32`.
- `Content-Disposition` is absent on the direct R2 response. The website uses a filename-aware download link, but the bucket object was not rewritten because the request forbids overwrite/re-upload.
- Downloaded bytes: 120,629,335.
- SHA-256 computed from the downloaded live object: `666eb793899160acaf40d7961fc2fb4544836b22f24a4b95abbee790af4dac03`.
- No separate Installer or Portable object exists. The website truthfully offers only the RAR archive.
- The archive remains explicitly marked unsigned. No Microsoft signing, antivirus certification, production validation or packaged-GUI E2E claim is made. A local RAR integrity tool was unavailable, so archive-structure validation is not claimed.

### V0.2 — remote blocker

- Expected previous key from prior reviewed metadata: `BoCaiDatAIDesk 0.2Beta.rar`.
- Expected prior URL: `https://pub-afeeb98d61ba4ab4b97137b6b1bdf3c0.r2.dev/BoCaiDatAIDesk%200.2Beta.rar`.
- Current remote result: HTTP 404; it is absent from the bucket inventory, which contains only the V0.3 object.
- No V0.2 object was deleted, overwritten or re-uploaded in this milestone.
- The live page preserves V0.2 under “Phiên bản trước” but disables download and states the exact R2 404 instead of fabricating a working link or silently falling back.
- Owner action required: restore the original V0.2 object under the verified key (without replacing V0.3), then re-verify size/hash before enabling the old-download link.

The desktop updater catalog/feed (`server/releaseData.ts`, `/api/updates/*`) was not modified.

## Public website completion and deployment

- V0.3 is shown as latest in Hero, Download, Install and prompt compatibility copy.
- V0.2 is separated under previous versions with an unavailable state based on live evidence.
- Existing Premium Light pages, public CMS views, safe Markdown renderer, CMS video integration, CSP changes, editors and public-content stylesheet were retained.
- Mobile regression found during real-browser QA: `/download` had `scrollWidth 488` at 390 px because the prior-version SHA line could not shrink. Fixed with `min-width: 0` and word breaking; retest is `scrollWidth 375` at viewport width 390.
- Public `/admin` renders the normal “Không tìm thấy trang” view and contains no Studio UI. `/api/admin/dashboard` and all unmatched `/api/*` routes return JSON 404 with `no-store` and `nosniff`.
- Production CSP is present. HTML uses `public, must-revalidate, max-age=0`; release API failure remains `no-store`.

Deployment:

- Project: `webaidesk`.
- Branch: `main` direct artifact deployment; no Git push.
- Final deployment ID: `4e2daed1-0dd5-4d90-86cc-9d652538ec73`.
- Immutable deployment URL: `https://4e2daed1.webaidesk.pages.dev`.
- Production URL: `https://webaidesk.pages.dev/`.
- Wrangler records source HEAD `6ef0c74`; the exact dirty artifact is identified by the artifact manifest SHA-256 above.

Live browser verification at 390 px confirms the V0.3 heading/link/checksum, explicit V0.2 404 state, one H1, no horizontal overflow, and no Studio UI at `/admin`.

## D1/R2 migration safety

- Staging D1 identity matched both Wrangler config and Cloudflare inventory before migration.
- Pre-migration export: `C:\Users\clubb\Desktop\WedAiDesk-checkpoints\website-v3-r2-studio-20261021-124754\d1\aidesk-studio-staging-pre-migration.sql`.
- Pre-migration backup SHA-256: `12b4d609d563571a2bbe9615dadd52fa835ee6f0e29cdf77ef6c64ca8ec3cb68`.
- Applied remotely to staging only: `0001_waitlist.sql` through `0005_mutation_integrity.sql`.
- `wrangler d1 migrations list` reports no pending migrations. `d1_migrations` records all five, applied at 2026-10-21 05:52:35–05:52:37 UTC.
- Schema query returned 15 tables including CMS content, revisions, audit, media, comments and rate limits.
- D1 rejected `PRAGMA integrity_check` through the remote API with `SQLITE_AUTH`; this is recorded rather than treated as a pass. Ordinary schema and migration queries succeeded.
- Post-migration export SHA-256: `0752929ff9354550057e1c6c49a0c57056bd21250ac0eb1ce50fa83793b6753d`.
- No production D1/R2 CMS resource was created or migrated. No R2 object was mutated.

## Private Studio and security verdict

Actual Cloudflare state:

- `aidesk-studio-private` has staging D1/R2 bindings only in its preview configuration; production bindings are absent.
- Preview `CMS_ADMIN_ENABLED` remains false.
- Cloudflare Access API returns zero applications and zero identity providers for the account. Therefore the historical AUD values/config cannot be treated as live protection evidence.
- No live Google IdP, exact owner-only Access policy, preview-host coverage, MFA enforcement, live Access JWT, real Turnstile secret/hostname scope or Studio production secrets could be verified.

Because deny-by-default Access could not be proven, no private Pages deployment was made and no Admin endpoint was exposed. Local tests continue to verify signature/issuer/audience/expiry/owner identity rejection, CSRF, validation, XSS defenses, Turnstile decision handling, D1 rate limiting, IP hashing, R2 upload rules and audit behavior, but these are not represented as live Cloudflare Access/Turnstile evidence.

## Test evidence

- TypeScript: PASS.
- Oxlint: PASS.
- Automated tests: PASS, 202/202.
- Public/private frontend and isolated Functions builds: PASS.
- V2.5 separation scanner: PASS.
- Production artifact scanner: PASS.
- Real-browser local responsive matrix: `/`, `/download`, `/blog`, `/apps`, `/tutorials`, 404 at 390/768/1440; one H1 per page; no overflow after the `/download` fix.
- Live browser: V0.3 and V0.2-unavailable state PASS; `/admin` Not Found PASS.
- Live API boundary: `/api/admin/dashboard` and unknown API route return JSON 404 PASS.
- Live V0.3 object: HEAD and full-byte SHA-256 PASS.
- Live V0.2 object: FAIL/EXTERNAL — HTTP 404, absent from bucket inventory.

## Remaining issues and genuine owner actions

1. Restore the original V0.2 R2 object, then provide or permit verification of its actual size and SHA-256 before its link is re-enabled.
2. Create/configure Cloudflare Access for `aidesk-studio-private.pages.dev` and every preview hostname, add the Google IdP, exact `<OWNER_EMAIL>` allow policy and independent MFA; verify deny-by-default first.
3. Configure the private project’s exact hostname-to-AUD map, D1/R2 production/preview bindings, CSRF/origin/IP-hash/Turnstile secrets and allowed hosts. Do not enable `CMS_ADMIN_ENABLED` until live allow/deny tests pass.
4. Run remote owner and unauthorized Access E2E, then real Studio CRUD/publish/version/video/comment/audit/media-upload flows. Only then deploy the private Studio.
5. Production public CMS content/media is not bound: public production currently has the release bucket but no production `CMS_DB`/`CMS_MEDIA`. Published staging content and covers cannot be claimed live until a reviewed production CMS architecture/resource decision is made.
6. Consider adding R2 `Content-Disposition` through a non-mutating delivery layer or an authorized metadata update; it is currently absent from the direct response.

No desktop repository, installer, updater feed, release manifest, native binary, DNS, payment or licensing state was changed.
