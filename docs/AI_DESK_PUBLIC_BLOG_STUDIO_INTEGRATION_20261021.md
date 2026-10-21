# Public blog ⇄ Studio integration — report (2026-10-21)

## Verdict

Published Studio articles now appear on `https://webaidesk.pages.dev/blog` without redeploying the website, and archived or draft articles do not. Verified locally and live (see evidence). Cloudflare Access, the private Studio deployment, the V0.3 download, R2 release objects and D1 data were not changed.

## Root cause (investigated, not assumed)

- The public blog already called `GET /api/content/articles` and `/api/content/articles/:slug`, and the public worker already had that route.
- The public **production** Pages environment had **no `CMS_DB` binding** (only `RELEASES`). Before this change, live `/api/content/articles` returned `503 cms_not_configured`, and the frontend treats any non-OK response as an empty list, so `/blog` always showed "Bài viết đang được chuẩn bị".
- The earlier `ZZ` test articles were archived, so their absence was correct; the real gap was the missing binding.
- Secondary defects found in the existing public handler: it returned the entire internal row (status, version, audit timestamps, tags, SEO, full body in lists), it ordered by `updated_at` (not newest-published), and it accepted unvalidated slugs and any path depth.

## What changed

Files added:
- `server/cms/publicContent.ts` — SELECT-only public module with an allow-list DTO; newest-published-first ordering (`COALESCE(published_at, updated_at) DESC`); slug regex `^[a-z0-9]+(-[a-z0-9]+)*$` (≤180); only `articles|videos|apps`; max path depth; limit clamp 1–50; cursor validated; GET/HEAD only; list omits bodies; `no-store`, `nosniff`, `default-src 'none'`, no CORS.
- `tests/public-blog.test.ts` — 9 tests (see below).
- `wrangler.public.cms.jsonc` — deploy config for `webaidesk` (D1 `CMS_DB` + existing `RELEASES`, no secrets).
- This report.

Files modified:
- `server/cms/handler.ts` — `handlePublicContent` is now re-exported from `publicContent.ts` (existing tests keep working).
- `functions-public/api/content/[[path]].ts` — now imports only `publicContent.ts`. It previously re-exported `functions/api/content/[[path]].ts` (the original is preserved in the checkpoint `studio_final_20261021_142131\untracked.tgz`).
- `src/pages/PublicContentPages.tsx` — shows the published date on list cards and article pages, tags, and sets the document title and meta description from the article's SEO fields.
- `src/components/MarkdownBody.tsx` — a link whose URL was stripped by the sanitizer (e.g. `javascript:`) now renders as plain text instead of an anchor with an empty `href`.
- `src/pages/public-content.css` — article typography (headings, lists, spacing, wrapping) and date styling; existing V3 design and navigation untouched.

## Security tests (automated; `npm run check`: 211/211 pass, previously 202)

BLOG-01 draft hidden → published visible → archived hidden; BLOG-02 edits visible immediately and `no-store`; BLOG-03 newest-first and cursor pagination; BLOG-04 DTO allow-list (no status, version, createdAt, archivedAt, kind; no body in lists); BLOG-05 kind isolation and soft-deleted rows; BLOG-06 slug/kind/path/limit/cursor validation including `..%2f`, SQL-injection strings, `constructor`/`__proto__`, over-long slug; BLOG-07 POST/PUT/PATCH/DELETE → 405, no DB → 503, headers, no CORS; BLOG-08 public module contains no write SQL and imports no admin/auth code; BLOG-09 Markdown rendering strips `<script>`, `onerror`, `javascript:`, `data:`, iframes and remote images. They run against a real local D1 with the production migrations. The V2.5 artifact scanner still passes (no admin code in the public bundle).

## Cache behavior (verified)

- API responses: `Cache-Control: no-store`, so every publish, edit or archive is visible on the next request. No purge is needed.
- HTML shell and assets: `public, max-age=0, must-revalidate`. Articles are fetched client-side from the API.
- Trade-off: every blog view reads D1. If traffic grows, add a short `s-maxage` on the list endpoint; that would delay removal by that amount.

## Local browser E2E (real public bundle via `wrangler pages dev dist-public`, local D1) — PASS

- Typed and published a labelled article in the Studio UI. Public `/blog` listed it with date; the detail page showed the title, meta description, `<h2>`, bold text, list, no script elements, `window.__xss` unset, and the stripped link as plain text.
- 390px: no horizontal overflow on list and detail.
- Archived it in the Studio UI. `/blog` showed the empty state and the slug API returned 404.

## Deployment

- Project: existing `webaidesk` (Git-connected; deployed by Wrangler Direct Upload on branch `main`, as before).
- Deployment ID: `a99b459e-5e65-4feb-a884-be55f572746f` (Production), about 2026-10-21 17:10 Asia/Bangkok. Project API confirms it is the canonical deployment and Production bindings are `CMS_DB` (D1 `aidesk-studio-staging`, `<STAGING_D1_ID>`) and `RELEASES` (R2 `aidesk-releases`, preserved). Variable: `ENVIRONMENT`. No secrets or comments settings were added.
- Rollback: the previous production deployment `e63d1201-6c9b-48a4-b36a-70465e146169` (Dashboard → Workers & Pages → webaidesk → Deployments → that deployment → Rollback). Immediate mitigation without rollback: archive the content in the Studio.
- Not touched: private Studio deployment `776cd94e…`, Access, DNS, release R2 object, desktop repository.

## Live E2E (live PASS)

- Before: `/api/content/articles` returned `{"data":[]}` (no longer 503).
- In the live Studio (owner session) I created and published the labelled article `ZZ Live Blog E2E Temporary`. Within one request it appeared in `webaidesk.pages.dev/api/content/articles` (12 DTO keys, no status or version), and on `/blog` and `/blog/zz-live-blog-e2e-temporary` with title, date, h2, bold, no script elements, `window.__xss` unset, no leftover link; 390px `scrollWidth` 390.
- Archiving it in the Studio removed it from the list immediately; the slug API returned 404; D1 shows the row `archived` and not deleted. Nothing was deleted.
- Live security probes: `/api/admin/articles` 404, `/api/admin/session` 404, `POST /api/content/articles` 405, SQL-injection slug 404, `/api/content/constructor` 404, `POST /api/comments` → 503 `comments_not_configured` (fails closed).
- `/download` returns 200 and the bundle still references the V0.3 R2 file.

## Videos and applications

- Both go through the same read-only route (`/api/content/videos`, `/api/content/apps`) and now return `{"data":[]}` live (nothing published). Tutorials uses `videos`; Apps and `/apps/:slug` use `apps`.
- Not exercised live (no published item): rendering of a published video on `/tutorials`, a published app page, and app download links.
- Gap: application `downloadUrl` is rejected by the Studio until `CMS_ALLOWED_DOWNLOAD_HOSTS` is configured on the private project.

## Remaining limitations

- Articles are rendered in the browser from the API. There is no server-side rendering, so crawlers and link previews see the generic site metadata, and `sitemap.xml` does not list articles.
- A D1 binding cannot be made read-only by Cloudflare; read-only access is enforced in code (SELECT-only module, tests, scanner). The public site now holds a binding to the staging database that the private Studio also uses. A dedicated production database would separate them.
- Cover images and any media: no public media delivery exists; the Markdown renderer drops images by design.
- Comments are disabled on the public site (no Turnstile or hash secrets), by design.
- `MarkdownBody.tsx` is shared with the private Studio; the private deployment has not been rebuilt, so its preview behaves as before until its next deploy.
- Local `wrangler dev` servers started for testing are still running on ports 8787 and 8788 (they could only be stopped forcefully). Stop them with Ctrl+C in their terminal or close it.
- `webaidesk` is Git-connected; a future Git-triggered build would use the project settings, which now contain the `CMS_DB` binding.
