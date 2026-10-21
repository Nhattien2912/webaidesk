# AI Desk Studio private — Cloudflare deployment report

Date: 2026-10-21 (Asia/Bangkok)

## Verdict

**BLOCKED — EXTERNAL ACTION REQUIRED.** No new private Studio deployment was made.

The local Studio build and security regression suite pass, and the current production hostname is intercepted by Cloudflare Access before the origin. Deployment is nevertheless prohibited by the approved gate: the authenticated CLI session cannot read the Zero Trust organization/policies needed to prove the exact owner-only, Google IdP and MFA configuration, and the existing Pages production environment has no production D1/R2/environment bindings. Only staging data resources exist. A 302 redirect to Access is not evidence of the required policy semantics.

The public `webaidesk` Pages project, DNS, desktop application repository, updater metadata and release objects were not changed.

## Source safety and checkpoint

- Repository: `C:\Users\clubb\Desktop\WedAiDesk`
- Starting HEAD: `6ef0c74f44ff54ce14128cd02b9bc6365752f975`
- Dirty and untracked work was preserved; no reset, clean, checkout, force push or destructive operation was run.
- Recoverable checkpoint: `C:\Users\clubb\Desktop\WedAiDesk-checkpoints\studio-private-direct-deploy-20261021-140257`
- Git bundle SHA-256: `899FD85DA43EC3DA9247D4E1F3792FE3E48B151AA33611542DB9A78111A1983D`
- Working-tree patch SHA-256: `63090C9B557158A3EA19A6EF19DE4FBC8B703DAFC42986C4402C318C4717D03A`
- Untracked-file inventory SHA-256: `9032A8B54D9A408FE302DA23AD775DA08510C8FD7AA50842A45FD435516DB14D`

## Cloudflare account and Pages evidence

- `wrangler whoami` authenticated via OAuth as `<OWNER_EMAIL>`.
- Exactly one visible account: `<CLOUDFLARE_ACCOUNT_ID>`.
- The token lists Pages, Workers, D1 and related write scopes, but no Access/Zero Trust policy read scope.
- Existing Pages project: `aidesk-studio-private`.
- Pages hostname: `aidesk-studio-private.pages.dev`.
- Production branch: `feature/website-v3-premium-light`.
- `wrangler pages deployment list --project-name aidesk-studio-private --json` returned `[]`.
- The Pages project API returned `latest_deployment_id: null`; therefore no immutable deployment ID could be established as a tested rollback target in this session. The apparent existing live hostname must not be treated as a known rollback deployment without Dashboard confirmation.

Sanitized Pages configuration read from the API:

| Environment | Environment variable names | D1 bindings | R2 bindings |
| --- | --- | --- | --- |
| Preview | `ACCESS_ALLOWED_IDENTITIES`, `ACCESS_TEAM_DOMAIN`, `CMS_ADMIN_ENABLED`, `ENVIRONMENT` | `CMS_DB` | `CMS_MEDIA` |
| Production | none | none | none |

No secret values were read into this report.

## Access and identity reconciliation

Observed against account `<CLOUDFLARE_ACCOUNT_ID>`:

- `GET /accounts/{account}/access/apps`: HTTP 200, empty result.
- `GET /accounts/{account}/access/identity_providers`: HTTP 200, empty result.
- `GET /accounts/{account}/access/organizations`: HTTP 403, Cloudflare error code `10000` (`Authentication error`).
- Team JWKS endpoint `https://<ACCESS_TEAM>.cloudflareaccess.com/cdn-cgi/access/certs`: HTTP 200 with two keys.
- Unauthenticated requests to `/`, `/admin` and `/api/admin/content` on the private hostname each returned HTTP 302 to `<ACCESS_TEAM>.cloudflareaccess.com`.
- The redirect carries audience `<ACCESS_AUD_TAG>`.

Classification: **INSUFFICIENT_PERMISSION**, not `EMPTY`. The team domain, live interception and JWKS prove that an Access organization/application exists somewhere in the effective configuration, while the same OAuth credential cannot enumerate the organization. Consequently, the empty app/IdP collections cannot safely be interpreted as deleted resources or as the authoritative organization state.

Not proven and therefore blocking:

- exact application coverage for the production hostname and every preview hostname;
- policy `AI Desk Studio - Owner Only` contains only `<OWNER_EMAIL>` and has no broad Allow, Everyone, Bypass or service-token path;
- Google is the effective IdP for the application;
- MFA is independently required by policy;
- an actual owner login receives a valid Access JWT and an unapproved Google identity is denied;
- the issuer/audience presented after login matches the server-side production configuration.

## D1, R2, migrations and data safety

The current account inventory contains:

- D1 `aidesk-studio-staging` (`<STAGING_D1_ID>`)
- D1 `aidesk-waitlist-preview`
- R2 `aidesk-studio-media-staging`
- R2 `aidesk-releases`

No dedicated production Studio D1 database or production Studio media bucket is visible. The release bucket is not a CMS media target. This task did not bind production to staging because explicit authorization for that data-environment change was not provided.

The five previously applied staging migrations were preserved. Existing pre/post migration backups remain at `C:\Users\clubb\Desktop\WedAiDesk-checkpoints\website-v3-r2-studio-20261021-124754\d1`:

- pre-migration SQL SHA-256: `12B4D609D563571A2BBE9615DADD52FA835EE6F0E29CDF77EF6C64CA8EC3CB68`
- post-migration SQL SHA-256: `0752929FF9354550057E1C6C49A0C57056BD21250AC0EB1CE50FA83793B6753D`

A fresh migration-list command could not run from the repository root because there is deliberately no default Wrangler configuration file there; no migration was attempted or changed. Previous verified evidence remains the basis for the five applied migrations.

## Build and test evidence

`npm run check` completed successfully:

- TypeScript typecheck: pass
- lint: pass
- automated tests: **202 passed, 0 failed**
- public build: pass
- private Studio build: pass
- isolated Pages Functions build: pass
- `security:check-v2.5`: pass (`no public Admin`, no private demo data, no local markers or source maps)

The suite includes Access JWT signature/issuer/audience/expiry and owner-identity rejection, fail-closed admin API behavior, Origin/CSRF enforcement, draft/public filtering, media validation, D1 transactional revision/audit behavior, moderation, Turnstile fail-closed behavior, and cross-kind CMS authorization. These are local automated results, not claims of live owner-login or live production D1/R2 verification.

Live unauthenticated checks:

- private `/`, `/admin`, `/api/admin/content`: HTTP 302 to Access;
- public `/api/admin`: HTTP 404;
- public `/admin`: HTTP 200 SPA fallback, while the built-artifact security scanner confirms the public worker contains no Admin implementation or private Studio imports/routes.

## Why deployment stopped

All mandatory gates were required to pass before a direct upload. They did not:

1. Access policy, IdP, MFA and preview coverage cannot be authoritatively read with the current credential.
2. Production D1 and R2 bindings do not exist in the Pages configuration.
3. Only staging Studio data resources are present, and using them for production requires explicit approval.
4. Production audience/origin/CSRF/Turnstile secret configuration cannot be verified from the current production config.
5. Owner login and unauthorized-identity rejection cannot be independently exercised without the verified Access policy and an authorized browser identity.

No `wrangler pages deploy` command was run. There is therefore no new deployment ID or deployment timestamp and no rollback action is necessary for this task.

## Exact external actions required

In Cloudflare Dashboard, while signed into account `<CLOUDFLARE_ACCOUNT_ID>`:

1. Go to **Zero Trust → Access → Applications**. Export or capture the application configuration covering `aidesk-studio-private.pages.dev` and the intended preview hostname pattern. Confirm no hostname is left outside Access.
2. Open policy **AI Desk Studio - Owner Only**. Confirm the only Allow identity is exact email `<OWNER_EMAIL>`; remove/deny any Everyone, broad domain, Bypass or unintended service-token rule. Confirm MFA is required as an independent rule.
3. Go to **Settings → Authentication → Login methods** and confirm the application uses the valid Google IdP. Perform one owner login and one unauthorized-account rejection test.
4. Create a narrowly scoped API token with read access for Access applications, policies, identity providers and the Zero Trust organization, or supply sanitized Dashboard exports/screenshots so these gates can be independently reconciled. Do not create a duplicate app or IdP.
5. Choose the production data environment explicitly: create dedicated production D1/R2 resources (recommended) or explicitly authorize reuse of `aidesk-studio-staging` and `aidesk-studio-media-staging`. No choice was assumed here.
6. Add the production Pages bindings and production secrets/variables for exact Access team domain, exact audience/hostname map, exact allowed owner, allowed origin, CSRF secret, CMS enablement and any required Turnstile secret/allowed host/action settings. Secret values must be entered through Cloudflare secret controls and must not be committed.
7. Re-run remote migration/backup checks, D1/R2 read-write probes, owner login, unauthorized rejection, draft save/reload/publish, media/app management, moderation and audit logging. Only after all pass should `dist-private` plus the isolated private Functions bundle be deployed to the existing `aidesk-studio-private` project.
8. Before deployment, identify and record the current immutable deployment ID in Dashboard. After deployment, retain both old and new IDs; rollback means promoting/redeploying that recorded prior immutable deployment, not rebuilding from an unverified tree.

## Remote changes

None. No Pages deployment, Access/IdP/policy change, D1/R2 creation or mutation, migration, secret change, DNS change, release-object change, or public-site deployment was performed.
