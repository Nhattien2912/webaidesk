# AI Desk V3 release archive and Access reconciliation

Date: 2026-10-21 (Asia/Bangkok)

## Executive status

- **PUBLIC DOWNLOADS — PARTIAL / EXTERNAL ARTIFACT REQUIRED.** V0.3 remains live and byte-verified as a RAR5 archive. V0.2 is absent from every R2 bucket visible to the only authorized Cloudflare account and its former URL returns 404. The website already labels V0.2 unavailable and was not redeployed.
- **PRIVATE STUDIO — NOT DEPLOYED / EXTERNAL ACTION REQUIRED.** Cloudflare Access is demonstrably enforcing the production `pages.dev` hostname and its login page offers Google, correcting the prior unsupported conclusion that Access was empty. The current OAuth token cannot read the Zero Trust organization and therefore cannot independently verify the owner-only policy or MFA. The Pages production environment also has no Studio D1/R2 bindings or required server-side authorization variables/secrets. Deployment was stopped fail-closed.

## Safety and recovery

- Branch/HEAD remained `feature/website-v3-premium-light` / `6ef0c74`; the pre-existing dirty worktree was preserved.
- New recoverable checkpoint: `C:\Users\clubb\Desktop\WedAiDesk-checkpoints\release-access-reconcile-20261021-130609`.
- Checkpoint SHA-256 values: repository bundle `899fd85da43ec3da9247d4e1f3792fe3e48b151aa33611542db9a78111a1983d`; tracked binary patch `3966983d0c5f80cbc6b8e34436b7145681e871df90382c4bc46f63d803a3ac99`; workspace source tar `07d0e743a9eedaff669c6f501d1d2931ee736d1b80aae9c2cbd38678bac858e8`.
- No desktop AI Desk source or release binary was changed. No reset, clean, force push, DNS change, release deletion, destructive migration, Access/IdP creation, public deployment or private deployment was performed.

## A. Release archive reconciliation

### Authorized scope inspected

`wrangler whoami` authenticated as `<OWNER_EMAIL>`. `GET /accounts` returned exactly one authorized account, ID `<CLOUDFLARE_ACCOUNT_ID>`. Its complete R2 bucket inventory was:

1. `aidesk-releases`
2. `aidesk-studio-media-staging`

The object listing for both buckets was inspected without a prefix filter. `aidesk-studio-media-staging` was empty. `aidesk-releases` contained one object only: `BoCaiDatAIDesk 0.3 Beta.rar`. There was no alternate bucket or object prefix containing V0.2.

Historic website metadata and commit `1b77347` identify the original V0.2 artifact exactly:

- key/file: `BoCaiDatAIDesk 0.2Beta.rar`
- expected size: `120,193,516` bytes
- expected SHA-256: `f482fc4510ae80dbabe09a9665f012b110fbb6cf0d1e18a4e4ccd8153f8681b1`
- former URL: `https://pub-afeeb98d61ba4ab4b97137b6b1bdf3c0.r2.dev/BoCaiDatAIDesk%200.2Beta.rar`
- current HTTP result: `404 Not Found`

**Exact owner artifact required:** the original `BoCaiDatAIDesk 0.2Beta.rar` whose byte length is `120,193,516` and SHA-256 is `f482fc4510ae80dbabe09a9665f012b110fbb6cf0d1e18a4e4ccd8153f8681b1`. A differently named or differently hashed archive is not a verified substitute. V0.3 must not be renamed or substituted for it.

### V0.3 archive verification

- public URL: `https://pub-afeeb98d61ba4ab4b97137b6b1bdf3c0.r2.dev/BoCaiDatAIDesk%200.3%20Beta.rar`
- R2 key: `BoCaiDatAIDesk 0.3 Beta.rar`
- HTTP status: `200`
- R2/HTTP length: `120,629,335` bytes
- ETag: `e12e1e9228524251e280f5b76bd0ea32`
- downloaded SHA-256: `666eb793899160acaf40d7961fc2fb4544836b22f24a4b95abbee790af4dac03`
- first bytes: `52 61 72 21 1A 07 01 00`, the RAR5 signature
- extension: `.rar`, consistent with the payload
- Content-Type: `application/x-compressed` (generic legacy compressed-file type, not the RAR-specific `application/vnd.rar`)
- Content-Disposition: absent

The object is a real RAR5 archive and the live bytes match the website checksum. The URL filename still causes a normal browser download name, but the HTTP metadata is not fully explicit: `Content-Disposition: attachment; filename="BoCaiDatAIDesk 0.3 Beta.rar"` is missing and the type is generic. The live object was not overwritten because doing so solely to replace metadata would unnecessarily risk the working V0.3 download. This metadata should be corrected through a reviewed R2 metadata-preserving operation and then re-downloaded and re-hashed.

The local website roots contain no V0.3 desktop installer, portable archive or desktop ZIP that could be confused with this RAR. ZIP files found under `artifacts/` are small website/Studio deployment bundles (`public-v3-preview.zip`, `private-studio-staging.zip`, assets and migrations), not AI Desk desktop releases. No desktop repository was searched or modified beyond the website metadata already in scope.

### Public website decision

Current copy correctly calls the file `0.3 Beta` and `RAR`, shows the verified size/checksum, and explicitly marks V0.2 unavailable. Automated regressions confirm it does not silently substitute V0.3 for V0.2. No label correction was needed, so no public redeployment was performed. The existing V0.3 live download was left intact.

## B. Cloudflare account and Access reconciliation

### Account and ownership evidence

- authenticated Wrangler identity: `<OWNER_EMAIL>`
- authorized accounts: one
- account ID: `<CLOUDFLARE_ACCOUNT_ID>`
- Pages projects in that account: `webaidesk` and `aidesk-studio-private`
- private project hostname: `aidesk-studio-private.pages.dev`
- private project production branch: `feature/website-v3-premium-light`
- current private project deployments: none (`wrangler pages deployment list ... --json` returned `[]`)

This rules out `WRONG_ACCOUNT` for the Pages/R2 resources that were inspected.

### Why the earlier “zero apps / zero IdPs” result is not authoritative

With the Wrangler OAuth token:

- `GET /accounts/{id}/access/apps` returned HTTP 200 and an empty result.
- `GET /accounts/{id}/access/identity_providers` returned HTTP 200 and an empty result.
- both Zero Trust organization endpoints returned HTTP 403, Cloudflare error `10000`, `Authentication error`.
- `wrangler whoami` lists no Access read/write scope.

At the same time, independent edge evidence proves that an Access application exists:

- unauthenticated GETs to `/`, `/admin`, and `/api/admin/content` on `aidesk-studio-private.pages.dev` all return `302` to `<ACCESS_TEAM>.cloudflareaccess.com/cdn-cgi/access/login/...` before application code runs;
- the redirect metadata names the exact hostname and audience tag `<ACCESS_AUD_TAG>`;
- `https://<ACCESS_TEAM>.cloudflareaccess.com/cdn-cgi/access/certs` returns HTTP 200 with the Cloudflare Access JWKS;
- the rendered Access sign-in page is HTTP 200, titled `Sign in ・ Cloudflare Access`, and offers Google authentication.

Therefore the correct classification is:

- `EMPTY`: disproven for the production hostname by live Access enforcement.
- `WRONG_ACCOUNT`: disproven for Pages/R2 by the single-account inventory; Zero Trust ownership cannot be separately enumerated with this token.
- `INSUFFICIENT_PERMISSION`: confirmed for full Zero Trust reconciliation (403/10000 plus no Access scope).
- `API_UNAVAILABLE`: the Cloudflare OpenAPI/docs connector returned internal errors during this run, but the direct Cloudflare REST API and edge endpoints were available; this is not the primary blocker.

The policy display name `AI Desk Studio - Owner Only`, its exact email rule, MFA settings and preview-wildcard application cannot be asserted from the available API credentials. The Google button proves the login method is offered, not that `<OWNER_EMAIL>` is the only identity allowed after login or that MFA is required.

### Required Dashboard verification

Using an administrator account for Cloudflare account `<CLOUDFLARE_ACCOUNT_ID>`:

1. Open **Zero Trust → Access controls → Applications**. Locate the application protecting `aidesk-studio-private.pages.dev`; confirm its AUD equals `<ACCESS_AUD_TAG>` and record its application ID without changing it.
2. Confirm the attached Allow policy is exactly `AI Desk Studio - Owner Only`, has an **Include → Emails** rule for only `<OWNER_EMAIL>`, and has no broad email-domain, Everyone, Bypass or service-token rule that grants Studio access.
3. Open the application/policy MFA settings. Confirm independent MFA is enabled and not overridden with **Disable MFA**. For strict enforcement choose **Custom MFA settings** and an approved authenticator; optionally set authentication duration to **Require every login**. A Google social IdP does not supply an Access `auth_method=mfa` claim for the IdP-based policy selector, so use Access independent MFA for this Google configuration.
4. Open **Zero Trust → Integrations → Identity providers** and confirm the existing Google provider is healthy. Do not create a duplicate. Test the provider, then complete an actual owner login and confirm the Access JWT email is `<OWNER_EMAIL>`.
5. In **Workers & Pages → aidesk-studio-private → Settings → General**, enable/review the preview Access policy. Cloudflare Pages uses a separate Access application for `*.aidesk-studio-private.pages.dev`; verify both the production hostname and preview wildcard are protected. There are currently no preview deployments to probe directly.
6. Issue an API token with least privilege `Access: Apps and Policies Read` and Zero Trust organization/identity-provider read access, then repeat the API inventory. Do not grant write access unless a reviewed change is required.

## C. Private Studio readiness

The existing `aidesk-studio-private` project was retained; no second CMS was created.

### Staging data and bindings

- D1 `aidesk-studio-staging`, ID `<STAGING_D1_ID>`, remains available.
- `wrangler d1 migrations list` reports no pending migrations; all five existing migrations remain applied.
- The previous pre/post-migration backups remain unchanged.
- Preview configuration currently exposes only variable names `ACCESS_ALLOWED_IDENTITIES`, `ACCESS_TEAM_DOMAIN`, `CMS_ADMIN_ENABLED`, `ENVIRONMENT`; D1 binding `CMS_DB`; R2 binding `CMS_MEDIA`.
- Production configuration has no Studio environment variables, no D1 binding and no R2 binding.

The server requires an exact-host `ACCESS_AUDIENCE_MAP` (or `ACCESS_AUD`) to validate the Access AUD, and mutation protection requires `CMS_ALLOWED_ORIGINS` and `CMS_CSRF_SECRET`. Those are absent from the inspected preview variable names. Additional hostname/media/Turnstile secrets required by the shipped CMS environment were also not independently verified. Deploying now would either fail closed with `access_not_configured` or be operationally incomplete.

### Authentication implementation evidence

Local production code validates the Cloudflare JWT with RS256 against `https://<ACCESS_TEAM>.cloudflareaccess.com/cdn-cgi/access/certs`, checks exact issuer, exact per-host audience, expiry through JWT verification, `sub`, and lower-cased owner email. It denies missing config, missing/invalid/expired/wrong-audience tokens and non-owner identities. Mutations additionally require an allowlisted Origin and a server-derived CSRF token. Local tests use generated test keys only and are not represented as live authentication.

No fake JWT, disabled authorization or bypass was deployed.

## D. Test evidence

### Automated/local

- `npm run check`: PASS.
- TypeScript, lint, public/private builds and isolated function builds: PASS.
- Security artifact verification: PASS; public artifact contains no Admin code/routes and private artifact contains no demo/local bypass markers.
- Full suite: **202/202 PASS**, including JWT signature/issuer/audience/expiry/owner checks, admin fail-closed behavior, CSRF/origin checks, draft/publish/revision conflict paths, media validation, video/app data handling, moderation and audit logging.

### Remote staging storage

- D1 read: PASS (schema/migration inspection).
- D1 write/read/delete probe: PASS using a uniquely named `cms_rate_limits` row; final count was zero.
- R2 write/read/checksum/delete probe: PASS in `aidesk-studio-media-staging`; downloaded SHA-256 matched and the final GET returned “key does not exist”. No probe data remains.

### Live unauthenticated checks

- private `/`, `/admin`, admin API GET and admin API POST: all intercepted by Access with HTTP 302 to the team login page.
- public `/api/admin/content`: HTTP 404.
- public artifact security checks prove no private Studio module or admin worker is shipped.
- team JWKS: HTTP 200.
- Google login option: rendered on the real Access login page.

### Not live-verified

Owner login, MFA challenge, owner JWT claims, authenticated draft save/reload/publish, authenticated video/app management, authenticated moderation/audit behavior, and preview-host rejection were not live-tested. They require the Dashboard policy/MFA verification, production bindings/secrets and a real owner authentication session. Mock/local test success is not substituted for these checks.

## E. Remote changes and final blocker

No persistent Cloudflare configuration or content change was made. The only remote writes were uniquely named staging permission probes in D1 and R2, and both were deleted immediately after checksum/read verification. Public deployment `webaidesk` was not changed. Private project `aidesk-studio-private` was not deployed.

Private deployment remains blocked until all of the following are independently verified: exact owner-only policy, independent MFA, production and preview Access coverage, exact AUD per hostname, production D1/R2 bindings, required secrets/allowed origins/hostnames, Turnstile configuration, real owner login and unauthenticated rejection. This is **EXTERNAL ACTION REQUIRED**, not a local code defect.

Public release completion remains blocked on the exact V0.2 archive above. V0.3 remains downloadable and byte-correct; its R2 HTTP metadata should be corrected in a separate reviewed operation without changing the bytes.
