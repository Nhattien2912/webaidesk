# AI Desk Studio V2.1 — local persistence và comments

## Kiến trúc và ranh giới bảo mật

`npm run cms:dev` build frontend với API adapter rồi chạy `wrangler dev` bằng `wrangler.local.jsonc`. Worker local-only trong `local/cms-dev-worker.ts` phục vụ static assets, Pages-compatible handlers và D1 local. Nó chèn một identity cố định ở phía server cho vòng lặp phát triển; file này không nằm trong `functions/` và không được staging config tham chiếu. Các Pages Functions deployable vẫn gọi Access verifier thật và fail closed khi thiếu cấu hình.

Luồng thật: Studio UI → `ApiRepository` → CMS handler → D1 local → response → UI. Demo mode vẫn là mặc định của `npm run dev`; Real Local CMS có badge riêng và không dùng React state/localStorage làm storage.

## Chạy trên Windows CMD

```cmd
cd /d C:\Users\clubb\Desktop\WedAiDesk
npm run cms:migrate:local
npm run cms:dev
```

Mở `http://127.0.0.1:8787/admin`. Dữ liệu nằm dưới `.wrangler\state\cms-v2-1\v3\d1` và được Git ignore. Dừng server trước khi backup, sau đó sao chép toàn bộ `.wrangler\state\cms-v2-1` sang vị trí an toàn. Không đưa SQLite local vào Git.

## Kiểm tra database

```cmd
npm run cms:inspect:local
npx wrangler d1 migrations list aidesk-studio-local --local --config wrangler.local.jsonc --persist-to .wrangler/state/cms-v2-1
npx wrangler d1 execute aidesk-studio-local --local --config wrangler.local.jsonc --persist-to .wrangler/state/cms-v2-1 --command "SELECT id,title,status,version FROM cms_contents WHERE kind='article';"
npx wrangler d1 execute aidesk-studio-local --local --config wrangler.local.jsonc --persist-to .wrangler/state/cms-v2-1 --command "SELECT id,display_name,status,created_at FROM cms_comments WHERE deleted_at IS NULL;"
```

## Migration và API comments

Migration `0004_comments.sql` tạo `cms_comments` và `cms_comment_rate_limits`. Comment chỉ gắn với `article` hoặc `app` published, mặc định `pending`, có optimistic `version`, moderation metadata và soft delete. Dữ liệu chống abuse là HMAC của IP, không lưu IP thô.

- `GET /api/content/articles/:slug/comments`
- `GET /api/content/apps/:slug/comments`
- `POST /api/comments`
- `GET /api/admin/comments?status=&q=`
- `PATCH /api/admin/comments/:id`
- `DELETE /api/admin/comments/:id`

Public GET chỉ chọn `approved` và chỉ trả id, tên hiển thị, body text, thời gian và parentId. POST giới hạn 16 KiB, tên 2–60, body 5–2000, text-only, rate limit 5 lần/10 phút/HMAC key, xác minh published content và Turnstile trước khi ghi. Moderation yêu cầu Access + Origin + CSRF, version check và ghi audit.

## Turnstile comments

Staging cần đặt server secrets `COMMENTS_TURNSTILE_SECRET_KEY`, `COMMENTS_IP_HASH_SECRET`; vars `COMMENTS_TURNSTILE_ALLOWED_HOSTNAMES`, `COMMENTS_TURNSTILE_ACTION=comment`; và frontend `VITE_COMMENTS_TURNSTILE_SITE_KEY`. Không dùng waitlist action cho comments. Local worker có verifier test chỉ trong local boundary; production/staging Functions không import nó.

## Kiểm thử và staging blockers

`npm run cms:test:local` chạy 20 case comments cùng CMS security suite. Trước staging cần chủ sở hữu tạo D1/R2 riêng, Access applications cho `/admin*` và `/api/admin*`, secrets, hostname/site key Turnstile, backup/restore drill và review policy retention. Không có tài nguyên live nào được tạo hay deploy trong V2.1.
