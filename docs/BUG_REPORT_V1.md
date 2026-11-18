# Bug report V1 — "Gửi báo lỗi" (phía website)

Ngày: 2026-11-18. Trạng thái: **code + test offline xong, CHƯA tạo tài nguyên Cloudflare, CHƯA deploy, CHƯA commit.**

Người dùng bấm **Gửi báo lỗi** trong AI Desk, xem trước nội dung, rồi app POST lên website. Website trả mã `BR-XXXXXX`
để người dùng gửi cho Owner. Chỉ gửi thủ công do người dùng bấm — không có telemetry tự động.

## Hợp đồng API (cố định — app desktop đang build theo)

`POST https://webaidesk.pages.dev/api/bug-report`, `Content-Type: application/json`

```json
{ "schema": "AIDESK_BUG_REPORT_V1", "appVersion": "0.5.0-beta.1", "channel": "beta",
  "os": "Windows 11 ...", "description": "≤ 4000 ký tự", "bundle": { } }
```

| Kết quả | HTTP | Body |
|---|---|---|
| Thành công | 200 | `{ "ok": true, "reportId": "BR-7K2M9Q" }` (6 ký tự Crockford base32, duy nhất) |
| Sai dữ liệu | 400 | `{ "ok": false, "error": "INVALID_CONTENT_TYPE" \| "ORIGIN_REJECTED" \| "INVALID_JSON" \| "INVALID_SCHEMA" \| "INVALID_APP_VERSION" \| "INVALID_CHANNEL" \| "INVALID_OS" \| "INVALID_DESCRIPTION" \| "INVALID_BUNDLE" }` |
| Quá lớn | 413 | `PAYLOAD_TOO_LARGE` — cả body > 1 048 576 byte (1 MiB). Chặn theo `Content-Length` trước khi đọc, và chặn cả trên luồng đọc |
| Quá nhiều | 429 | `RATE_LIMITED` — 5 báo lỗi/giờ và 20/ngày cho mỗi IP (IP chỉ lưu dạng SHA-256 có salt), tổng 1000/ngày cho mọi IP |
| Lỗi máy chủ | 500 | `NOT_CONFIGURED` (thiếu binding) hoặc `SERVER_ERROR` |
| Sai method | 405 | `METHOD_NOT_ALLOWED` |

Không có Turnstile (người gọi là app Electron). Request **không có** header `Origin` (main process) luôn được nhận;
request có `Origin` khác website bị từ chối. Trường thừa ở cấp trên cùng được bỏ qua.

Tóm tắt rút ra từ bundle để lọc trong admin: `bundle.failures[].errorCode` → mã lỗi; `bundle.workers[]`
(chuỗi hoặc object có `id`/`name`/`kind`/`adapter`) và `bundle.failures[].worker | workerId | adapter` → danh sách worker
(chữ thường). Tối đa 20 giá trị mỗi loại.

## Lưu trữ

- D1 (`CMS_DB`, cùng database với Studio): bảng `bug_reports` + `bug_report_attempts` (`migrations/0007_bug_reports.sql`).
- R2 **riêng tư** `BUG_REPORTS`: nguyên văn body người dùng đã xem trước, key `bug-reports/<yyyy-mm>/<BR-id>.json`.
  Không bao giờ phục vụ công khai; chỉ tải được qua admin Studio (sau Cloudflare Access).

## Admin (Studio riêng tư → mục "Báo lỗi")

- `GET /api/admin/bug-reports?appVersion=&channel=&errorCode=&worker=&limit=&cursor=` — mới nhất trước, phân trang keyset.
- `GET /api/admin/bug-reports/facets` — giá trị cho các ô lọc (kèm số lượng).
- `GET /api/admin/bug-reports/<BR-id>` — một báo lỗi. `GET /api/admin/bug-reports/<BR-id>/bundle` — tải JSON gốc
  (`attachment`, `private, no-store`, CSP sandbox).
- Chỉ đọc (không sửa/xóa). Cùng cơ chế xác thực Access + giới hạn tốc độ như phần admin hiện có.

## File

Mới: `server/bugReportRules.ts`, `server/bugReportHandler.ts`, `functions/api/bug-report.ts`,
`functions-public/api/bug-report.ts`, `server/cms/bugReports.ts`, `migrations/0007_bug_reports.sql`,
`src/lib/bugReportsApi.ts`, `src/pages/StudioBugReports.tsx`, `tests/bug-report.test.ts`, tài liệu này.
Sửa: `server/cms/handler.ts` (+1 route), `server/cms/types.ts` (+`BUG_REPORTS`), `src/pages/StudioPage.tsx` (+mục nav),
`src/pages/studio.css`, `tests/artifact-separation.test.ts`, `wrangler.*.jsonc.example` (4 file), `wrangler.toml.example`.
Không sửa file wrangler thật.

## Việc Owner cần làm (theo thứ tự)

1. **Áp migration** vào D1 đang gắn là `CMS_DB` cho cả `webaidesk` và `aidesk-studio-private`
   (lệnh này áp mọi migration còn thiếu, gồm `0007_bug_reports.sql`):
   ```bash
   npx wrangler d1 migrations list aidesk-studio-staging --remote --config wrangler.private.staging.jsonc
   npx wrangler d1 migrations apply aidesk-studio-staging --remote --config wrangler.private.staging.jsonc
   ```
   (Thay tên database/config nếu môi trường thật dùng tên khác.)
2. **Tạo bucket R2 riêng tư**: `npx wrangler r2 bucket create aidesk-bug-reports`.
   KHÔNG bật Public access, KHÔNG bật r2.dev, KHÔNG gắn custom domain.
3. **Gắn binding** (Dashboard → Pages → Settings → Bindings, hoặc trong file wrangler thật đang dùng để deploy, chép từ `.example`):
   - `webaidesk` (public): R2 `BUG_REPORTS` → `aidesk-bug-reports`; D1 `CMS_DB` (nếu chưa có).
     Secret `IP_HASH_SALT` nếu chưa đặt: `npx wrangler pages secret put IP_HASH_SALT --project-name webaidesk`.
   - `aidesk-studio-private`: R2 `BUG_REPORTS` → `aidesk-bug-reports` (D1 `CMS_DB` đã có cho Studio).
   - Lưu ý: nếu deploy bằng một file wrangler có sẵn (vd. `wrangler.public.jsonc` hiện **không có** binding nào) thì
     Pages lấy file đó làm nguồn duy nhất → phải thêm binding vào file đó, nếu không API trả `500 NOT_CONFIGURED`.
4. **Build + deploy** cả hai: `npm run check` rồi
   ```bash
   npx wrangler pages deploy dist-public --project-name webaidesk --branch main
   npx wrangler pages deploy dist-private --project-name aidesk-studio-private --branch <nhánh Studio đang dùng>
   ```
5. **Thử thật một lần**: gửi 1 báo lỗi từ bản desktop (hoặc `curl` với body mẫu ở trên) → nhận `BR-…` →
   mở Studio → "Báo lỗi" → thấy dòng mới → bấm "Tải JSON".

## Chưa làm / lưu ý

- Chưa có xóa/thời hạn lưu trữ. Gợi ý: lifecycle rule R2 tự xóa sau N ngày (và dọn dòng D1 tương ứng) — cần Owner quyết.
- UI Studio chưa xem trên trình duyệt thật (cần Access + D1); đã qua typecheck, build, test API.
