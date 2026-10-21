# AI Desk Studio — Independent Security Audit (Claude)

| | |
|---|---|
| Auditor | Claude (độc lập với Codex) — vai trò Application Security Auditor / Red Team Reviewer |
| Ngày | 2026-10-19 (snapshot mã nguồn ~17:15 +07:00) |
| Repository | `C:\Users\clubb\Desktop\WedAiDesk`, branch `feature/website-v3-premium-light` (HEAD `6ef0c74`) + toàn bộ file **chưa commit** |
| Phạm vi | Pages Functions `functions/api/{admin,content,comments}`, `server/cms/*`, `server/turnstile.ts`, migrations `0002–0004`, `local/cms-dev-worker.ts`, `scripts/cms-local.mjs`, `wrangler.{local,staging}.jsonc`, `src/pages/StudioPage.tsx`, `src/pages/PublicContentPages.tsx`, `src/lib/contentRepository.ts`, `src/App.tsx`, `public/_headers` |
| Chế độ | READ-ONLY với source. Không commit/push/deploy, không chạm Cloudflare/production. PoC chạy trên Node + D1 **local in-memory** (wrangler `getPlatformProxy`), thư mục tạm ngoài repo |

> **Lưu ý về tính đồng thời:** trong lúc audit, `src/pages/StudioPage.tsx` được chỉnh sửa (75 → 974 dòng, khả năng cao là reformat do Codex) và `dist/` được build lại ít nhất 2 lần. Ngoài ra, lúc 17:17, `local/cms-dev-worker.ts` và `wrangler.local.jsonc` có một thay đổi nhỏ (hostname Turnstile giả lập `localhost` → `local.invalid`, không ảnh hưởng bảo mật). Toàn bộ `server/cms/*`, `functions/api/*` và migrations **không đổi** trong suốt quá trình audit. Các phát hiện gắn với hash SHA-256 ở Phụ lục A (lấy lúc kết thúc audit). Nếu file đã thay đổi, cần đối chiếu lại số dòng.

---

## 1. Tóm tắt điều hành

**Không phát hiện lỗ hổng Critical hoặc High.** Nhóm kiểm soát cốt lõi đã được xác minh bằng PoC chạy mã thật:

- Không đăng nhập thì **không thể** gọi API để xuất bản/sửa/lưu trữ bài, duyệt/xóa bình luận hay upload media. Đã thử cả khi không có token, token `alg=none` và header `cf-access-authenticated-user-email` giả mạo: tất cả trả 401/503 và không có dòng nào được ghi vào D1.
- Hàm `verifyAccess` (jose, RS256) chống được: `alg=none`, nhầm khóa HS256 (khóa công khai dùng làm HMAC secret), khóa giả mạo trùng `kid`, header `jwk`/`jku` nhúng, sai `iss`/`aud`, hết hạn, `nbf` ở tương lai, email ngoài allowlist hoặc thiếu email. Allowlist được kiểm tra ở server; thiếu cấu hình thì fail closed với 503.
- Mutation bị chặn khi Origin lạ, khi `Sec-Fetch-Site: cross-site`, hoặc khi thiếu/sai CSRF token. Preflight không trả ACAO cho origin lạ.
- API public chỉ trả bản `published`. Draft và archived không lộ qua list hay slug. Bình luận pending không bao giờ public. Lưu trữ một bài thì ẩn luôn các bình luận đã duyệt của bài đó.
- Khách chỉ tạo được bình luận `pending`: trường `status`/`version` do khách gửi lên bị bỏ qua. Turnstile được xác minh ở server, có kiểm tra cả action và hostname. Rate limit lưu trong D1 (không phụ thuộc bộ nhớ isolate) và key là HMAC(IP), IP thô không được lưu.
- Mã CMS không tham chiếu tới binding `RELEASES`. `wrangler.staging.jsonc` chỉ bind `CMS_MEDIA` vào bucket riêng `aidesk-studio-media-staging`. Key media có dạng `content/YYYY-MM/<uuid>.<ext>` nên không thể ghi đè installer.

Các phát hiện đáng xử lý nhất là **2 lỗi Medium đã xác nhận**: (1) nhầm lẫn loại nội dung (kind confusion), dẫn tới bỏ qua validation URL của App; (2) audit log ghi "success" cho thao tác kiểm duyệt bị từ chối 409. Ngoài ra còn một số mục Low và Info.

**Release gate:** Staging được **CONDITIONAL GO**. Production hiện là **NO-GO**. Lý do không phải lỗ hổng, mà là thiếu bằng chứng: chưa có kiểm thử Cloudflare Access thật trên staging, build đang lỗi (`tsc -b` fail), và chưa diễn tập backup/restore (chi tiết ở mục 7).

| Severity | Confirmed | Potential risk | Hardening | Tổng |
|---|---|---|---|---|
| Critical | 0 | 0 | – | 0 |
| High | 0 | 0 | – | 0 |
| Medium | 2 | 0 | – | 2 |
| Low | 4 | 2 | 3 | 9 |
| Info | 4 | – | 2 | 6 |

---

## 2. Phương pháp & bằng chứng đã chạy

| Hoạt động | Kết quả |
|---|---|
| Đọc thủ công toàn bộ file trong phạm vi (kể cả các file untracked) | Hoàn tất |
| `npm test` (152 test) | **PASS 152/152** |
| `npx tsc -b` | **FAIL**: `src/lib/contentRepository.ts(7,59): TS1294 … 'erasableSyntaxOnly'` → `npm run build` / `npm run check` fail |
| `npx oxlint` | 1 warning (`react-hooks/exhaustive-deps`, StudioPage `load`) |
| `npm audit --omit=dev` | **0 vulnerabilities** (runtime: `jose 6.2.12`, react, framer-motion, lucide) |
| `npm audit` (full) | 5 high + 2 moderate, tất cả **build-time** qua `tailwindcss@3.4.17` → `braces`, `micromatch`, `chokidar`, `fast-glob`, `postcss-selector-parser`, `postcss-nested` (ReDoS/CPU DoS lúc build; không có trong bundle runtime) |
| PoC JWT (`jwt.poc.ts`, 10 test, chạy `verifyAccess` thật với RSA key sinh tại chỗ, JWKS được phục vụ bằng mock `fetch`) | **10/10 hành vi đúng kỳ vọng** |
| PoC D1 (`d1.poc.ts`, 12 test, handler thật trên D1 SQLite local qua `getPlatformProxy`, áp migrations thật) | **12/12 chạy**; xác nhận STUDIO-01, 02, 03, 05, 08 |
| Kiểm tra `dist/` | Lúc 17:16, `dist/assets/index-C6gqTLWW.js` chứa Turnstile test sitekey `1x00000000000000000000AA` và Studio UI (xem STUDIO-09) |

PoC nằm ngoài repo (`%TEMP%\studio-audit-poc\`) để tuân thủ yêu cầu read-only. Đoạn mã cốt lõi được trích ở Phụ lục B để Codex có thể đưa vào `tests/`.

---

## 3. Danh sách phát hiện

Ký hiệu loại: **[CONFIRMED]** lỗ hổng đã xác nhận bằng PoC · **[POTENTIAL]** rủi ro tiềm ẩn chưa khai thác được trong mã hiện tại · **[HARDENING]** khuyến nghị gia cố · **[NOT TESTED]** xem mục 6.

### STUDIO-01 — Kind confusion: PATCH/GET theo ID không ràng buộc loại nội dung → bỏ qua validation URL của App · **Medium** · [CONFIRMED]

- **CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key) / CWE-20; OWASP API1:2023 BOLA, A04 Insecure Design
- **Vị trí:** `server/cms/handler.ts:44-45`, `server/cms/repository.ts:25` (`byId` chỉ lọc `id`), `server/cms/repository.ts:35-37`
- **Root cause:** `validateContent(body, kind)` dùng `kind` lấy từ **URL** (`/api/admin/articles/...`). Trong khi đó `repo.update(id, ...)` nạp bản ghi theo `id` mà không kiểm tra `kind` và giữ nguyên `current.kind`. Gọi `PATCH /api/admin/articles/<appId>` nên áp luật validation của *article* (không kiểm URL) lên bản ghi *app*.
- **Kịch bản tấn công:** Kẻ đã có phiên Admin (scenario C, hoặc một XSS sau này trong Studio) gửi `PATCH /api/admin/articles/<appId>` với `{"data":{"downloadUrl":"javascript:alert(document.domain)"}}`. Bản ghi app vẫn `published` và API public `/api/content/apps/<slug>` trả về URL độc hại. Cách tương tự bỏ qua được kiểm tra `youtubeId` của video.
- **Bằng chứng (PoC D1):** `PATCH apps/<id>` → **400** (đúng); `PATCH articles/<id>` → **200**; API public trả `{"downloadUrl":"javascript:alert(document.domain)"} kind= app`. Ngoài ra `GET /api/admin/videos/<appId>` → 200.
- **Phạm vi ảnh hưởng:** Hiện tại `PublicContentPages.tsx` **chưa** render `data.downloadUrl`/`websiteUrl` thành `href`, nên chưa thực thi được XSS. Rủi ro sẽ thành **stored XSS hoặc phishing tải installer giả** ngay khi trang App hiển thị nút "Tải xuống". Lỗi này vô hiệu hóa đúng lớp phòng thủ mà `validation.ts:33` được viết ra để bảo vệ.
- **Khắc phục:** Ràng buộc `kind` ở tầng repository: `byId(id, kind)` → `WHERE id=?1 AND kind=?2 AND deleted_at IS NULL`, áp dụng cho GET/PATCH/DELETE/revisions, đồng thời thêm `AND kind=?` vào câu `UPDATE`. Ngoài ra nên dùng allowlist key cho `data` theo từng kind (bỏ key lạ), và frontend phải kiểm `https:` lần nữa trước khi render `href`.
- **Test chống tái phát:** `PATCH /api/admin/articles/<appId>` → 404; `GET /api/admin/videos/<articleId>` → 404; `validateContent` với key `data` lạ → bị loại.

### STUDIO-02 — Audit log ghi "success" cho thao tác kiểm duyệt/xóa bị từ chối (409) và cho ID không tồn tại · **Medium** · [CONFIRMED]

- **CWE:** CWE-778 (Insufficient Logging) / CWE-117 (audit ghi sai sự thật); OWASP A09 Security Logging & Monitoring Failures
- **Vị trí:** `server/cms/comments.ts:47` (PATCH), `server/cms/comments.ts:48` (DELETE)
- **Root cause:** `UPDATE … WHERE version=?` và `INSERT INTO cms_audit_events … 'success'` chạy chung một `batch()`. Khi UPDATE ảnh hưởng 0 dòng, D1 không coi đó là lỗi, nên transaction vẫn commit. Handler trả 409 nhưng audit event "success" đã được ghi.
- **Kịch bản:** (a) Kẻ chiếm phiên gửi hàng loạt `DELETE /api/admin/comments/<random>` để làm nhiễu và giả mạo audit trail ("đã xóa X" trong khi X không tồn tại); (b) khi điều tra sự cố, audit cho thấy một bình luận đã bị "ẩn" dù thực tế nó vẫn được duyệt và hiển thị public.
- **Bằng chứng (PoC D1):** `moderate audit rows: before=1 after-stale-409=2`; `DELETE comments/nonexistent-id` → 409 nhưng có 1 dòng `comment.delete … success`.
- **Phạm vi:** Tính toàn vẹn của audit, là kiểm soát bảo mật mà tài liệu kiến trúc dựa vào. Không lộ dữ liệu.
- **Khắc phục:** Dùng một câu INSERT có điều kiện, ví dụ `INSERT INTO cms_audit_events … SELECT … WHERE changes()=1`, hoặc `INSERT … SELECT … FROM cms_comments WHERE id=?3 AND version=?(new)`. Cách khác: chạy UPDATE trước, kiểm tra `meta.changes`, rồi mới ghi audit (hoặc ghi `outcome='failure'`). Nên áp dụng cùng mẫu này cho `repository.update`.
- **Test:** PATCH với version cũ → 409 **và** số audit `success` không đổi; DELETE ID không tồn tại → 404 và không có audit `success`.

### STUDIO-03 — Race/duplicate slug bị báo sai thành `400 invalid_json`; lỗi DB không được phân loại · **Low** · [CONFIRMED]

- **CWE:** CWE-362 (đã được giảm nhẹ), CWE-755 (Improper Handling of Exceptional Conditions)
- **Vị trí:** `server/cms/repository.ts:36-43`, `server/cms/handler.ts:43,45` (`catch` gộp mọi lỗi thành `invalid_json`)
- **Root cause:** Bước kiểm tra version trong `update()` là đọc-rồi-ghi (TOCTOU). Khi hai PATCH đồng thời, ràng buộc `UNIQUE(content_id, version)` của revisions làm batch thứ hai rollback, nên **dữ liệu vẫn toàn vẹn**. Tuy nhiên exception bị `catch` đổi thành 400 `invalid_json`. Tạo bài trùng slug (vi phạm unique index) cũng trả 400 `invalid_json`.
- **Bằng chứng (PoC D1):** `race statuses: [200, 400]`, body `{"error":{"code":"invalid_json"…`; chỉ có 1 revision version 2.
- **Phạm vi:** Không có lost update. UX sai: Studio không hiện "Xung đột phiên bản" mà hiện "API 400" khó hiểu; monitoring cũng không phân biệt được tấn công với lỗi thường.
- **Khắc phục:** Chỉ bắt `SyntaxError` cho JSON. Map lỗi UNIQUE của revisions sang 409 `version_conflict` và lỗi unique slug sang 409 `slug_conflict`. Các lỗi khác trả 500 kèm `requestId` và log ở server.
- **Test:** Hai PATCH song song cùng version → một 200, một **409**; POST trùng slug → 409.

### STUDIO-04 — Sanitizer Markdown dựa trên regex, không đầy đủ · **Low** · [POTENTIAL]

- **CWE:** CWE-79 / CWE-184 (Incomplete List of Disallowed Inputs)
- **Vị trí:** `server/cms/validation.ts:15-20`
- **Root cause:** Sanitizer chỉ thay `](javascript:…)` dạng inline và xóa `<…>` hoàn chỉnh. Nó không xử lý: link dạng reference (`[x][1]` + `[1]: javascript:alert(1)`), autolink, entity (`[x](&#106;avascript:…)`), thẻ không đóng (`<img src=x onerror=alert(1)` không có `>`), và URL `data:`/`vbscript:` trong reference.
- **Phạm vi hiện tại:** **Chưa khai thác được.** Cả `PublicContentPages.tsx` lẫn preview trong Studio đều render `bodyMarkdown` dưới dạng text thuần (React tự escape, không có `dangerouslySetInnerHTML` trong `src/`). CSP `script-src 'self'` trong `public/_headers` là lớp chặn thứ hai. Rủi ro chỉ xuất hiện khi thêm bộ render Markdown → HTML.
- **Khắc phục:** Khi thêm renderer, dùng parser có allowlist (ví dụ `markdown-it` với `html:false` và `validateLink` chỉ cho phép `https:`/`mailto:`/đường dẫn tương đối, hoặc `rehype-sanitize`). Sanitize ở **lúc render**, đừng chỉ dựa vào regex lúc ghi.
- **Test:** Các payload trên sau khi render → không có `href` dạng `javascript:`/`data:` và không có thuộc tính `on*`.

### STUDIO-05 — Upload media: chỉ kiểm tra magic bytes; chấp nhận polyglot; kích thước ảnh do client khai · **Low** · [CONFIRMED]

- **CWE:** CWE-434 (Unrestricted Upload — mức thấp), CWE-345
- **Vị trí:** `server/cms/media.ts:14-20`, `server/cms/validation.ts:41-46`
- **Root cause:** `hasSafeImageSignature` chỉ kiểm tra 3–12 byte đầu. Ảnh không được decode hay re-encode, nên phần nội dung phía sau magic bytes có thể là HTML/JS. `x-image-width/height` và `x-alt-text` lấy nguyên từ header client.
- **Bằng chứng (PoC D1):** File = PNG magic + `<html><script>alert(1)</script></html>` → **201**, key `content/2026-10/<uuid>.png`, content-type `image/png`. SVG bị từ chối 415 (đúng).
- **Phạm vi:** Thấp. Chỉ Admin upload được; key ngẫu nhiên; content-type cố định theo allowlist; `serveMedia` (`media.ts:25`) có `nosniff` + `CSP sandbox`. **Tuy nhiên `serveMedia` chưa được gắn vào route nào**: media đã upload chưa phục vụ được, và nếu sau này bucket được bật public (r2.dev/custom domain) thì các header bảo vệ này **không** được áp dụng. Không có quota tổng: 120 request/phút × 5 MB ≈ 600 MB/phút cho mỗi phiên bị chiếm.
- **Khắc phục:** Decode và re-encode ảnh (Cloudflare Images hoặc `@cf/image` transform) để loại polyglot và metadata EXIF; tự đo kích thước ở server. Phục vụ media **chỉ qua Function** `serveMedia` (giữ bucket private) hoặc thêm Transform Rule đặt `nosniff`/CSP. Thêm quota dung lượng theo ngày. Ghi audit trước khi `put`, hoặc có job dọn dẹp file mồ côi.
- **Test:** Upload PNG có payload phía sau → bị loại (sau khi re-encode, sha khác); header width giả → bị bỏ qua; bucket không có public access (kiểm bằng `wrangler r2 bucket info`).

### STUDIO-06 — JWKS bị fetch lại ở mọi request; rate limit chỉ áp dụng sau khi đã xác thực · **Low** · [CONFIRMED]

- **CWE:** CWE-400 / CWE-770
- **Vị trí:** `server/cms/auth.ts:14` (`createRemoteJWKSet` gọi trong hàm), `server/cms/auth.ts:57`
- **Root cause:** Mỗi request tạo một JWKS set mới nên cache của jose không bao giờ được dùng lại. Bất kỳ request nào có JWT RS256 *đúng định dạng* (kể cả chữ ký rác) đều kéo theo một subrequest tới `https://<team>/cdn-cgi/access/certs` **trước khi** kiểm tra chữ ký. Rate limit D1 chỉ chạy sau khi xác thực thành công.
- **Bằng chứng (PoC JWT):** `jwks fetches for 5 verifications: 5`.
- **Phạm vi:** Kẻ tấn công không cần đăng nhập vẫn có thể khuếch đại request (mỗi request sinh 1 subrequest), tốn subrequest/CPU và tăng độ trễ. Không có rủi ro bypass. Khi certs endpoint lỗi thì hệ thống fail closed (401), tức là có thể tự gây DoS cho Admin.
- **Khắc phục:** Hoist `createRemoteJWKSet` ra module scope (cache theo `issuer`). Nếu Access app phủ `/api/admin/*` thì edge đã chặn người ẩn danh; nên thêm WAF/Rate Limiting Rule cho `/api/admin/*` và `/api/comments`.
- **Test:** 5 lần verify liên tiếp → ≤ 1 lần fetch JWKS.

### STUDIO-07 — Admin API được deploy vào **mọi** Pages deployment (kể cả production); an toàn chỉ dựa vào việc thiếu biến môi trường · **Low** · [HARDENING]

- **CWE:** CWE-1188 (Insecure Default Initialization), OWASP A05 Security Misconfiguration
- **Vị trí:** `functions/api/admin/[[path]].ts`, `functions/api/comments.ts`, `server/cms/auth.ts:52`, `wrangler.staging.jsonc:9-12`
- **Root cause:** Thư mục `functions/` dùng chung cho production. Admin API trên production hiện an toàn vì `ACCESS_*`/`CMS_DB` chưa được đặt (fail closed với 503). Không có cơ chế nào chủ động chặn, ví dụ `ENVIRONMENT` allowlist hay cờ `CMS_ADMIN_ENABLED`. Các giá trị placeholder `REPLACE_WITH_*` không bị từ chối rõ ràng (hiện tại vẫn fail closed nhờ ký tự `_` không hợp lệ trong hostname và email).
- **Kịch bản (scenario E):** Người vận hành copy biến môi trường của staging sang Production hoặc Preview của dự án production, hoặc dùng chung `ACCESS_AUD` giữa staging và prod. Khi đó Admin API sống trên production, có thể trỏ nhầm vào D1 của staging hoặc prod mà không ai chủ động bật.
- **Khắc phục:** Thêm cổng server-side `if (env.CMS_ADMIN_ENABLED !== 'true' || !['staging','production'].includes(env.ENVIRONMENT)) return 404`. Từ chối giá trị chứa `REPLACE_WITH` và yêu cầu `ACCESS_TEAM_DOMAIN` kết thúc bằng `.cloudflareaccess.com`. Dùng **AUD riêng** cho staging và prod. Trả `environment` trong `/session` (đã có) và hiển thị banner trong Studio.
- **Test:** `ENVIRONMENT` không thuộc allowlist → 404; giá trị placeholder → 503 `access_not_configured`.

### STUDIO-08 — Chống spam bình luận còn yếu: bỏ qua bộ lọc link, rate limit theo từng IP · **Low** · [CONFIRMED]

- **CWE:** CWE-799 (Improper Control of Interaction Frequency), CWE-20
- **Vị trí:** `server/cms/comments.ts:16` (`unsafeText`), `server/cms/comments.ts:35-36`
- **Root cause:** Bộ lọc chỉ chặn `<…>`, `javascript:`/`data:`/`vbscript:` và `http(s)://`. Tên miền trần (`spam-shop.example/buy`), `www.`, `hxxp` và homoglyph đều lọt qua. Rate limit 5 request/10 phút theo **từng địa chỉ IP**: IPv6 cho phép xoay vòng trong một /64 gần như vô hạn. Không có giới hạn theo nội dung hay toàn cục, cũng không phát hiện bình luận trùng lặp.
- **Bằng chứng (PoC D1):** body `cheap pills at spam-shop.example/buy now` → **202**; chuỗi rate limit `202×5, 429, 429`.
- **Phạm vi:** Chỉ làm đầy hàng đợi kiểm duyệt (bình luận vẫn `pending`, không public). Turnstile là rào cản chính; token chỉ dùng được một lần do siteverify đảm bảo. XSS không xảy ra: dữ liệu được lọc khi nhập và React escape khi render (`StudioPage` render `item.body` dạng text).
- **Khắc phục:** Gom key IPv6 theo /64. Thêm giới hạn theo `content_id` và toàn cục, hash nội dung để chống trùng, giới hạn số pending trên mỗi bài, và WAF Rate Limiting Rule cho `/api/comments`.
- **Test:** 6 IPv6 khác nhau trong cùng /64 → request thứ 6 bị 429; gửi trùng nội dung → 409.

### STUDIO-09 — Vệ sinh build: `cms:dev` ghi bản build bật Studio kèm Turnstile **test sitekey** vào đúng thư mục `dist/` dùng để deploy production · **Low** · [CONFIRMED]

- **CWE:** CWE-489 (Active Debug Code), OWASP A05
- **Vị trí:** `scripts/cms-local.mjs:9`; `src/App.tsx:79`; `src/lib/contentRepository.ts:15`
- **Bằng chứng:** Lúc 17:16, `dist/assets/index-C6gqTLWW.js` chứa `1x00000000000000000000AA` (sitekey test luôn pass của Cloudflare) cùng Studio bật `ApiRepository`. Lúc 17:19 `dist/` đã được build lại bằng cấu hình mặc định. Ngoài ra, bundle mặc định **luôn** chứa mã Studio (`"Prototype nội bộ"`, `/api/admin/session`) vì `StudioPage` được import tĩnh.
- **Phạm vi:** Nếu ai đó chạy `wrangler pages deploy dist` ngay sau `npm run cms:dev`, production sẽ lộ UI `/admin`. API vẫn được bảo vệ bởi JWT, và Turnstile production sẽ từ chối token của test-key, nên đây **không** phải auth bypass mà là lộ thông tin và rủi ro vận hành. Test harness `local/cms-dev-worker.ts` (verifier luôn trả đúng) **không** nằm trong `functions/` nên không thể chạy trên Pages. Điểm này đã xác minh: không file nào trong `functions/` import `local/`.
- **Khắc phục:** Cho `cms:dev` build ra `--outDir .wrangler/cms-dev-dist` và trỏ `wrangler.local.jsonc.assets.directory` vào đó. Dùng `React.lazy` + điều kiện compile-time để tree-shake Studio khỏi bản production. Thêm bước CI: fail nếu `dist/` chứa `1x0000000000000000000` hoặc `local-only`.
- **Test:** Test CI quét `dist/` sau `npm run build` mặc định.

### STUDIO-10 — Bảng rate-limit tăng không giới hạn; `abuse_key` được giữ vĩnh viễn · **Low** · [HARDENING]

- **CWE:** CWE-770; quyền riêng tư (giới hạn lưu trữ dữ liệu)
- **Vị trí:** `migrations/0003_studio_rate_limits.sql`, `migrations/0004_comments.sql:10,27-33`
- **Root cause:** Không có job xóa `cms_rate_limits`/`cms_comment_rate_limits` cũ. `cms_comments.abuse_key` (HMAC của IP, là pseudonymous personal data) được lưu vô thời hạn.
- **Khắc phục:** Cron Trigger xóa `window_start < now-24h`; đặt NULL hoặc xoay vòng `abuse_key` sau N ngày; ghi chính sách lưu trữ vào privacy notice.

### STUDIO-11 — Không có state machine trạng thái phía server; PATCH thiếu `status` sẽ âm thầm unpublish · **Low** · [HARDENING]

- **CWE:** CWE-841 (Improper Enforcement of Behavioral Workflow)
- **Vị trí:** `server/cms/validation.ts:30,38` (mặc định `'draft'`), `server/cms/repository.ts:37`; `canTransition` chỉ có ở `src/lib/studio.ts:39`
- **Root cause:** Server chấp nhận mọi chuyển trạng thái, kể cả archived→published trực tiếp. PATCH không gửi `status` đặt về `draft`, khiến bài đang public biến mất.
- **Khắc phục:** Gọi `canTransition` ở server và yêu cầu `status` tường minh trong PATCH (hoặc giữ `current.status` khi không gửi).

### STUDIO-12 — Kiểm thử bảo mật còn thiếu; build đang lỗi · **Info** · [CONFIRMED]

- `npx tsc -b` fail (TS1294 ở `src/lib/contentRepository.ts:7`, do parameter property `private readonly base` vi phạm `erasableSyntaxOnly`), nên `npm run build`/`check` fail.
- `package.json` script `cms:test:local` trỏ tới `tests/cms-local.integration.test.ts` và `tests/comments-security.test.ts`, **cả hai đều không tồn tại**.
- **Không có test nào** cho `server/cms/comments.ts` (submit/moderation/public list).
- `tests/cms-security.test.ts` chỉ dùng verifier giả (`allow`). Chưa có test nào ký JWT thật để kiểm `verifyAccess`. Test `optimistic version conflict` (dòng 71-74) chỉ dùng fake DB, không bắt được STUDIO-02/03.
- **Khắc phục:** Đưa PoC ở Phụ lục B vào `tests/`, sửa TS1294, và tạo lại hoặc xóa script `cms:test:local`.

### STUDIO-13 — Dependency build-time có advisory high · **Info** · [CONFIRMED]

`tailwindcss@3.4.17` kéo theo `braces`/`micromatch`/`chokidar`/`fast-glob` (high, DoS do pattern lồng nhau) và `postcss-selector-parser`/`postcss-nested` (moderate, CPU). Các gói này chỉ chạy lúc build, `npm audit --omit=dev` = 0. Khuyến nghị nâng Tailwind hoặc dùng `overrides`, và chạy build trong CI với input tin cậy.

### STUDIO-14 — Tài liệu kiến trúc không khớp với mã · **Info** · [CONFIRMED]

`docs/studio-v2-architecture.md:18` mô tả payload video/app nằm trong "bảng chi tiết". Thực tế `cms_videos`, `cms_applications`, `cms_content_media` (migration 0002) **không bao giờ được ghi**: mọi thứ nằm trong `data_json` không có schema (đây cũng là gốc của STUDIO-01). Cần cập nhật tài liệu hoặc mã.

### STUDIO-15 — `/session` trả 500 thô khi thiếu `CMS_CSRF_SECRET` · **Info** · [CONFIRMED – qua đọc mã]

`server/cms/handler.ts:35` gọi `csrfToken()` ngoài `try`, nên exception `csrf_not_configured` thành 500 không có body JSON. Hệ thống vẫn fail closed (mutation cũng bị chặn với 503 qua `authorize`). Chỉ là vấn đề nhất quán và khả năng chẩn đoán.

### STUDIO-16 — Comment moderation PATCH/DELETE đọc body không giới hạn kích thước · **Info** · [HARDENING]

`server/cms/comments.ts:47-48` dùng `request.json()` thay vì `bodyJson` (giới hạn 256 KB). Chỉ người đã xác thực mới gọi được, nên rủi ro không đáng kể. Nên dùng chung helper cho nhất quán.

---

## 4. Checklist theo yêu cầu

### 4.1 Source code review
| Hạng mục | Kết luận |
|---|---|
| Authentication bypass | **Không phát hiện.** Mọi nhánh `/api/admin/*` đều đi qua `authorize()` (`handler.ts:34`); riêng `OPTIONS` trả 204 rỗng và không có dữ liệu |
| IDOR / BOLA | Mô hình một Admin nên không có IDOR giữa người dùng. Có **kind confusion** (STUDIO-01) |
| Privilege escalation | Không có vai trò phân cấp; khách không có đường nào lên quyền moderation (đã kiểm bằng PoC) |
| JWT | Đạt (mục 4.2) |
| CSRF | Đạt: Origin allowlist chính xác + `Sec-Fetch-Site` + HMAC token gắn `sub.exp`; so sánh constant-time |
| CORS | Đạt: chỉ preflight trả ACAO cho origin trong allowlist, không có `allow-credentials`; response GET không có ACAO nên trang khác không đọc được |
| SQL Injection | **Không phát hiện.** Mọi giá trị đều `bind()`; SQL động chỉ ghép placeholder `?N`; LIKE có `ESCAPE` |
| XSS stored/reflected/DOM | Không khai thác được. React escape, không có `dangerouslySetInnerHTML`, CSP chặt. Rủi ro tiềm ẩn: STUDIO-01/04 |
| SSRF | Không có. URL JWKS lấy từ env, không lấy từ token (`jku` bị bỏ qua, đã kiểm). Siteverify gọi URL hằng số |
| Unsafe upload / path traversal | Key do server sinh bằng UUID, không dùng tên file của client; SVG bị chặn. Polyglot: STUDIO-05 |
| Race conditions | Toàn vẹn dữ liệu được giữ nhờ `WHERE version=?` + UNIQUE; mã lỗi và audit sai: STUDIO-02/03 |
| Rate-limit bypass | Admin: 120/phút/sub lưu trong D1. Comments: STUDIO-08 |
| Information disclosure | Lỗi chỉ trả `code`, không có stack. `adminRow` không lộ `abuse_key`. Bundle chứa mã Studio (STUDIO-09) |
| Secret leakage | Không có secret thật trong repo. `wrangler.local.jsonc` chỉ chứa giá trị `local-only-*`; `.env*`, `.wrangler`, `dist` đều được gitignore |
| Debug functionality | `local/cms-dev-worker.ts` (verifier luôn đúng) chỉ được nạp qua `wrangler.local.jsonc`, không nằm trong `functions/` |

### 4.2 Cloudflare Access
| Yêu cầu | Kết quả | Bằng chứng |
|---|---|---|
| RS256 kiểm chữ ký thật | ✅ | PoC: khóa lạ trùng `kid` → reject; `algorithms:['RS256']` |
| issuer/audience/expiration | ✅ | PoC: sai iss/aud, `exp` quá hạn, `nbf` tương lai đều bị reject |
| JWKS không bị thay bằng giá trị không tin cậy | ✅ | URL lấy từ env `ACCESS_TEAM_DOMAIN`; header `jwk`/`jku` bị bỏ qua (PoC). Hardening: kiểm hậu tố `.cloudflareaccess.com` (STUDIO-07) |
| Allowlist identity ở server | ✅ | PoC: email khác hoặc thiếu email → 403; so sánh chính xác sau khi lowercase |
| Không giả mạo được qua header | ✅ | PoC: `cf-access-authenticated-user-email` giả → 401; chỉ tin JWT đã được xác minh |
| Thiếu cấu hình → fail closed | ✅ | PoC: thiếu/rỗng/khoảng trắng → 503 |
| Test harness không chạy được trên production | ✅ (có điều kiện) | `local/` không thuộc `functions/`; xem STUDIO-09 về `dist/` |
| Không endpoint Admin nào thiếu middleware | ✅ | Một catch-all duy nhất `[[path]]` → `authorize` |
| Không dựa vào việc frontend ẩn route | ✅ | API tự xác thực; cờ `VITE_STUDIO_ENABLED` chỉ ảnh hưởng UI |

### 4.3 D1 & R2
Prepared statements ✅ · Phân quyền từng bản ghi ⚠️ STUDIO-01 · Draft không lộ public ✅ · Revision/audit ⚠️ STUDIO-02 (revision được bảo vệ bằng UNIQUE; audit thì không) · Optimistic concurrency ✅ toàn vẹn / ⚠️ mã lỗi (STUDIO-03) · MIME spoofing ✅ chặn khai sai kiểu · Polyglot ⚠️ STUDIO-05 · File quá lớn ✅ (header và byteLength; lưu ý `request.arrayBuffer()` vẫn đọc toàn bộ body nếu `content-length` vắng hoặc nói dối, giới hạn nền tảng 100 MB) · Đường dẫn lưu trữ ✅ · Phân quyền bucket ❓ NOT TESTED · Ghi đè installer/release ✅ không thể (binding riêng, không tham chiếu `RELEASES`, prefix `content/` + UUID).

### 4.4 Comments
Khách chỉ tạo pending ✅ · Khách không moderation được ✅ · Bình luận chưa duyệt không public ✅ · Turnstile kiểm ở server (action + hostname, fail closed khi thiếu secret, allowlist hoặc HMAC secret) ✅ · Rate limit không dùng bộ nhớ isolate ✅ (D1) · XSS ✅ không thực thi · Spam ⚠️ STUDIO-08 · Quyền riêng tư ✅ không thu email; IP chỉ lưu dạng HMAC; API public chỉ trả `displayName/body/createdAt` (lưu ý STUDIO-10 về thời hạn lưu).

> Lưu ý: hiện **chưa có UI public** nào gửi hoặc hiển thị bình luận (chỉ có API và màn hình moderation trong Studio).

---

## 5. Threat model

| # | Tác nhân | Khả năng khai thác | Tác động | Đánh giá |
|---|---|---|---|---|
| A | Chưa đăng nhập | Không publish, sửa, xóa, moderate hay upload được (PoC). Có thể: đọc nội dung đã publish, gửi bình luận pending (cần vượt Turnstile, 5/10 phút/IP), khuếch đại subrequest JWKS (STUDIO-06) | Spam hàng đợi kiểm duyệt; DoS nhẹ | **Thấp** |
| B | Có tài khoản Cloudflare / Access nhưng không phải Admin | JWT từ team khác: sai `iss`/chữ ký → 401. JWT hợp lệ của *cùng team/app* (nếu Access policy để lỏng) nhưng email ngoài allowlist → 403. JWT của app Access khác cùng team: sai `aud` → 401 | Không có quyền ghi | **Thấp**, với điều kiện `ACCESS_ALLOWED_IDENTITIES` chỉ chứa owner. ❓ Chưa kiểm Access policy thật |
| C | Chiếm được phiên Admin (cookie `CF_Authorization` hoặc JWT, máy owner bị nhiễm) | Toàn quyền CMS cho đến khi token hết hạn: publish nội dung độc hại hoặc lừa đảo, unpublish hoặc archive hàng loạt, duyệt spam, upload ~600 MB/phút, chèn URL `javascript:` vào App (STUDIO-01), làm nhiễu audit (STUDIO-02). **Không thể**: hard-delete (chỉ có archive và soft-delete), sửa revision cũ, chạm vào bucket release | Lớn với nội dung và uy tín; dữ liệu khôi phục được nhờ revision + soft-delete (thao tác SQL thủ công, chưa có công cụ restore) | **Trung bình** (khả năng thấp, tác động cao). Giảm thiểu: session Access ngắn, bắt buộc MFA/hardware key trong policy, alert từ audit, thu hồi phiên qua Zero Trust |
| D | Nội dung độc hại qua comment/upload | Comment: bị lọc khi nhập, React escape, chỉ pending → không có XSS. Upload: chỉ Admin; polyglot được lưu nhưng content-type là ảnh, `nosniff` → không thực thi được trong trình duyệt hiện đại | Thấp | **Thấp** |
| E | Nhầm lẫn dev/staging/production | `local/` không deploy. Staging dùng project, D1 và bucket riêng. Rủi ro còn lại: copy biến môi trường hoặc AUD giữa các môi trường; Preview deployment của dự án production chạy cùng `functions/` (STUDIO-07); `dist/` có thể bị deploy nhầm sau `cms:dev` (STUDIO-09) | Lộ UI Admin; ghi nhầm vào D1 sai môi trường | **Thấp–Trung bình** (phụ thuộc vận hành) |
| F | Dùng CMS để tác động installer/R2 Release | Không có đường ghi nào: CMS chỉ dùng `CMS_MEDIA`, key là `content/<YYYY-MM>/<uuid>`, không tham chiếu `RELEASES` (có test ở `tests/cms-security.test.ts:67`). Gián tiếp: Admin bị chiếm (hoặc qua STUDIO-01) đặt `downloadUrl` của App trỏ tới installer giả. Hiện chưa được render, nhưng sẽ là vector phishing khi trang App có nút tải | Phishing tải xuống (tương lai) | **Thấp** hiện tại; cần xử lý STUDIO-01 và allowlist host cho `downloadUrl` trước khi render |

---

## 6. NOT TESTED / bị chặn

Các mục dưới đây **không thể** xác minh vì chưa có staging thật hoặc vì yêu cầu không chạm vào Cloudflare/production:

1. **Cloudflare Access end-to-end:** đăng nhập IdP, redirect người ẩn danh trên `/admin`, `/admin/*`, `/api/admin`, `/api/admin/*`; Access policy thực tế (Include/Require, MFA, thời lượng session); hành vi khi token được làm mới (CSRF token gắn `exp`).
2. Giá trị thực của `ACCESS_TEAM_DOMAIN`/`ACCESS_AUD`/`ACCESS_ALLOWED_IDENTITIES`/`CMS_ALLOWED_ORIGINS` và các secret (`CMS_CSRF_SECRET`, `COMMENTS_*`) trên staging; AUD staging khác production.
3. Biến môi trường và binding của **Production** và **Preview** trong dự án Pages production; xác nhận `functions/api/admin` trên production trả 503.
4. Cấu hình bucket R2 `aidesk-studio-media-staging`: không bật r2.dev hay custom domain public; token API không có quyền trên `aidesk-releases`.
5. Turnstile thật: siteverify với secret staging, hostname allowlist, chặn token dùng lại.
6. D1 thật: hành vi `batch()` giống với PoC local (PoC dùng workerd/SQLite local của wrangler); **diễn tập Time Travel / export-restore**.
7. WAF / Rate Limiting Rules ở edge.
8. Test E2E trên trình duyệt với Studio (`ApiRepository`) qua Access.
9. Không fuzz hay tấn công bất kỳ hệ thống từ xa nào (đúng phạm vi).

---

## 7. Release gate

| Câu hỏi | Trả lời |
|---|---|
| Còn Critical/High chưa xử lý? | **Không** |
| Có authentication bypass? | **Không** (đã có PoC) |
| Có public write API không được bảo vệ? | Chỉ `POST /api/comments`, theo thiết kế: chỉ tạo `pending`, có Turnstile và rate limit trong D1. Không có API public nào ghi được nội dung hay moderation |
| Có rủi ro ảnh hưởng release bucket? | **Không có đường ghi trực tiếp.** Rủi ro gián tiếp: `downloadUrl` của App (STUDIO-01) khi được render sau này |
| Thiếu kiểm thử Access thật trên staging? | **Có — chưa có bằng chứng nào** (mục 6.1–6.3) |
| Phục hồi dữ liệu khi có sự cố? | Một phần: không có hard-delete, có revision cho từng version và soft-delete cho comment. **Chưa có** công cụ restore và **chưa diễn tập** backup/Time Travel. Audit chưa đáng tin hoàn toàn (STUDIO-02) |
| Unit tests | 152/152 PASS, **nhưng** `tsc -b` FAIL và chưa có test cho comments hay JWT thật, nên unit tests pass **không** chứng minh production an toàn |

### Kết luận

- **Staging: CONDITIONAL GO.** Được deploy lên staging tách biệt (project, D1, R2 và AUD riêng) để chạy checklist trong `docs/studio-v2-staging-runbook.md`, với điều kiện: (1) sửa TS1294 để build pass; (2) Access application phủ đủ 4 pattern đường dẫn và policy chỉ cho phép owner có MFA; (3) không deploy thư mục `dist/` vừa được tạo bởi `cms:dev`.
- **Production: NO-GO (hiện tại).** Chuyển sang **CONDITIONAL GO** khi đủ các điều kiện:
  1. Sửa **STUDIO-01** và **STUDIO-02**, có test chống tái phát (Phụ lục B).
  2. Có bằng chứng E2E Access trên staging cho mục 6.1–6.5 (ảnh chụp hoặc log: người ẩn danh bị redirect; JWT sai/hết hạn/sai AUD → 401; email lạ → 403; mutation không có CSRF → 403).
  3. Diễn tập export/restore hoặc Time Travel cho D1 staging thành công, ghi lại RTO/RPO.
  4. Thêm cổng `CMS_ADMIN_ENABLED`/`ENVIRONMENT` (STUDIO-07) và tách đường build của `cms:dev` (STUDIO-09).
  5. Khuyến nghị (không chặn release): STUDIO-03, 05, 06, 08, 11, cùng WAF rate limit cho `/api/admin/*` và `/api/comments`.

---

## 8. Đề xuất cho Codex (theo thứ tự ưu tiên)

1. **STUDIO-01:** `D1CmsRepository.byId(id, kind)`, `update(id, kind, …)` với `WHERE id=? AND kind=?`; truyền `kind` từ `handler.ts:41,44,45`; dùng allowlist key cho `data` theo từng kind.
2. **STUDIO-02:** Chỉ ghi audit khi `changes()=1` (dùng INSERT … SELECT có điều kiện, hoặc 2 bước), trả 404 cho ID không tồn tại.
3. **STUDIO-12:** Sửa TS1294 (khai báo field tường minh thay cho parameter property), thêm `tests/comments-security.test.ts` và `tests/access-jwt.test.ts` từ Phụ lục B.
4. **STUDIO-07/09:** Cổng môi trường server-side; `cms:dev` build ra thư mục riêng; check CI quét `dist/`.
5. **STUDIO-03/06:** Phân loại lỗi D1 đúng mã; cache JWKS ở module scope.
6. **STUDIO-05/08/10/11:** Re-encode ảnh, rate limit theo /64 và theo bài, cron dọn dẹp, state machine ở server.

---

## Phụ lục A — Hash SHA-256 của các file đã audit

```
4cb184d58d38502619e4ea3333d1f9f6d16dafa1fdfe58bc235369b8289e3aa5  server/cms/auth.ts
21f3f4d88941203601e0ef10940fcbb0422b56069bf60c0e3e960a556687a692  server/cms/comments.ts
b6bf3f6aae6af26762f43f598cbabbeb0b8cb17785105a30faac701a3cac41a5  server/cms/handler.ts
e6096a59da2df551a5927da4a8fffa56743eb0742ccbe2f7ddf774af50fc60af  server/cms/media.ts
2738dd23a6df657c8d3645d61bf54b6c6be8e0a784dbe9b969be755c70cefb79  server/cms/repository.ts
84c94c289af5ee32a2a5df4ae9694fa43c0602be7e2a35ddabe20759decdca85  server/cms/types.ts
b8fb6503f7a4fe3f74fffc092b41e7bc876a8164dcc7b5b7d6c92d0262313858  server/cms/validation.ts
dd618793733bb3ebfb43dc1385b19de95293dcf6d02131167f12e73e2500304c  functions/api/admin/[[path]].ts
edd09b678af36f8acc35d3dcb8aa6931c114398c670812277c4fb5d3d785151f  functions/api/content/[[path]].ts
7f129c6e97efef7427ac06d5e02007f8ce1e868b08a095c4e8875e2b5ba7dc63  functions/api/comments.ts
74ce831a7498b43654680eb5969f6d9e08a4d2d4d00ec238d9637d9768b8b039  local/cms-dev-worker.ts
5c6de7af7b8c1d1bc61fef7bafe8d442045af3a887e4f2abcf59f4f0ac35dfe2  src/pages/StudioPage.tsx
55d59362091980b0ee1b4c5604f574453c71e3cefbc98219b41a303cc7f2d24e  src/pages/PublicContentPages.tsx
2ab27c0425180f574c39a8430fdea7df2aa6c57f0cec8254fb4dabe4e1f33fb1  src/lib/contentRepository.ts
17f3ff21d0aec3a023428053964efc60c6e71941993ba3518f0fa0d4b338085e  migrations/0002_studio_cms.sql
a1bc79a61c0f0185e8b669e3175274c275a967d8d7218f065f04437ed6781b7c  migrations/0003_studio_rate_limits.sql
102fa6953863dc2bdea53087e5b304b65ad85d9d206a5f2f1033502e03a1e8e8  migrations/0004_comments.sql
fe114d90bc2ad998dd1b3a2a7fb59cd2a8ec129ec2c34abb75c1b61070a65dd0  wrangler.local.jsonc
ea3283041d48225b960e3407e61afe7ec68490f48e093d349d239a5ddf0dc775  wrangler.staging.jsonc
```
Tái tạo bằng: `sha256sum server/cms/*.ts functions/api/admin/* functions/api/content/* functions/api/comments.ts local/cms-dev-worker.ts src/pages/StudioPage.tsx src/pages/PublicContentPages.tsx src/lib/contentRepository.ts migrations/000[234]*.sql wrangler.*.jsonc`

## Phụ lục B — Trích PoC (để chuyển thành regression test)

**B.1 — JWT thật (`verifyAccess`)**: sinh RSA key bằng `jose.generateKeyPair('RS256')`, mock `globalThis.fetch` cho `https://<team>/cdn-cgi/access/certs` trả `{keys:[publicJwk]}`, sau đó:
```ts
await assert.rejects(verifyAccess(`${b64({alg:'none',kid:'k1'})}.${b64({iss:ISS,aud:AUD,sub:'s',email:'owner@example.com',exp:now+600})}.`, env))
await assert.rejects(verifyAccess(await new SignJWT({email:'owner@example.com'}).setProtectedHeader({alg:'HS256',kid:'k1'})
  .setIssuer(ISS).setAudience(AUD).setSubject('s').setExpirationTime(now+600).sign(new TextEncoder().encode(JSON.stringify(publicJwk))), env))
await assert.rejects(verifyAccess(await sign({}, evil.privateKey, { jwk: evilJwk }), env))       // embedded key
await assert.rejects(verifyAccess(await sign({ aud: 'production-aud' }), env))                    // wrong AUD
await assert.rejects(verifyAccess(await sign({ email: 'attacker@example.com' }), env), /access_forbidden/)
```

**B.2 — Kind confusion (STUDIO-01)**, trên D1 local (`getPlatformProxy` + migrations thật):
```ts
const app = (await (await admin('POST','apps',{title:'Tool',status:'published',data:{downloadUrl:'https://good.example/a.exe'}})).json()).data
assert.equal((await admin('PATCH',`apps/${app.id}`,{title:'Tool',version:1,status:'published',data:{downloadUrl:'javascript:alert(1)'}})).status, 400)
// HIỆN TẠI: 200 — kỳ vọng sau fix: 404
assert.equal((await admin('PATCH',`articles/${app.id}`,{title:'Tool',version:1,status:'published',data:{downloadUrl:'javascript:alert(1)'}})).status, 404)
```

**B.3 — Audit integrity (STUDIO-02)**:
```ts
assert.equal((await admin('PATCH',`comments/${c.id}`,{status:'approved',version:c.version})).status, 200)
const before = await count("SELECT COUNT(*) n FROM cms_audit_events WHERE operation='comment.moderate' AND entity_id=?1 AND outcome='success'", c.id)
assert.equal((await admin('PATCH',`comments/${c.id}`,{status:'hidden',version:c.version})).status, 409)
// HIỆN TẠI: before+1 — kỳ vọng sau fix: before
assert.equal(await count("…same query…", c.id), before)
```

**B.4 — Race (STUDIO-03)**:
```ts
const [a,b] = await Promise.all([admin('PATCH',`articles/${id}`,{title:'A',version:1}), admin('PATCH',`articles/${id}`,{title:'B',version:1})])
// HIỆN TẠI: [200,400 invalid_json] — kỳ vọng: [200,409]
assert.deepEqual([a.status,b.status].sort(), [200,409])
```

**B.5 — Comment invariants (đang PASS, nên giữ làm regression)**: khách gửi `status:'approved'` → bản ghi vẫn `pending`; danh sách public rỗng; `contentId` của draft → 404; `<img onerror>`/`https://` → 400; request thứ 6 trong 10 phút từ cùng IP → 429; `abuse_key` không chứa IP thô.
