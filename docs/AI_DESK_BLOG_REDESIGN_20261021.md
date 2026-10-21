# Public blog redesign — report (2026-10-21)

Direction: Premium Light SaaS Editorial. Only `/blog` and `/blog/:slug` were redesigned. Site navigation, footer, Apps pages and the V3 marketing pages were not touched.

## Checkpoint and audit

- Checkpoint (outside the repo): `C:\Users\clubb\Desktop\WedAiDesk_checkpoints\blog_redesign_20261021_170929` (tracked diff, untracked archive, status, HEAD `6ef0c74`). The dirty worktree was preserved; no reset or clean; nothing committed.
- Findings: the old list and detail used generic shared classes (`studio-card`, `content-hero`) with no featured treatment, no categories, no thumbnails, no loading/error states and a plain Markdown block. The content model already had title, slug, summary, category, tags, `publishedAt` and an optional `data.coverMediaId`, but there was no public path to cover images.

## Design changes

Listing (`/blog`):
- New hero with a gradient-accent heading and a meaningful subtitle (no metrics).
- Search (accent-insensitive; matches title, summary and tags) and category chips with real counts in one toolbar. The toolbar is hidden when only one article exists.
- Featured section for the newest published article: real cover if available, otherwise a CSS-generated visual (grid, orbs, icon; palette chosen deterministically from the slug). Featured is hidden while searching or filtering.
- Grid: 3 columns on desktop, 2 on tablet (up to 1024px), 1 on mobile (up to 640px). Each card has thumbnail, category, title, 3-line excerpt, date and a "Đọc bài viết" action. The whole card is one link, so mouse and keyboard both work, with a visible 3px focus ring.
- The one-article state shows the featured card plus a neutral note. Empty, loading (skeleton), error (with retry) and zero-result (with clear filters) states contain no fake content. Motion is subtle and disabled under `prefers-reduced-motion`.

Article (`/blog/:slug`):
- Breadcrumb, category pill, H1, lead summary, date, tag chips and an optional real cover image.
- Prose column about 72 characters wide, with styled headings, lists, blockquote, code blocks, tables (own horizontal scroll), images and links.
- Table of contents (sticky sidebar on desktop, collapsed block on small screens) only when the article has two or more real `##`/`###` headings. Anchor ids match the rendered headings.
- "Bài viết liên quan" only when other published articles exist (same category first, up to 3). The comments component is unchanged.
- Title, description, `og:title`, `og:description`, `og:type`, `og:url` and `og:image` (cover) are set client-side.

## Content model and server changes (no D1 schema change)

- `server/cms/publicContent.ts`: the DTO gains `coverUrl`, derived from `data.coverMediaId` as `/api/content/media/<uuid>`.
- New public route `GET/HEAD /api/content/media/:uuid`. It serves an image only if the `cms_media` row is not deleted, its MIME is png/jpeg/webp, and a **published, non-deleted** content row references it as cover/logo or embeds `/api/content/media/<id>` in its body. Everything else returns 404. Headers: `nosniff`, `default-src 'none'; sandbox`, `Cross-Origin-Resource-Policy: same-origin`, `Cache-Control: public, max-age=300`, so an archived article's cover may stay cached for up to 5 minutes in browsers.
- This needs the public project to bind the existing R2 bucket `aidesk-studio-media-staging` as `CMS_MEDIA`. The release bucket binding `RELEASES` is separate and unchanged.
- `MarkdownBody`: opt-in heading ids, tables wrapped for scrolling, images allowed only from the public media route (remote, `data:` and other URLs are still dropped), links whose URL was stripped render as text.

## Files

Added: `src/pages/BlogPages.tsx`, `src/pages/blog.css`, `src/lib/markdownToc.ts`, `docs/blog-redesign-screenshots/*`, this report.
Modified: `server/cms/publicContent.ts`, `src/components/MarkdownBody.tsx`, `src/pages/PublicContentPages.tsx` (old blog page removed; `Comments` and `PublicContent` exported), `src/App.tsx`, `tests/public-blog.test.ts` (5 new tests), `wrangler.public.cms.jsonc` (adds `CMS_MEDIA`).

## Tests

- `npm run check`: typecheck, lint, 216/216 tests, builds and the V2.5 artifact scan all pass (211 before).
- New tests cover the cover route (published only, archived returns 404, drafts, deleted rows, missing object, malformed ids, wrong methods, no R2 binding), inline images, TOC/heading-id consistency with duplicates and code fences, and Markdown image/table rendering. Earlier BLOG-01..09 still cover visibility, newest-first, DTO allow-list, validation, read-only and XSS sanitization.

Local browser E2E (real public bundle via `wrangler pages dev` with local D1 and R2; 8-article, 1-article, empty and error scenarios; screenshots in `docs/blog-redesign-screenshots/`):
- 390 / 768 / 1440px: no horizontal overflow on list or detail; 3 / 2 / 1 columns confirmed.
- Search without diacritics (`bao mat` finds "Bảo mật…"), zero results with a clear button, category filter (aria-pressed, count text) and combined search plus filter all pass.
- Keyboard: Tab reaches a card link with a 3px outline and Enter opens the article.
- Detail: breadcrumb, TOC anchors all resolve, table, code, blockquote, ordered list, 1200px cover and related list. `<script>`, a `javascript:` link and an `onerror` payload were not rendered and `window.__xss` stayed unset.
- States: one article (featured, no toolbar), empty, error with retry, and an archived slug showing "not published".
- Not visually exercised: the loading skeleton (too brief to capture) and reduced-motion (CSS only).

## Deployment

- Project `webaidesk`, deployment `c7530d8b-9320-4b6f-bd0b-f906edbf1785` (Production, branch `main`), 2026-10-21 about 18:00 Asia/Bangkok.
- Checked before and after: `CMS_DB` (D1 `aidesk-studio-staging`), `RELEASES` (`aidesk-releases`), new `CMS_MEDIA` (`aidesk-studio-media-staging`); the V0.3 file URL returns 200 with 120,629,335 bytes; no secrets added; no D1 migration.
- Rollback: previous production deployment `a99b459e-5e65-4feb-a884-be55f572746f` (Dashboard, Workers & Pages, webaidesk, Deployments, Rollback). Before that: `e63d1201-6c9b-48a4-b36a-70465e146169`.
- Private Studio `aidesk-studio-private` (deployment `776cd94e…`) and its Access were not changed and still redirect to Access.

## Live verification (live PASS)

- `/`, `/blog`, `/blog/ads`, `/download` return 200; `/api/admin/*` returns 404; the media route returns 404 for malformed or unreferenced ids; comments POST still fails closed.
- With the owner's real article `ads` plus a labelled temporary article `ZZ Live Blog Redesign Test` (cover = the existing 1x1 test image in R2) published from the live Studio: the list showed the temporary article as featured with its cover served through `/api/content/media/<uuid>` (200), `ads` as a card, the search box, and no filter chips (one category). The detail page showed breadcrumb, a 4-heading TOC with working anchors, table, no script elements, `window.__xss` unset and related = `ads`. At 390px there was no overflow and the TOC started collapsed.
- After archiving the temporary article in the Studio, the list showed only `ads`, its slug API returned 404 and its cover URL returned 404 immediately (checked against the origin with curl, not the browser cache).
- The owner's article `ads` was not modified.

## Before / after

Before (live, old design): `before-list-1440-live-2articles.jpg`, `before-list-390-live.jpg`, `before-detail-1440-live.jpg` — small unlabelled cards, large empty areas, a lone "Tất cả chủ đề" button and a plain-text detail page.
After: `after-*` files. `*-LIVE-*` come from webaidesk.pages.dev; `*-local-*` use local test data.

## Limitations

- SEO: pages render in the browser from the API. Title, description and Open Graph tags are set by JavaScript, so crawlers and link-preview bots that do not run JavaScript see the generic site metadata, and `sitemap.xml` does not list articles. Fixing this needs SSR or build-time/edge prerendering.
- The Studio has no inline-image button: inline images need the Markdown `![alt](/api/content/media/<uuid>)` written by hand with the media id. Cover selection works through the existing Studio dropdown.
- Public `CMS_MEDIA` is a binding to the private staging bucket; read-only behavior is enforced in code and tests, not by Cloudflare. Cover cache lifetime is up to 5 minutes.
- The private Studio was not redeployed, so its Markdown preview still uses the old renderer until its next deploy.
- Reading time, author, views and other metrics are intentionally absent (not in the data model).
- Local `wrangler dev` servers started for testing (ports 8787-8790) may still be running; stop them with Ctrl+C in their terminals.
