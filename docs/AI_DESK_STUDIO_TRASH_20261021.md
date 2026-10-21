# AI Desk Studio — Trash, Restore and guarded Permanent Delete (2026-10-21)

## States (kept strictly separate)

| State | Storage | In Studio lists | Public APIs | How to leave |
| --- | --- | --- | --- | --- |
| **Archived** | `status='archived'`, `deleted_at IS NULL` | yes (filter "Lưu trữ") | never | change status to Draft/Published |
| **Trashed** | `deleted_at IS NOT NULL` (status, row, revisions and media kept) | only in **Thùng rác** | never (lists, detail, comments, cover media all 404/absent) | **Khôi phục** → returns as **Draft** |
| **Permanently deleted** | row, its revisions and link rows removed | nowhere | never | not reversible |

Fixed website pages (`/install`, `/prompts`, `/tutorials`, FAQ, Changelog) are `section='page'` records. They can never be trashed, restored or purged (server returns `page_protected`). Removing a custom publication stays the existing "Gỡ khỏi website" (archive) workflow, which returns the route to its code defaults.

## Backend

- `server/cms/trash.ts` (new): `GET /api/admin/trash`, `POST /api/admin/{articles|guides|videos|apps}/:id/trash`, `POST /api/admin/trash/:id/restore`, `POST /api/admin/trash/:id/purge`.
- Reused the existing `deleted_at` column, partial unique slug index, revisions and audit tables. The only migration is `0006_trash_index.sql` (an index; no data change).
- Every mutation is one D1 batch (state change + revision + audit), guarded by `version` and a per-request mutation id. Repeated trash/restore are idempotent (`alreadyTrashed` / `alreadyRestored`, no duplicate audit rows). Stale versions return `409 version_conflict`.
- Restore always returns the item as **Draft** (never silently public). Slug collision → `409 slug_conflict` with a suggested slug; a new slug can be supplied. Missing referenced media is reported (`missingMediaIds`), not dropped.
- Authentication (Access JWT + owner allow-list), Origin and CSRF are enforced by the existing `authorize()` for every POST.
- Permanent delete: needs `CMS_PERMANENT_DELETE_ENABLED=true`, the item already in Trash, the exact phrase `XOA VINH VIEN`, the exact slug, the current version, and **zero comments** (`has_comments` otherwise). It deletes (atomically, each statement guarded by the same version check) link rows, revisions and the content row, and writes a minimal audit event (`kind`, `slug`, `lastVersion`; no title/body). `cms_media` rows and R2 objects are never touched (media may be shared). Any foreign-key surprise rolls the whole batch back and leaves the item in Trash.
- No bulk delete and no automatic Trash cleanup exist.

## Studio UI

"Xóa bài" in the editor sidebar (danger zone), in every list table, on the dashboard table and in "Tất cả nội dung"; confirmation dialog explains impact; new **Thùng rác** section (search, type filter, cursor pagination, title/type/original status/deleted time, **Khôi phục** and **Xóa vĩnh viễn**). Permanent delete needs the slug and `XOA VINH VIEN` typed. Dialogs are modal, keyboard-trapped, Escape-closable, with loading state and Vietnamese errors. Checked at 390/768/1440 px without horizontal overflow.

## Tests

`tests/trash.test.ts` (24) + `tests/trash-ui.test.ts` (3): all four content types, public leak (lists, detail, comments, cover media) for published/draft/archived, restore-to-draft + explicit publish, idempotency, version conflicts, slug collision, missing media, pagination with equal timestamps, protected pages, purge guards (flag, phrase, slug, state, version, comments), purge atomicity/audit minimality/R2 untouched, unauthenticated/CSRF/Origin/non-owner rejection, malformed/oversized input, inert hostile titles. Full suite 292/292, typecheck, lint, builds, V2.5 artifact scanner pass. All destructive tests use synthetic in-memory data.

## Delivery and rollback

- Source checkpoint + pre-change D1 export: `WedAiDesk_checkpoints/trash_20261021_205502` (`d1_pre_trash.sql`, SHA-256 `21ba508ac309834fdd667f29b2720b312db23a2cbd86832bf3593988ee54eb20`).
- Remote migration applied: `0006_trash_index.sql` (index only).
- Private Studio deployed: `705488f9-1c59-4b07-8ab6-ca815dd15917`. Previous deployment (rollback target): `410367bf-57e0-48d9-b17d-015043e8ef41`.
- Public website was not redeployed (its bundle does not change): `a154cff2-27f6-4c1c-b78b-3e182f65dbcd`.
- Rollback: Cloudflare Dashboard → Workers & Pages → `aidesk-studio-private` → Deployments → roll back to `410367bf-…`. The index can stay; it is harmless. `CMS_PERMANENT_DELETE_ENABLED` is a plain var in the private deploy config: remove it (or set it to `false`) and redeploy to disable permanent delete.

## Limitations

- Public media responses are cached up to 5 minutes (`max-age=300`), so a trashed article's cover image can remain fetchable by direct URL for up to that long.
- Permanent delete is blocked while comments exist (by design); moderate/delete comments first.
- The media-cleanup dry run does not yet account for media used only by trashed content (it is dry-run only and deletes nothing).
- Permanent delete was exercised only on synthetic local data; it was not run against any live record.
