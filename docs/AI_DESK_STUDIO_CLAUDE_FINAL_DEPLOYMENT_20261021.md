# AI Desk Studio — final deployment report (2026-10-21)

## Verdict

**STUDIO LOCALLY READY — USER AUTHENTICATION REQUIRED.** The private Studio is deployed, but no owner login, MFA prompt, non-owner denial or CMS interaction has been observed live. Owner-only protection is therefore not yet "verified" in the sense of an observed login.

## Deployment

- Existing Pages project `aidesk-studio-private`, Wrangler Direct Upload, no Git connection.
- Deployment ID: `776cd94e-613b-4706-8d39-a36bf4b97787` (Production environment, branch `feature/website-v3-premium-light`), 2026-10-21 about 15:10 Asia/Bangkok.
- The bundle is `dist-private` with the embedded isolated Functions `_worker.js` (admin API, comments, media, audit).
- Rollback reference: no earlier deployment existed (the list was empty before). To roll back, disable by redeploying a prior build, or set `CMS_ADMIN_ENABLED=false` and redeploy (admin returns 404). Access stays on regardless.
- Pages deploy refuses a custom config path, so the deploy ran from `C:\Users\clubb\Desktop\WedAiDesk_checkpoints\deploy_trial_20261021` (a copy of `dist-private` plus `wrangler.jsonc` generated from `wrangler.private.trial.jsonc`).

## Git and checkpoint

- Branch `feature/website-v3-premium-light`, HEAD `6ef0c74f44ff54ce14128cd02b9bc6365752f975`, dirty worktree preserved.
- Checkpoint: `C:\Users\clubb\Desktop\WedAiDesk_checkpoints\studio_final_20261021_142131`.
- File added in the repo this session: `wrangler.private.trial.jsonc` (no secrets). No other source changes. Nothing committed.

## Cloudflare Access (observed in the authenticated Dashboard)

- Team `<ACCESS_TEAM>`, plan Zero Trust Free; you are Super Administrator.
- App `AI Desk Studio - Private Production`: destination `aidesk-studio-private.pages.dev`, one policy `AI Desk Studio - Owner Only`.
- App `AI Desk Studio - Private Previews`: destination `*.aidesk-studio-private.pages.dev`, same policy. Its login and MFA settings match Production.
- Policy: Allow, one Include rule of Emails = `<OWNER_EMAIL>`. No Everyone, Bypass or service-token rule observed. Session 6 hours.
- Login methods on both apps: "Accept all available identity providers" is OFF and only `Google - google` is selected. One-time PIN is not selected. Instant authentication is on.
- MFA on both apps: "Customize MFA settings" is selected (not "Disable MFA" and not "Respect global", which would apply nothing). Methods: Biometrics and Authenticator application; re-authentication every 24 hours. This is the configured enforcement mechanism. **An actual MFA prompt at login has not been observed.**
- Production AUD, read from the app's AUD tag, equals the value in `ACCESS_AUDIENCE_MAP`. It is deliberately not repeated here as proof of anything other than configuration (the AUD is not a secret).
- No Access setting was changed. Nothing was saved in the Dashboard.
- I did not inspect the identity-provider list itself, so Google IdP credentials and the organization-wide MFA setting are unverified.

## Server-side JWT check (code)

`server/cms/auth.ts`: issuer fixed to `https://<ACCESS_TEAM_DOMAIN>`; RS256 only; signature via `<issuer>/cdn-cgi/access/certs` (JWKS); audience from the exact per-hostname map; `exp` enforced by `jose`; exact lowercase email must be in `ACCESS_ALLOWED_IDENTITIES`; missing configuration fails closed with 503. The private entry also requires the host to be in `PRIVATE_ADMIN_HOSTNAMES`. Mutations need an exact allowed Origin plus an HMAC CSRF token.

Preview hostnames are not in `ACCESS_AUDIENCE_MAP` and not in `PRIVATE_ADMIN_HOSTNAMES`, so the Functions reject them even if Access were bypassed. Access still redirects them.

## Bindings, variables, data

- D1 `aidesk-studio-staging`, id `<STAGING_D1_ID>`, binding `CMS_DB`. `wrangler d1 migrations list --remote` reports no migrations to apply (all five applied).
- R2 `aidesk-studio-media-staging`, binding `CMS_MEDIA`. The release bucket `aidesk-releases` is not bound.
- This is the staging data environment used for the owner trial, with `ENVIRONMENT=staging`. No new resources were created.
- Pre-deploy backup: `d1_pre_trial_deploy.sql` in the checkpoint directory, SHA-256 `0752929ff9354550057e1c6c49a0c57056bd21250ac0eb1ce50fa83793b6753d`. It is identical to the earlier post-migration backup, so no data changed.
- Variable names set by the deploy config: `ENVIRONMENT`, `CMS_ADMIN_ENABLED`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUDIENCE_MAP`, `ACCESS_ALLOWED_IDENTITIES`, `PRIVATE_ADMIN_HOSTNAMES`, `CMS_ALLOWED_ORIGINS`.
- Secret set this session, value not displayed: `CMS_CSRF_SECRET` (random, 48 bytes, base64).
- Not configured (optional, features stay disabled or fail closed): `COMMENTS_TURNSTILE_SECRET_KEY`, `COMMENTS_TURNSTILE_ALLOWED_HOSTNAMES`, `COMMENTS_TURNSTILE_ACTION`, `COMMENTS_IP_HASH_SECRET`, `CMS_ALLOWED_IMAGE_HOSTS`, `CMS_ALLOWED_DOWNLOAD_HOSTS`, `CMS_MEDIA_RETENTION_DAYS`. Comment moderation and external image or download URLs depend on these.

## Tests actually run

- `npm run check`: typecheck, lint, tests, public and private builds, Functions build and `security:check-v2.5` all completed (the earlier report showed 202 tests passing; I did not re-read the count this session). It includes JWT signature, issuer, audience, expiry and owner-identity rejection tests.
- I also ran `npm run cms:test:local`, but its summary lines were not captured, so I do not claim a count from that run.
- Live, unauthenticated (all returned 302 to Access): the private root, `/api/admin/session`, a request with a forged `cf-access-jwt-assertion`, and the deployment-hash hostname `776cd94e.aidesk-studio-private.pages.dev` for `/` and `/api/admin/content/articles`.
- `webaidesk.pages.dev/api/admin/session` returns 404. The public site was not redeployed.

## Not tested (needs the owner's authenticated session)

Owner Google login and MFA prompt; non-owner denial; Dashboard; draft save, reload, publish, archive; videos; applications; R2 upload and public media read; comments moderation; audit history; 390px and 1440px layouts. None is claimed as passed.

## Remote changes

- Secret `CMS_CSRF_SECRET` on the `aidesk-studio-private` Pages project.
- Deployment `776cd94e-613b-4706-8d39-a36bf4b97787` with D1/R2 bindings and the variables above.
- D1 data was only exported. No migration, no DNS, public site, desktop, release object or Access change.

## Next step

Open `https://aidesk-studio-private.pages.dev/` in your browser, sign in with Google as `<OWNER_EMAIL>`, complete the MFA prompt, and confirm the Dashboard loads. Then test with a second, non-owner Google account in a private window and confirm it is denied.

## Live owner acceptance (added after the owner signed in, ~15:20 Asia/Bangkok)

The owner reported a successful Google login and I observed the Dashboard ("AI Desk Studio", Vietnamese UI, "Dữ liệu CMS (D1)") in the authenticated browser. An MFA prompt was not observed by me, so MFA enforcement is still configuration-only evidence.

Executed from the authenticated page against the deployed API (test records are labelled `ZZ Live Test*` and were all archived, not deleted):

| Check | Result |
| --- | --- |
| `GET /api/admin/session` | 200, email = owner, environment `staging`, CSRF token issued |
| POST without CSRF token | 403 |
| Create article draft | 201, version 1 |
| Reload article by id | OK |
| Stale-version PATCH | 409 |
| Publish (draft to published) | 200, version 2; 2 revisions |
| Archive (DELETE) | 200, status `archived` |
| Create video and app drafts, then archive | created; archived 200 each |
| R2 upload (1x1 PNG, raw body) | 201; admin readback 200, `image/png`, 70 bytes |
| Upload SVG / fake PNG | 415 / 400 |
| Media list, comments list, url-audit | 200 |
| D1 audit table | `create` for article, video, app; `update` rows; `upload` for media; all `success` |

Notes and gaps:
- Public rendering of published content and public media read were not tested, and the draft/archived visibility rule was not tested against a public API. Only `/api/content/...` on the private host was requested; it returned the SPA HTML fallback with 200, not CMS JSON.
- Comments moderation was not exercised (the list is empty and Turnstile/hash settings are not configured).
- 390px/1440px layout: only the desktop view was seen. The window resize did not change the page viewport, so mobile is unverified.
- Non-owner denial was not tested; it needs a second Google account.
- I drove the UI only through its API from the page, not through clicks on the editor screens (Markdown preview, forms).
- Test data remains in staging D1/R2 as archived rows and one media object (`ZZ` PNG). Nothing was deleted.

## Login redirect loop (ERR_TOO_MANY_REDIRECTS) — troubleshooting, 2026-10-21 ~15:50-15:57 Asia/Bangkok

**Symptom:** after Google login the owner's browser showed ERR_TOO_MANY_REDIRECTS at `/cdn-cgi/access/authorized`.

**Evidence (observed):**
- Access authentication logs showed repeated `Allowed` decisions for the owner at about one per second (bursts of 7-13 entries in ~10 s, e.g. 15:53:55-15:54:37) and no `Blocked` entries. So policy, Google IdP and MFA were not denying.
- After the loop gave up, a plain reload of the Studio loaded fine, so the Access cookie had been issued but was not sent within the redirect chain.
- Production app cookie settings were: HTTP Only on, Binding Cookie on, Eager redirect cookie on, SameSite **Strict**.
- The loop is on a Cloudflare Access path; the deployed Pages Functions were not involved. The Previews wildcard app is a separate application and was not involved.

**Root cause (strongly supported, not proven in isolation):** SameSite=Strict on the Production Access app, which stops the cookie being sent on the cross-site-initiated redirect chain after Google login. Brave Shields and Kaspersky were not tested and were not needed once the fix worked.

**Change made (only one):** Production app `AI Desk Studio - Private Production`, Additional settings > Cookie settings > Same Site Attribute: `Strict` -> `Lax`. Cloudflare confirmed "Application successfully configured". Nothing else was changed (Owner Only policy, Google-only login, MFA, HTTP Only, Binding Cookie, Eager redirect cookie, Previews app, D1/R2, public site, deployment). The Previews app still has its own cookie settings, which I did not inspect or change.

**Rollback:** set Same Site Attribute back to `Strict` in the same place and save.

**After-fix test (observed):** I logged the browser out, then the owner completed Google login and MFA in the browser. The Studio Dashboard loaded without the redirect error. The Access log showed a single `Allowed` entry for that login (15:56:00) instead of a burst. This was one login in one browser (Brave); other browsers were not compared. The owner reported completing MFA, which is the first report of an MFA step working; I did not see the prompt myself.

## Round 3 acceptance tests (2026-10-21 ~16:00-16:20 Asia/Bangkok)

Settings kept: SameSite=Lax, Google-only, MFA, Owner Only, deployment `776cd94e-613b-4706-8d39-a36bf4b97787`. Public website untouched. No new resources or secrets.

### 1. P0 non-owner Google account — NOT YET TESTED (needs user)
Requires a clean browser session and a second Google account. Not run by me. No PASS is claimed. Expected result to confirm: Access shows a "not allowed" page, the Access log shows `Blocked`, and `/api/admin/*` returns no data.

### 2. CMS E2E through the real UI on the deployed site (owner session in Brave)
| Test | Result | Evidence |
| --- | --- | --- |
| Article: new, Markdown Preview | PASS | Preview rendered heading/bold/link; `<script>`, `<img onerror>` and `javascript:` link were not in the DOM; `window.__xss` stayed undefined |
| Article: Save draft, reload page, content persisted | PASS | List showed it after full navigation; body text reloaded from D1 |
| Article: Publish, Archive buttons | PASS | API: published v2, then archived v3 |
| Video: non-YouTube URL | PASS (rejected) | Inline error "URL YouTube không hợp lệ", nothing saved |
| Video: valid YouTube URL, preview, save | PASS | Preview thumbnail shown; D1 row has `youtubeId`; archived via API afterwards (UI archive button not exercised for videos) |
| App: untrusted download URL | PASS (rejected) | Server 400 `data.downloadUrl: trusted_https_url_required`; UI shows only a toast |
| App: save with version, platform, changelog | PASS | D1 data has `currentVersion`, `platforms`, `changelog` |
| App: Publish, Archive buttons | PASS | published v2, archived v3 |
| Audit log | PASS (DB only) | `cms_audit_events` has create/update rows for article, app, video and the media upload, all `success`. There is no audit viewer in the UI; I read D1 directly (read-only) |

Observations (not fixed, low severity):
- App-editor server errors appear only as a short toast with the raw code (e.g. `API 400: validation_failed (data.downloadUrl)`); no inline field message as the video editor has.
- Allowed download hosts are not configured (`CMS_ALLOWED_DOWNLOAD_HOSTS` unset), so every download link is rejected. Applications can be saved without one but cannot have a download link until this is set.
- "Cài đặt" (Settings) page says the API is unavailable (placeholder).
- Dashboard counts show 0 because all test items are archived.

### 3. UI 390px and 1440px
The deployed site could not be resized in the owner's browser (window resize had no effect; popup blocked), and I did not sign the built-in browser in. I therefore tested the **same private UI build running locally** (`npm run cms:dev`, local D1 only, 127.0.0.1) with viewport emulation. This is not a test of the deployed URL.
- 390px: no horizontal page overflow on Dashboard, Articles, Article/Video/Product editors, Media, Comments, Settings; the data table scrolls inside its card; the menu drawer opens with a scrim and closes. Some controls (menu close, back link) are 24px tall, below the usual 44px touch target.
- 1440px: product editor shows a two-column layout with no overflow.
- Result: PASS locally; deployed 390px not directly verified.
- The local dev server (`wrangler dev`, port 8787) is still running because it could only be stopped forcefully, which was ruled out. Stop it with Ctrl+C in the terminal that started it or by closing that terminal.

### 4. Comments and R2
- R2 upload: PASS on the deployed site (earlier this session: PNG 201, read-back 200; SVG 415, fake PNG 400). The media is served by the admin API only (`private, no-store`); there is no public R2 URL, so public media read is not available and was not tested.
- Admin comments list on the deployed site: 200, empty. Moderation UI works locally with local fixture data only (1 pending, 1 approved). Not tested on the deployed site.
- Public comment submission needs the public site, whose comments Turnstile and IP-hash settings are not configured; `COMMENTS_TURNSTILE_SECRET_KEY`, `COMMENTS_TURNSTILE_ALLOWED_HOSTNAMES`, `COMMENTS_TURNSTILE_ACTION`, `COMMENTS_IP_HASH_SECRET` are missing on the private project and the public site was not changed. Status: moderation = works locally; end-to-end comments = not configured / not tested.
