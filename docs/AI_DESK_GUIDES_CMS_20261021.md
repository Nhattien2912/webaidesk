# Guides CMS (Hướng dẫn) — report (2026-10-21)

Owners can now create, edit, preview, publish and archive guides in the private Studio, and published guides appear on the public website without rebuilding or redeploying it.

## Checkpoint

`C:\Users\clubb\Desktop\WedAiDesk_checkpoints\guides_cms_20261021_173521`: tracked diff, untracked archive, git status, HEAD `6ef0c74`, and a D1 export `d1_pre_guides.sql` (SHA-256 prefix `b01581a0ea26e3ba`). The dirty worktree was preserved; no reset or clean; nothing committed. No D1 migration was needed, so the backup was a precaution.

## Existing routes mapped (discovery)

| Route | What it is | Dynamic? | Change |
| --- | --- | --- | --- |
| `/install` | Interactive installation guide (718-line React page, copy buttons, troubleshooting accordion) | Hardcoded | Unchanged, linked from the hub |
| `/tutorials` | Video tutorials: hardcoded list plus published Studio videos (already CMS-merged) | Hybrid | Unchanged, linked from the hub |
| `/prompts` | Prompt library | Hardcoded | Unchanged, linked from the hub |
| `/blog`, `/blog/:slug` | Blog | CMS | Unchanged behavior; guides are excluded from it |
| `/guides`, `/guides/:slug` | New | CMS | Added |

Navigation: the "Hướng dẫn" dropdown and the footer "Tài nguyên" list gained "Trung tâm hướng dẫn" (`/guides`); every existing item and URL is kept. No redirects were necessary because no URL changed. `sitemap.xml` lists `/guides`.

## Data model (no migration)

`cms_contents.kind` has a CHECK constraint and foreign keys from revisions, comments, videos, apps and media. Adding a `guide` kind would mean rebuilding the table that holds all content, so guides reuse `kind = 'article'` with `data.section = 'guide'` (blog articles have no `section`). Everything else (revisions, audit, optimistic locking, media references, status transitions) is reused as is. Guide-only fields live in `data`: `order` (0-9999), `version`, `platform`, `relatedVideoSlugs` (up to 6 slugs of existing Studio videos), plus the existing `coverMediaId`.

Trade-off: guide and blog slugs share one namespace per kind (a guide cannot reuse a blog slug) and archived items keep their slug.

## Studio (private)

- New sidebar section "Hướng dẫn" (also a dashboard card and quick action): list with search and status filter, editor, preview, Draft / Publish / Archive. API: `/api/admin/guides` (a section-scoped view of the article routes behind the same Access, JWT, origin and CSRF checks).
- Editor fields: title, slug, summary, Markdown body, category (Cài đặt, Bắt đầu, Quy trình làm việc, Mẹo & thủ thuật, Khắc phục sự cố), order, AI Desk version, platform, tags, SEO, cover image, related videos (checkboxes of existing videos, so videos are linked, not duplicated).
- Markdown toolbar: steps, note, tip, warning, checklist, code block, insert an image from the media library, and upload an image and insert it in one step. Image Markdown is `![alt](/api/content/media/<id>)`. The preview rewrites it to the private media API so the image shows while editing.
- Readable errors: field-level Vietnamese messages for validation, version conflict, duplicate slug, status transition, CSRF, rate limit, and so on (`describeSaveError`).
- Admin isolation: `/api/admin/articles` lists only blog items and `/api/admin/guides` only guides; cross-section ids return 404 for GET, PATCH, DELETE and revisions; blog routes reject `section`/guide-only keys; a guide cannot be moved out of its section.
- The Videos and Applications workflows are untouched.

## Public website

- API: `/api/content/guides` (list: published only, ordered by `order` ascending then newest, unordered last, up to 100) and `/api/content/guides/:slug` (adds `relatedVideos` resolved at read time from videos that are published, not deleted and have a valid YouTube id). `/api/content/articles` no longer returns guides. Responses are `no-store`, allow-listed DTOs, GET/HEAD only; guides have no comments route.
- Pages: `/guides` hub with "Hướng dẫn nền tảng" (cards linking `/install`, `/tutorials`, `/prompts`, the preserved static content) and "Hướng dẫn chi tiết" (CMS guides with search and category chips, cards showing version/platform), and `/guides/:slug` detail using the premium-light blog layout (breadcrumb, meta chips, optional cover, TOC for two or more real headings, prose, related videos, "Hướng dẫn khác"). Loading, empty, error and zero-result states are honest, with no fake content.
- Markdown features: numbered steps, `> [!NOTE|TIP|IMPORTANT|WARNING|CAUTION]` callouts, checklists, code blocks, tables, links (https/mailto only) and images (only from the public media route). Raw HTML is dropped.
- YouTube: only the linked-videos section, as `https://www.youtube-nocookie.com/embed/<11-char id>` iframes, ids validated server-side.
- Cache: API responses are `no-store` and the HTML shell is static, so publish/update/archive show immediately; the media route may keep an image cached up to 5 minutes.

## Files

Added: `src/lib/markdownToc.ts` (earlier), `tests/guides.test.ts`, `docs/guides-cms-screenshots/*`, this report.
Modified: `server/cms/validation.ts`, `server/cms/repository.ts`, `server/cms/handler.ts`, `server/cms/publicContent.ts`, `src/components/MarkdownBody.tsx`, `src/pages/BlogPages.tsx` (guides hub and detail via the shared article view), `src/pages/StudioPage.tsx`, `src/pages/studio.css`, `src/pages/blog.css`, `src/lib/contentRepository.ts`, `src/lib/studioEditor.ts`, `src/lib/routes.ts`, `src/App.tsx`, `src/config/navigation.ts`, `src/data/studioFixtures.ts` (type only), `public/sitemap.xml`.

## Security

- Admin: unchanged Access (Owner Only, Google, MFA) plus JWT, origin and CSRF checks on every guide mutation. The deployed Studio still returns 302 to Access for `/`, `/api/admin/guides` and `/api/admin/session`.
- Public: read-only SELECT module, no admin imports, no `/api/admin` strings in public sources (tested), no write routes, DTO allow-list, drafts, archived and deleted rows excluded, slug and path validation, related videos only if published, media route only for published content.
- Bug found and fixed by the new tests: the YouTube-id check in the public related-video resolver had lost a backslash and rejected every id (failed closed, no exposure).

## Tests

`npm run check`: typecheck, lint, 228/228 tests (216 before; 12 new in `tests/guides.test.ts`), builds and the V2.5 artifact scan all pass. The new tests cover routes, the full lifecycle (draft, publish, public update, archive, 404), section isolation in both directions, ordering, field validation, related-video publication rules, the public DTO and read-only contract, cover and inline image rules, Studio helpers and error messages, and Markdown guide features with hostile input.

Local browser E2E (real built Studio on a local server and the real public bundle via `wrangler pages dev`): created a guide in the Studio UI with toolbar snippets, media insertion, related video and cover; preview rendered callouts, steps, checklist and the image; Save draft (public 404), Publish (public hub card and detail with chips, callouts, steps, checkboxes, inline image, cover and YouTube embed), edit title and republish (public title updated), invalid version shows a readable error, Archive (public 404 for guide and its cover). 390 / 768 / 1440px: no horizontal overflow on hub, detail and the Studio editor; hub columns 3 / 2 / 1.

## Deployments

| Project | Deployment ID | Rollback reference |
| --- | --- | --- |
| `aidesk-studio-private` | `dbbf2894-4686-48c4-a654-34fc94534479` | `776cd94e-613b-4706-8d39-a36bf4b97787` |
| `webaidesk` | `7ee6d913-6f22-4e4c-8b4b-22a1acbde3d4` | `c7530d8b-9320-4b6f-bd0b-f906edbf1785` (then `a99b459e-5e65-4feb-a884-be55f572746f`) |

Checked before deploying: bindings (Studio: `CMS_DB`, `CMS_MEDIA`, `CMS_CSRF_SECRET`; public: `CMS_DB`, `CMS_MEDIA`, `RELEASES`), D1 backup, and that the V0.3 download file still answers 200. DNS, release R2 objects and the desktop repository were not touched.

## Live verification (live PASS)

With the owner's real Studio session: created a labelled guide `ZZ Live Guide Test` through the deployed Studio UI (steps, tip, checklist, image, warning, cover, order, version, platform). Saved as draft: the public list was empty and its slug returned 404. Published: it appeared on `webaidesk.pages.dev/guides` (card with "Phiên bản 0.3.0" and "Windows") and `/guides/zz-live-guide-test` (breadcrumb, chips, 2 callouts, 3 steps, 2 checkboxes, inline image, cover, no comments, no overflow at 390 and 1440px). After editing the title in the Studio and republishing, the public title changed. After archiving, the guide, its list entry and its cover returned 404. The Blog list stayed `ads` throughout and the guide was never reachable through `/api/content/articles`. The owner's article `ads` was not touched. The test guide remains in D1 as an archived row.

## Remaining limitations

- `/install`, `/tutorials` (hardcoded part) and `/prompts` remain code-managed. They were not migrated: `/install` is a bespoke interactive page and I did not replace it before a CMS equivalent existed. The hub links them as "Hướng dẫn nền tảng". Migrating them means rewriting each as Markdown guides, then retiring the static page.
- Image upload from the editor ("Tải ảnh lên & chèn") uses the existing upload API, which was tested; the file chooser itself was not driven in the browser test. Insertion from the media library was.
- Inline images are served only while the guide is published; the Studio preview uses the private media API.
- A guide cannot reuse the slug of an archived guide (restore it through Draft first).
- Guides are client-rendered, so crawlers and link previews that do not run JavaScript see generic metadata, and `sitemap.xml` lists only `/guides`, not individual guides (needs SSR or prerendering).
- Public `CMS_MEDIA` is a binding to the staging media bucket; read-only is enforced in code and tests.
- The test YouTube video used locally is flagged "unavailable" by YouTube for embedding; the embed mechanism itself is verified, but no live guide with a related video was published because the staging database has no published video.
- Local `wrangler dev` servers started for testing (ports 8787-8790) may still be running; stop them with Ctrl+C in their terminals.
