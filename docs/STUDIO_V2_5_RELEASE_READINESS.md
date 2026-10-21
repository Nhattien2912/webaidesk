# AI Desk Studio V2.5 — Cloud Integration & Release Readiness

Date: 2026-10-20 (Asia/Bangkok)  
Branch: `feature/website-v3-premium-light`  
Baseline HEAD: `6ef0c74f44ff54ce14128cd02b9bc6365752f975`  
Decision: **STAGING DEPLOYMENT REQUIRES OWNER APPROVAL**

## Executive status

| Area | Status | Evidence / limitation |
|---|---|---|
| Separate public/private builds and Functions | FIXED | `dist-public` and `dist-private` each embed their own `_worker.js`; scanners reject cross-target Admin/demo/local markers. |
| CMS D1 CRUD and publication | FIXED | Unit/integration tests pass; browser E2E created, persisted and published an article on an isolated local D1. |
| CMS R2 media | FIXED | Authenticated inventory/serve/upload implemented; browser E2E uploaded Unicode-alt PNG and verified persistence after refresh on isolated local R2/D1. |
| Comments and moderation | PARTIAL | Security and local integration tests pass. Remote Turnstile keys/hostname and remote end-to-end flow are not configured or verified. |
| Cloudflare Access | PARTIAL | Actual preview/production AUDs were audited. Production config contains an exact-host AUD map; staging must receive its exact deployment hostname/AUD map before enabling Admin. |
| Staging cloud resources | PARTIAL | D1 and R2 exist and preview bindings were read back. Five migrations are pending and no Pages deployment exists. |
| Production cloud resources | OPEN | No production CMS D1/R2 was created or bound; owner approval is required. |
| Public V3 responsive/SEO/routes | FIXED locally | `/`, `/blog`, `/apps`, `/roadmap` passed 390/768/1440 px checks with one H1, no horizontal overflow or 404 state. `robots.txt` and `sitemap.xml` are present. |
| Remote staging E2E | NOT VERIFIED | Intentionally blocked by the no-deploy requirement. |
| Production deployment | NOT VERIFIED | Not attempted. |

## Cloudflare inventory and changes

Account: `<CLOUDFLARE_ACCOUNT_ID>`.

- Created staging D1 `aidesk-studio-staging` (`<STAGING_D1_ID>`). It is empty; migrations were listed remotely but not applied.
- Created staging R2 `aidesk-studio-media-staging`. It is separate from `aidesk-releases`; the installer/release bucket was not modified.
- Private Pages project `aidesk-studio-private`: preview bindings `CMS_DB` and `CMS_MEDIA`; preview `ENVIRONMENT=staging`; `CMS_ADMIN_ENABLED=false`; Access team and allowed owner identity configured; `fail_open=false`; no deployment.
- Public Pages project `webaidesk`: preview received `CMS_DB` while the existing waitlist `DB` and `RELEASES` bindings were preserved. Production remained unchanged.
- Existing public production deployment remains commit `62e797084510ab478a875f788109111c86d8932b`.
- No production database/bucket was created. No production site, OAuth, installer object, or release metadata was changed.

Verified Access AUDs:

- Preview wildcard application: `17c58f607e28cee6dcb80853147aa28c402b0c4cf9628dc3e717c007089b7426`.
- Production exact-host application: `<ACCESS_AUD_TAG>`.

The application maps JWT `email` to the explicit `ACCESS_ALLOWED_IDENTITIES` allowlist, validates issuer/AUD/expiry/signature, uses an exact hostname-to-AUD map, and fails closed. Staging Admin remains disabled until its exact deployed hostname and origin are known.

## Verification results

- TypeScript: PASS.
- Oxlint: PASS.
- Unit/render/security: PASS, 191/191.
- CMS local security/integration: PASS, 49/49.
- Public and private production builds: PASS.
- V2.3/V2.4/V2.5 artifact scanners: PASS.
- `npm audit --omit=dev`: PASS, 0 vulnerabilities across production dependencies.
- Full `npm audit`: PARTIAL, 7 development-only findings (5 high, 2 moderate) in the Tailwind 3 build chain: `braces`, `chokidar`, `fast-glob`, `micromatch`, `postcss-nested`, `postcss-selector-parser`, `tailwindcss`. npm proposes Tailwind 4, a major migration; it was not applied blindly. No production dependency finding exists.
- Browser E2E: PASS locally on a newly created temporary persistence directory. Existing owner D1 local data was neither opened nor deleted.
- Remote E2E: NOT VERIFIED because nothing was deployed.

Browser E2E found and fixed two integration defects before release: a newly created editor lost its returned optimistic-lock version before publish, and Unicode alt text could not be placed directly in an HTTP header. The editor now retains the server object/version; alt text is URI-encoded client-side and strictly decoded/limited server-side.

## Open deployment preconditions

1. Approve staging deployment and remote migration application.
2. Back up/export the staging D1 immediately before migrations.
3. Deploy private staging once with Admin disabled; record the exact preview hostname.
4. Configure the exact hostname/AUD map, allowed origin, CSRF secret, media/download host allowlists, Turnstile site/secret keys and comment IP-hash secret. Do not reuse the waitlist Turnstile configuration without validating hostname/action scope.
5. Enable `CMS_ADMIN_ENABLED=true` only after Access and secrets are read back and verified.
6. The Git-connected public project still builds `npm run build` to `dist`; before any Git-driven release it must be changed to `npm run build:public` and `dist-public`, or use the prepared direct artifact deployment. This must not be changed during the current no-deploy phase.
7. Production CMS D1/R2/bindings require a separate approval after staging passes.

## Prepared commands — do not run without approval

```powershell
# Backup before migration
npx wrangler d1 export aidesk-studio-staging --remote --config wrangler.private.staging.jsonc --output artifacts/studio-v2-5-release/backups/aidesk-studio-staging-pre-migration.sql

# Inspect, then apply the five pending migrations
npx wrangler d1 migrations list aidesk-studio-staging --remote --config wrangler.private.staging.jsonc
npx wrangler d1 migrations apply aidesk-studio-staging --remote --config wrangler.private.staging.jsonc

# First private deployment stays fail-closed/Admin disabled
npx wrangler pages deploy dist-private --project-name aidesk-studio-private --branch studio-v2-5-staging

# Public preview only, never production
npx wrangler pages deploy dist-public --project-name webaidesk --branch studio-v2-5-preview
```

Rollback uses a previous Pages deployment, D1 export/time-travel recovery, and non-destructive R2 retention; see `artifacts/studio-v2-5-release/deploy-rollback.md`.

## Required remote acceptance after approval

The release is not ready for production until all items in `remote-e2e-test-plan.md` pass: Access allow/deny, exact AUD, CSRF/origin, CRUD for video/article/app, publish-to-public visibility, R2 upload/serve/persistence, comments with real Turnstile and moderation, refresh persistence, mobile/tablet/desktop public pages, error states, CSP/security headers, logs, backup and rollback rehearsal.

## Final decision

Local implementation and artifacts are ready for an owner-reviewed **staging-only** deployment. Cloud staging is provisioned but deliberately fail-closed and not deployed. Production is **not ready** and **not authorized**. Stop here for independent Claude audit and explicit deployment approval.
