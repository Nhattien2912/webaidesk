# Studio V2 API contract

Mọi response lỗi: `{ "error": { "code", "message", "fieldErrors?", "requestId" } }`. Admin responses và errors dùng `Cache-Control: no-store`; public published responses cache ngắn và có stale-while-revalidate.

## Public read-only

- `GET /api/content/videos?limit=&cursor=`
- `GET /api/content/articles?limit=&cursor=`
- `GET /api/content/articles/:slug`
- `GET /api/content/apps?limit=&cursor=`
- `GET /api/content/apps/:slug`

Chỉ trả bản ghi `published`, chưa soft-delete. Không có public POST/PATCH/DELETE.

## Admin

- `GET /api/admin/session`: identity đã xác minh và CSRF token dùng trong bộ nhớ trang.
- `GET|POST /api/admin/{videos|articles|apps}`
- `GET|PATCH|DELETE /api/admin/{videos|articles|apps}/:id`
- `GET /api/admin/{kind}/:id/revisions`
- `POST /api/admin/media` với Content-Type ảnh, `X-Image-Width`, `X-Image-Height`, `X-Alt-Text`.

Mutation gửi `X-CSRF-Token`, exact Origin và `version` khi sửa/archive. `DELETE` là archive/soft-delete semantic, không xóa lịch sử. Kết quả 409 yêu cầu client reload/merge thay vì tự retry mutation.

Giới hạn JSON 256 KiB; Markdown 200.000 ký tự; media 5 MiB. External URL phải là HTTPS. Video chỉ lưu YouTube ID đã parse, không nhận iframe HTML.
