# /install, /prompts and /tutorials — editable from the Studio (report, 2026-10-21)

This is a content-management migration, not a redesign. The three public pages keep the same React components, CSS classes, URLs, navigation and footer. Their editorial text now comes from a registry of editable fields: the **code defaults** (exactly what the pages showed before) are the permanent fallback, and a **published Studio document** overrides them without any redeploy.

## Checkpoint and safety

- Checkpoint (outside the repo): `C:\Users\clubb\Desktop\WedAiDesk_checkpoints\page_content_20261021_185748` (tracked diff, untracked archive, status, HEAD `6ef0c74`, `live/*.html` shells, and the D1 backup `d1_pre_pagecontent.sql`). The dirty worktree was preserved; no reset or clean; nothing committed.
- No schema change and no migration. Existing data was not modified.

## How it works

- **Registry** `src/content/pageContent.ts`: for each page, sections and fields with Vietnamese labels, limits and **defaults copied from the previous pages**. The same registry drives the Studio forms, the public rendering and the server validation.
- **Storage**: one CMS record per page (`kind=article`, `data.section='page'`, slug `install` | `prompts` | `tutorials`) with `data.page = { draft, published }`. Reusing the article table avoids rebuilding `cms_contents` (its `kind` CHECK constraint) and keeps revisions, audit and optimistic locking.
- **Workflow**: *Save draft* only changes `data.page.draft`; the public page keeps what it had. *Publish* copies the draft to `published` and sets the record `published`. *Gỡ khỏi website* (archive) returns the page to the code defaults. Restoring goes archived → draft → published. A saved or incomplete draft never replaces public content.
- **Public API** `GET /api/content/pages/:id` (`install|prompts|tutorials` only): returns the published document of a published record, otherwise 404 (draft, archived, missing and corrupted documents are all "nothing published"). Responses are `no-store`, GET/HEAD only, `{id, content, updatedAt}`. Other public lists exclude page records (blog now means "not guide, not page").
- **Fallback states** (`usePageContent`): `loading` (defaults shown), `cms` (published document merged over defaults), `default` (404: nothing published), `unavailable` (network error, 5xx, not configured, or an invalid document: defaults shown). The page is never empty.
- **Preview**: the Studio embeds `/admin/preview/<page>`, a separate build of the real public components with the public stylesheet, in a same-origin iframe, and posts the working copy to it. It is served by the private worker behind Access (frame allowed only for that path). Widths 1440 / 768 / 390.

## What is editable per page (Studio → "Trang nội dung")

**/install (Cài đặt)** — all text of: page header (eyebrow, title, intro, amber notice); table-of-contents labels; step 1 (title, subtitle, requirement lists, AI app cards with status text and colour, GPT Bridge conditions); step 2 (intro, warning, package card text and version badge, download button label); step 3 (info, numbered steps, warning, danger note); step 4 (intro, warning, steps); step 5 (intro, connection-state cards, steps); step 6 (worker cards: name, status, colour, steps); step 7 (intro, steps, note, button label); step 8 (intro, example card with code block, lifecycle steps, note); step 9 (troubleshooting Q&A list, note text and link labels); security note; bottom navigation button labels. Lists and cards can be added, edited, reordered and removed; each of the 9 steps, the security note and the bottom navigation can be hidden. Every step also has an optional **Markdown** block (empty by default) with images from the media library and code.
**Code-controlled**: layout, icons, colours, the `/download`, `/prompts`, `/tutorials`, `/roadmap`, `/#community` link targets, the step structure and numbering, the accordion and copy-button behaviour. The release identity, file URL and SHA-256 live on `/download` and are untouched.

**/prompts (Prompt Kit)** — header texts and three badges; the verification-scope box; category names; every prompt (id, title, description, category, mode, workers, version, status, status note, date, and the prompt text itself kept character-for-character including newlines and indentation); quick-start steps with optional internal links; "how to use" steps; warning list; button labels. Prompts and categories can be added, reordered and removed; quick start, how-to, warning and the scope box can be hidden.
**Code-controlled**: status styling, search, filters, copy/download-.md behaviour, modal, layout.

**/tutorials (Video hướng dẫn)** — header texts, the "in production" notice, featured heading, category names, every video (id, title, description, category, YouTube link/id, duration, date, status `published | coming-soon | draft`, optional custom thumbnail chosen from or uploaded to the media library), and the "Video đang được sản xuất" box. Videos added in the Studio "Video" section still appear automatically.
**Code-controlled**: playback rules (only `published` with a real YouTube id is playable), the `youtube-nocookie` player, thumbnails fallback, layout.

Not editable by design: raw HTML or scripts, arbitrary URLs (links are internal paths or https; YouTube ids are validated), release/download logic, security settings, the number and order of the install steps.

## Content migration

- Inventory of the displayed content: `docs/page-content-inventory/{install,prompts,tutorials}.json` (generated from the registry).
- Idempotent import: `scripts/seed-page-content.mjs` → `docs/page-content-inventory/seed-page-content.sql` (insert-only, guarded by NOT EXISTS / OR IGNORE). Applied to D1 `aidesk-studio-staging`: 3 page records created as **drafts with the full snapshot and `published = null`** (so nothing changed publicly), plus 3 revisions and 3 audit events. A retry wrote 0 rows.
- Parity: the HTML of the pre-migration pages was frozen in `tests/fixtures/page-parity/*.html`. The new pages rendered with the code defaults, and with a CMS document seeded from the defaults, are **byte-identical** (whitespace-normalised) to those fixtures.

## Files

Added: `src/content/pageContent.ts`, `src/lib/usePageContent.ts`, `src/pages/StudioPageContent.tsx`, `src/pages/page-extra.css`, `src/page-preview-main.tsx`, `private/preview.html`, `vite.private-preview.config.ts`, `scripts/seed-page-content.mjs`, `docs/page-content-inventory/*`, `docs/page-content-screenshots/*`, `tests/page-content.test.ts`, `tests/page-content-api.test.ts`, `tests/fixtures/page-parity/*`, this report.
Modified: `src/pages/InstallPage.tsx`, `src/pages/PromptsPage.tsx`, `src/pages/TutorialsPage.tsx` (text and lists read from content; markup unchanged), `server/cms/{validation,repository,handler,publicContent}.ts`, `src/pages/StudioPage.tsx`, `src/pages/studio.css`, `src/lib/contentRepository.ts`, `src/data/studioFixtures.ts`, `functions-private/[[path]].ts` (preview route), `package.json` (private build runs the preview build), `local/cms-dev-worker.ts`, `wrangler.local.jsonc` (local dev only).

## Tests that passed

- `npm run check` — typecheck, lint, **250/250 tests** (34 new), public and private builds, Functions build, V2.5 artifact scan (no admin code in the public bundle; Studio CSS does not receive the public stylesheet).
- Parity (6 tests), field registry, overrides (texts, lists, items, hidden blocks, Markdown extra sanitised, download link unchanged), validation (unknown keys, bad shapes, `javascript:`/`//host`/`http:` links, bad ids, duplicate ids, bad statuses/dates/durations/YouTube/media ids, size limit), editorial boundary, idempotent import, draft/publish/second edit/draft-does-not-replace-live/archive/restore, field-level errors, section isolation (blog and guides never see pages), arbitrary slugs rejected, public endpoint read-only/uncached/DTO-limited, corrupted document fails closed, thumbnails public only through the published document.
- Local browser E2E (real Studio and the real public bundle, local D1/R2): full flow for all three pages, including preview at 1440/768/390, new step and reorder, hidden blocks, Markdown with callout and library image, a new prompt with code containing `<script>` (rendered as text, no execution), a YouTube link converted to an id with a library thumbnail and the playable modal, readable Vietnamese validation errors, persistence after full reload, archive and restore. No horizontal overflow at 390/768/1440 on any page or on the Studio editor.
- Live (below).

## Deployments and rollback

| Project | Deployment ID | Rollback reference |
| --- | --- | --- |
| `aidesk-studio-private` (Studio) | `cefe3f6a-6640-497f-bb8b-e01e11247794` | `dbbf2894-4686-48c4-a654-34fc94534479` |
| `webaidesk` (website) | `48487220-b5db-4e97-af1a-ab016838d974` | `7ee6d913-6f22-4e4c-8b4b-22a1acbde3d4` |

Order: backup → import (insert-only) → Studio → website. Bindings verified before and after (Studio: `CMS_DB`, `CMS_MEDIA`; website: `CMS_DB`, `CMS_MEDIA`, `RELEASES`). Rollback: Dashboard → Workers & Pages → project → Deployments → Rollback to the reference above. To disable a page's CMS content without rolling back, use "Gỡ khỏi website" in the Studio. The imported records are plain CMS rows and can stay.

## Live verification (with the owner's Access session)

- Before the first publish the website pages were unchanged: `/api/content/pages/*` returned 404 and the screenshots of `/install`, `/prompts` and `/tutorials` at 390 and 1440px match the "before" ones (`docs/page-content-screenshots/before-LIVE-*` vs `after-LIVE-*`).
- Studio (deployed, behind Access): the three pages list with their imported drafts; the live preview iframe renders the real `/install` page and updates as the title is edited, before saving.
- *Save draft* left the public API at 404; *Publish* made `webaidesk.pages.dev/install` show the new title immediately (9 steps, 9 TOC entries, `/download` button unchanged, no overflow) with no website deployment; a second edit was published; then the page was taken off the website and the original title returned. Finally the stored draft was reset to the code defaults so a later "Xuất bản" cannot publish test text.
- `/download` 200 and the V0.3.0 file URL answers 200 with 120,629,335 bytes; the private host redirects to Access for `/`, `/admin/pages`, `/admin/preview/*` and `/api/admin/*`; the public site returns 404 for `/api/admin/*`; `/blog` and `/guides` still load.
- Current state: `/install` record archived (public uses the identical code content), `/prompts` and `/tutorials` records are drafts. Nothing from the CMS is publicly active until the owner presses "Xuất bản" on a page.

## Limitations and unfinished

- The structure of /install (nine steps, their order and icons) is fixed in code; owners can hide steps and add Markdown blocks but not add a new numbered step section. Table-of-contents labels are fixed to nine entries.
- Pages render in the browser: defaults appear first and CMS values replace them after the API answers (a brief change of text for pages that have published edits); crawlers see the shell only.
- No UI to browse or restore earlier revisions (they are stored in D1 `cms_content_revisions`).
- The upload-from-file button ("Tải ảnh lên") uses the existing media upload API; its file chooser was not driven in the browser test (library selection and insertion were).
- The Studio preview omits the site navigation and footer and starts at 1440px width.
- Public thumbnails and inline images use the public media route, which serves only images referenced by the published document and may stay cached up to 5 minutes after removal.
- Local `wrangler dev` servers started for testing (ports 8787-8790) may still be running; stop them with Ctrl+C in their terminals.
