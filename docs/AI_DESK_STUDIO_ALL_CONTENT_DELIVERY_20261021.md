# AI Desk Studio — all-content inventory and delivery

Date: 2026-10-21 (Asia/Bangkok)

## Result

The existing website layout and URLs are unchanged. Private Studio now has a Vietnamese **Tất cả nội dung** inventory that reconciles D1-managed content, source-backed page defaults, unresolved editorial source content, and deliberate technical/code-only exceptions. It links to the existing specialist editors instead of introducing a second editor.

FAQ on the homepage and `/changelog` are now registered Page Content types with safe structured editors and source fallbacks. They were imported as drafts only. Publishing a page record changes only that public page through D1/public APIs and does not require another website deployment.

## Safety and rollback

- Starting branch/HEAD: `feature/website-v3-premium-light` at `6fca47efbc09af3334bc1a72623e38c6f52d8f64`.
- Source checkpoint: `C:\Users\clubb\Desktop\WedAiDesk-checkpoints\studio-content-inventory-20261021-195409`.
- Pre-mutation D1 export: `aidesk-studio-staging-before-content-overview.sql`.
- Backup size: 221,097 bytes.
- Backup SHA-256: `24001B62F4D17275EB893A7F7E5D4EC58B62F5A0FE76A7B8DBAD8DC906C3893B`.
- Previous public deployment: `48487220-b5db-4e97-af1a-ab016838d974`.
- Previous private deployment: `cefe3f6a-6640-497f-bb8b-e01e11247794`.
- No destructive SQL, record deletion, release-object change, binding/secret change, DNS change, Access change, reset, clean or force push was used.

Rollback options:

1. Promote/redeploy the previous immutable Pages deployment for the affected project.
2. FAQ and Changelog are unpublished drafts, so they have no public effect. If data rollback is ever required, use the recorded D1 export after a fresh backup and review; do not delete records ad hoc.

## Content reconciliation

Remote D1 before import contained:

- published Blog article `ads`;
- Page Content `install` (Archived), `prompts` (Draft), `tutorials` (Draft);
- one archived Guide test record;
- archived application/video/blog test records.

The importer uses stable `(kind, slug)` identity, `NOT EXISTS` and `INSERT OR IGNORE`. Repeated runs cannot overwrite Studio edits, publications or archives. It stores provenance (`source: code-default`, importer, source registry), never scrapes rendered HTML, and never creates a periodic bidirectional sync.

Dry-run/local integration tests proved five registered pages would be draft-only and idempotent. The remote run then:

- skipped the three existing page records unchanged;
- created `faq` Draft version 1;
- created `changelog` Draft version 1;
- created no published document for either new record;
- left `ads` Published version 1 with the same update timestamp;
- left the public page APIs for FAQ and Changelog returning 404 so code defaults remain live.

## Final inventory counts

Counts shown by the live owner-only Studio after deployment:

| Category | Count |
| --- | ---: |
| Public/live inventory rows | 21 |
| Live from CMS | 1 |
| Page defaults live from code | 5 |
| D1 records visible in Studio, including archived tests | 16 |
| Newly imported drafts | 2 |
| Existing page records reused (duplicates prevented) | 3 |
| Unresolved practical editorial code-only groups | 9 |
| Deliberate code-only/security/legal/behavior groups | 6 |
| Archived records (hidden by default, filterable) | 11 |
| Duplicate page records created | 0 |

The nine unresolved groups are explicitly visible as **Cần chuyển vào CMS**: homepage Hero/demo, value strip, features/capabilities, how-it-works, product showcase, homepage roadmap, community/social section, `/roadmap`, and `/why-ai-desk`. They remain code defaults because migrating them safely requires separate structured schemas and layout-specific work; they were not flattened into unsafe arbitrary HTML.

Deliberate exceptions remain code-only: release/download integrity, homepage download state, privacy, terms, waitlist/Turnstile behavior, and navigation/footer structure. Authentication, downloads, release verification, application behavior and security controls are not editable content.

## What the owner can view and edit

- All D1 Blog records, including `ads`: `/admin/articles` and **Tất cả nội dung**.
- All D1 Guides: `/admin/guides` and **Tất cả nội dung**.
- All D1 Videos: `/admin/videos` and **Tất cả nội dung**.
- All D1 Applications: `/admin/apps` and **Tất cả nội dung**.
- Page Content: `/install`, `/prompts`, `/tutorials`, homepage FAQ (`/#faq`), and `/changelog`: `/admin/pages` and **Tất cả nội dung**.
- Media and comments continue using their existing specialist managers.

The overview provides search plus page/type/source/status filters, hides archived test records by default, and shows title, content type, public URL, source, status, current live source, last update, Edit, Preview, and public-page actions.

## Validation and tests

- TypeScript typecheck: pass.
- Lint: pass with two non-blocking React development advisories (preview entrypoint export and async initial data refresh effect).
- Automated suite: **265 passed, 0 failed**.
- Public build: pass.
- Private Studio plus preview build: pass.
- Isolated Pages Functions build: pass.
- V2.5 artifact scanner: pass (no public Admin, no private fixture data, no local markers/source maps).
- Page parity: default and seeded documents render identically for install, prompts, tutorials, FAQ and changelog.
- Security: JWT/owner rejection, CSRF/Origin, XSS escaping, trusted link validation, published-only DTOs, draft 404 behavior, media rules, moderation/audit and Turnstile fail-closed regressions pass.
- Browser responsive check: 390px and 1440px, no horizontal overflow or UI error; search/filter/actions remain present.
- Live unauthenticated private `/` and `/admin/all`: 302 to Cloudflare Access.
- Live authenticated owner session: new navigation and full inventory loaded; `ads` plus all five page rows visible and editable.
- Live public checks: homepage 200, `/blog/ads` 200, draft FAQ/Changelog APIs 404.

The automated integration suite covers edit → draft → preview → publish → public update and restoration semantics across the affected content types. No temporary live public-text mutation was performed after deployment; this avoids manufacturing a public edit when the requirement is to preserve current content.

## Deployments

- Public `webaidesk`: `a154cff2-27f6-4c1c-b78b-3e182f65dbcd` — `https://webaidesk.pages.dev/`.
- Private `aidesk-studio-private`: `410367bf-57e0-48d9-b17d-015043e8ef41` — `https://aidesk-studio-private.pages.dev/`.

Cloudflare Access remained enabled. The existing owner session continued to work after deployment, while unauthenticated requests remained intercepted. No Access Owner Only, Google IdP or MFA setting was modified.
