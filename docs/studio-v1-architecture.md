# AI Desk Studio V1 — kiến trúc chuyển tiếp CMS

## Trạng thái hiện tại

Studio là prototype chỉ hoạt động khi Vite đặt `import.meta.env.DEV=true`. Production build trả trang 404 cho mọi đường dẫn `/admin*`. Dữ liệu quản trị là fixture trong bộ nhớ phiên, không có mật khẩu giả, credential, API ghi, D1 hay R2 production.

Frontend được tách thành ba lớp để không phải viết lại khi thêm backend: kiểu dữ liệu/validation (`src/lib/studio.ts`), màn hình editor/list, và adapter dữ liệu tương lai. Các trang public chỉ đọc bản ghi `published`; hiện tại collection rỗng nên không giả nội dung đã phát hành.

## Biên bảo mật đề xuất

Cloudflare Access bảo vệ cả `/admin*` và `/api/admin/*`. Pages Functions phải xác minh Access JWT ở server: chữ ký theo JWKS, issuer, audience, expiration và danh tính/nhóm được phép. Thiếu bất kỳ cấu hình nào phải fail closed. Frontend không quyết định quyền bằng email hoặc trạng thái UI.

- Bắt buộc MFA/passkey trong Access; session ngắn, có thể thu hồi.
- Cookie `Secure`, `HttpOnly`, `SameSite=Lax/Strict`; mutation dùng CSRF token gắn với session và kiểm Origin.
- Rate limit theo principal + IP; schema validation server-side, giới hạn kích thước và chiều sâu payload.
- Markdown lưu dạng nguồn; render bằng pipeline allowlist/sanitize, không nhận HTML tùy ý.
- Mọi mutation tạo `ContentRevision` và `AuditEvent`; soft delete, không xóa revision/audit cùng bản ghi.
- Backup D1 theo lịch, diễn tập restore; media dùng R2 bucket riêng, không chung bucket installer/release.
- Media kiểm magic bytes/MIME, giới hạn dung lượng/số lượng, tên object do server sinh; mặc định từ chối SVG/HTML/script và không overwrite key client cung cấp.
- Quyền `content:write`, `content:publish`, `media:write` tách khỏi `release:manage`. CMS không được chạm release metadata, installer hoặc security gates.

## Schema D1 tối thiểu

`contents(id, kind, slug, title, summary, status, category_id, featured, body_markdown, seo_title, meta_description, created_at, updated_at, published_at, archived_at, deleted_at, version)` là lõi chung. Bảng chi tiết: `videos(content_id, youtube_id, display_order)`, `applications(content_id, tagline, platforms_json, development_status, website_url, download_url, github_url)`. `media(id, object_key, mime, bytes, width, height, alt_text, created_at, deleted_at)`, `content_media(content_id, media_id, role, position)`, `categories`, `tags`, `content_tags`, `content_revisions(id, content_id, version, snapshot_json, actor_id, created_at)`, `audit_events(id, actor_id, action, entity_type, entity_id, metadata_json, created_at)`.

Unique index cho `(kind, slug)` với bản ghi chưa soft-delete. Mutation dùng optimistic concurrency qua `version`; publish transaction đồng thời ghi revision và audit.

## API contract

- `GET /api/content/{kind}` và `GET /api/content/{kind}/{slug}`: public, chỉ trả published, cacheable.
- `GET /api/admin/content?kind=&status=&q=&cursor=`: danh sách admin có cursor.
- `POST /api/admin/content`: tạo draft; body phân biệt theo `kind`.
- `GET|PATCH|DELETE /api/admin/content/{id}`: đọc, cập nhật có `If-Match/version`, soft delete.
- `POST /api/admin/content/{id}/transition`: `{ status, version }`; server kiểm state machine và quyền publish.
- `GET /api/admin/content/{id}/revisions` và `POST .../revisions/{revisionId}/restore`.
- `POST /api/admin/media/uploads`: tạo upload session có giới hạn; finalize chỉ sau content inspection.
- `GET|PATCH|DELETE /api/admin/media/{id}`: metadata, alt text, soft delete khi không còn tham chiếu.

Response lỗi thống nhất: `{ error: { code, message, fieldErrors?, requestId } }`. Không phản chiếu stack hoặc thông tin Access. Idempotency key cho create/publish. URL YouTube được chuẩn hóa thành ID, không lưu iframe/embed domain tùy ý.

## Lộ trình chuyển đổi

1. Tạo D1 migrations và repository adapter, giữ nguyên model/form hiện có.
2. Đặt Access policy staging, thêm middleware JWT fail-closed và integration tests trước mutation đầu tiên.
3. Thay fixture adapter bằng fetch adapter; giữ optimistic UI nhưng rollback theo response/version.
4. Thêm R2 media bucket riêng, scanning/inspection và signed delivery policy.
5. Bật preview staging, audit/backup/restore và kiểm thử phân quyền.
6. Chỉ mở production Admin/API sau security review; không thay đổi luồng release AI Desk.
