# AI Desk Studio V2.2 — Independent Security Retest (Claude)

| | |
|---|---|
| Vai trò | Independent Senior Application Security Auditor, độc lập với Codex |
| Thời gian | 2026-10-19, 17:50 → 18:03 (+07:00) |
| Repository | `C:\Users\clubb\Desktop\WedAiDesk` (git root đã xác minh) |
| Branch / HEAD | `feature/website-v3-premium-light` @ `6ef0c74` + working tree chưa commit (15 file modified, các file untracked liệt kê ở §1) |
| Đầu vào | `docs/STUDIO_SECURITY_AUDIT_CLAUDE.md`, `docs/STUDIO_V2_2_SECURITY_REMEDIATION.md`, `artifacts/studio-v2-2-security/final-sha256.txt` |
| Chế độ | READ-ONLY với source. Không commit/push/merge/deploy và không chạm Cloudflare. Mọi PoC chạy trên D1 local **cô lập**: state và config riêng trong `%TEMP%\studio-retest\`. Không chạm `.wrangler/state/cms-v2-1` của chủ sở hữu |

> Ký hiệu: **[IND]** = do Claude tự chạy và quan sát · **[CODEX]** = chỉ là kết quả Codex báo cáo, chưa được Claude kiểm chứng · **NOT VERIFIED** = không thể kiểm trong phạm vi này.

---

## 1. Snapshot audit và xác minh SHA-256

| Kiểm tra | Kết quả [IND] |
|---|---|
| Git root | `C:/Users/clubb/Desktop/WedAiDesk` |
| Branch / HEAD | `feature/website-v3-premium-light` / `6ef0c74` (không có commit mới so với audit gốc) |
| Manifest Codex `final-sha256.txt` (26 file) | **26/26 OK** lúc 17:50 và lúc 18:03. Lưu ý: file có line ending CRLF nên `sha256sum -c` chạy trực tiếp báo "FAILED open or read"; phải `tr -d '\r'` trước. Đây là lỗi định dạng manifest, không phải sai lệch nội dung |
| File được ghi sau thời điểm manifest (17:42:59) | **Không có** (ngoại trừ build output `dist/`, `dist-cms-local/` do chính tôi build lại ở §7) |
| Độ phủ của manifest Codex | **Thiếu** một số file liên quan bảo mật: `server/turnstile.ts`, `src/lib/contentRepository.ts`, `src/lib/studio.ts` (chứa `canTransition` mà server import), `src/pages/StudioPage.tsx`, `src/pages/PublicContentPages.tsx`, `src/App.tsx`, `package.json`, `public/_headers` |
| Manifest bổ sung của Claude | 99 file (toàn bộ file modified/untracked cùng `server/`, `functions/`, `scripts/`, `public/`, `tests/`). Lấy lúc 17:50:57, kiểm lại lúc 18:03:14: **99/99 OK** |
| Agent khác đang sửa source? | Có các tiến trình `codex.exe` đang chạy, nhưng **không có file nào thay đổi** trong suốt cửa sổ audit (2 lần kiểm manifest). **Snapshot ổn định** |
| Dữ liệu CMS local của chủ sở hữu | SHA-256 của `.wrangler/state/cms-v2-1/.../*.sqlite` giống hệt trước và sau (`940c7ce0…`, `97e8d54f…`) |

Mọi kết luận dưới đây áp dụng cho snapshot gồm 26 hash Codex cộng 99 hash bổ sung đã nêu.

---

## 2. Tổng hợp trạng thái finding

| ID | Mức gốc | Trạng thái Codex | **Trạng thái retest** | Mức hiện tại |
|---|---|---|---|---|
| STUDIO-01 Cross-kind | Medium | FIXED | **FIXED** (24/24 tổ hợp cross-kind → 404, D1 và audit không đổi). Có lỗ hổng dư cùng họ: STUDIO-17 | – |
| STUDIO-02 False-success audit | Medium | FIXED | **FIXED** (25 race đều 1×200 + 1×409, mỗi race đúng 1 audit, khớp state) | – |
| STUDIO-03 Error mapping | Low | FIXED | **PARTIAL**: PATCH đã đúng; POST create vẫn gộp lỗi DB thành `400 invalid_json`; PATCH trùng slug trả 500 thay vì 409 | Low |
| STUDIO-04 Markdown sanitizer | Low | OPEN | **OPEN**: không khai thác được hiện tại (E2E xác nhận render dạng text) | Low (potential) |
| STUDIO-05 Polyglot | Low | OPEN | **OPEN**: polyglot PNG+HTML vẫn được upload 201; hiện chưa có route phục vụ media và chưa có UI upload thật | Low |
| STUDIO-06 JWKS | Low | FIXED | **FIXED**: cache có giới hạn; 13/13 ca JWT xử lý đúng; fail closed khi JWKS lỗi | – (ghi chú STUDIO-22) |
| STUDIO-07 Admin gate | Low | FIXED (code) | **FIXED trong code và trên runtime Pages local**; staging thật NOT VERIFIED. Ghi chú STUDIO-20/23 | – |
| STUDIO-08 Spam | Low | PARTIAL | **PARTIAL**: 8/10 biến thể bare-domain vẫn lọt | Low |
| STUDIO-09 Build isolation | Low | FIXED | **FIXED**: `dist/` và bundle Functions sạch; scanner chưa quét bundle Functions (STUDIO-21) | – |
| STUDIO-10 Retention / orphan | Low | OPEN | **OPEN**: không có cleanup cho rate-limit, `abuse_key` hay media mồ côi | Low |
| STUDIO-11 State machine | Low | FIXED | **FIXED** cho content và comment | – |
| STUDIO-12 Test/build | Info | FIXED | **FIXED** (tsc, test, lint, build PASS). Còn thiếu một số ca test (§4.3) | – |
| STUDIO-15/16 | Info | FIXED | **FIXED** (đọc mã: `/session` trả JSON 503; moderation body giới hạn 16 KiB) | – |
| **STUDIO-17 (mới)** | – | – | **CONFIRMED (latent)**: các key `data` đã allowlist nhưng không được validate | **Low** |
| **STUDIO-18 (mới)** | – | – | **CONFIRMED**: cache public làm chậm việc gỡ nội dung tới ~6 phút | **Low** |
| **STUDIO-19 (mới)** | – | – | **CONFIRMED**: thông báo lỗi nội bộ của jose lộ ra trong response | Info |
| **STUDIO-20 (mới)** | – | – | **CONFIRMED**: gate API cho phép cả `local-only`/`test` trong bundle production | Info |
| **STUDIO-21 (mới)** | – | – | **CONFIRMED**: scanner không quét bundle Functions | Info |
| **STUDIO-22 (mới)** | – | – | Đánh đổi khi xoay khóa JWKS (cooldown 30 s / cache 600 s) | Info |
| **STUDIO-23 (mới)** | – | – | Đường dẫn mã hóa né middleware `/admin` nhưng chỉ nhận SPA shell | Info |

**Không có Critical/High. Không có authentication bypass. Không có public write API nào thiếu bảo vệ.** Hai lỗi Medium cũ đã được sửa, có bằng chứng PoC trên D1 thật.

---

## 3. Lỗ hổng xác nhận và các finding còn mở

### STUDIO-17 — Các key `data` đã allowlist nhưng không validate kiểu/URL · **Low** · CONFIRMED (latent)

- **CWE:** CWE-20, CWE-79 (latent); OWASP A03
- **Vị trí:** `server/cms/validation.ts:23` (`DATA_KEYS`), `server/cms/validation.ts:38-40` (chỉ `websiteUrl/downloadUrl/githubUrl` của app và `youtubeId` của video được kiểm)
- **Root cause:** Bản sửa STUDIO-01 thêm allowlist key nhưng chỉ validate 3 URL của app. `video.thumbnailUrl`, `app.gallery`, `app.platforms`, `app.features`, `app.logoMediaId`, `app.coverMediaId`, `article.coverMediaId`, `video.displayOrder` nhận **bất kỳ JSON nào**: chuỗi `javascript:`, object lồng nhiều tầng, chuỗi dạng đường dẫn. `downloadUrl` chỉ yêu cầu `https:` chứ không giới hạn host.
- **Bằng chứng [IND], D1 thật:** `PATCH videos/<id> {data:{thumbnailUrl:"javascript:alert(document.domain)"}}` → **200**. `PATCH apps/<id> {data:{gallery:[{src:"javascript:alert(1)"}], platforms:{nested:…}, logoMediaId:"../../../aidesk-releases/AIDesk-Setup.exe"}}` → **200**. `downloadUrl:"https://evil-mirror.example/AIDesk-Setup.exe"` → **200**. API public `/api/content/videos/retest-video` trả `thumbnailUrl: "javascript:alert(document.domain)"`; `/api/content/apps/retest-app` trả `gallery[0].src: "javascript:alert(1)"` và `downloadUrl` trỏ tới mirror lạ.
- **Tác động thực tế:** Hiện **không khai thác được** vì `src/` không render `thumbnailUrl`/`gallery`/`downloadUrl` (đã grep). Chỉ Admin đã xác thực ghi được các trường này. Sẽ thành stored XSS hoặc phishing installer (scenario F) ngay khi UI render chúng. Đây đúng là họ lỗi của STUDIO-01 (Unknown/Known fields bypass kind-specific validation).
- **Khắc phục:** Schema cho từng key: URL phải `https:` và host nằm trong allowlist (`i.ytimg.com` cho thumbnail; host release chính thức như `webaidesk.pages.dev` hoặc `/api/download/*` cho `downloadUrl`). `*MediaId` phải là UUID tồn tại trong `cms_media`. `gallery`/`platforms`/`features` phải là mảng chuỗi có giới hạn độ dài và số phần tử. `displayOrder` phải là số nguyên.
- **Test chống tái phát:** Với từng key trong `DATA_KEYS`: giá trị `javascript:`, `data:`, `http:`, object lồng, chuỗi >2 KB → 400 và D1 không đổi.

### STUDIO-03 (PARTIAL) — POST create vẫn gộp lỗi DB; trùng slug không phải 409 · **Low**

- **Vị trí:** `server/cms/handler.ts:45` (`catch` của POST trả `invalid_json`/400 cho mọi lỗi); `handler.ts:47` (PATCH trùng slug rơi vào `database_error`/500)
- **Bằng chứng [IND]:** POST trùng slug → `[400,"invalid_json"]`. POST khi `batch()` ném `D1_ERROR: disk I/O error` → `[400,"invalid_json"]`, tức lỗi hạ tầng bị **che** thành lỗi client và không có log. PATCH trùng slug → `[500,"database_error"]`. PATCH khi DB lỗi → `[500,"database_error"]` (đúng). Hai PATCH đồng thời ×25 → luôn `200/409`, không còn `invalid_json` (đúng).
- **Tác động:** Monitoring bỏ sót sự cố D1 khi tạo nội dung; người dùng nhận thông báo sai. Không ảnh hưởng toàn vẹn dữ liệu.
- **Khắc phục:** Dùng cùng mẫu với PATCH: `SyntaxError` → 400; lỗi UNIQUE `ux_cms_contents_kind_slug_active` → 409 `slug_conflict` (cả POST lẫn PATCH); còn lại → 500 kèm log `requestId`.

### STUDIO-08 (PARTIAL) — Bộ lọc bare-domain chỉ phủ 8 TLD · **Low**

- **Vị trí:** `server/cms/comments.ts:86-90`
- **Bằng chứng [IND] (real `verifyTurnstile` + siteverify mock):** bị chặn: `spam-shop.com`, `SPAM-SHOP.COM`. **Lọt (202):** `spam-shop.xyz`, `(spam-shop.com)`, `bit.ly/abc123`, `evil.co/x`, `spam.shop`, `spam-shop[.]com`, `spam-shop。com` (dấu chấm full-width), `hxxps://spam-shop.com`.
- **Tác động:** Chỉ làm đầy hàng đợi moderation. Comment luôn ở trạng thái `pending` và Turnstile + rate limit 5/10 phút (đã xác nhận `202×5, 429, 429`) vẫn là rào cản chính. Không phải lỗ hổng bảo mật trực tiếp.
- **Khắc phục:** Chuẩn hóa NFKC và ký tự chấm Unicode trước khi kiểm. Dùng regex domain tổng quát (`[a-z0-9-]+(\.|\[\.\]|。)[a-z]{2,}`) thay cho danh sách TLD, không yêu cầu khoảng trắng phía trước. Gom IPv6 theo /64 và thêm WAF rate rule.

### STUDIO-04 (OPEN) — Sanitizer Markdown dựa trên regex · **Low (potential)**

- **Vị trí:** `server/cms/validation.ts:15-20` (không đổi)
- **Bằng chứng [IND]:** Payload lưu xuống: `alert(1)[x](#))[y][1]\n\n[1]: javascript:alert(2)\n<img src=x onerror=alert(3)`. Link dạng reference `javascript:` và thẻ `<img onerror` không đóng **vẫn nằm trong D1**. Kiểm tra E2E trên trình duyệt cho thấy trang `/blog/<slug>` render toàn bộ dưới dạng **text** (0 `img[onerror]`, 0 script, 0 `a[href^=javascript]`).
- **Khai thác được?** Không, với mã hiện tại. **Chặn staging?** Không. **Chặn production?** Không, *với điều kiện* không thêm renderer Markdown→HTML. Nên thêm test hoặc lint guard: cấm `dangerouslySetInnerHTML`/`marked`/`markdown-it` trừ khi đi kèm sanitizer allowlist.

### STUDIO-05 (OPEN) — Polyglot ảnh · **Low**

- **Vị trí:** `server/cms/media.ts` (hash `e6096a59…` **không đổi** so với audit gốc)
- **Bằng chứng [IND]:** PNG magic + `<html><script>…` → **201**, key `content/2026-10/<uuid>.png`, `image/png`.
- **Khai thác được?** Hiện không. Upload chỉ dành cho Admin; `serveMedia` **không được gắn route nào** (đã grep); Studio Media vẫn chỉ dùng fixture. Nếu sau này media được phục vụ từ bucket public mà thiếu `nosniff`, rủi ro tăng.
- **Chặn staging?** Không. **Chặn production?** Có, *nếu* bật upload hoặc phục vụ media công khai. Khi đó cần re-encode (Images/transform), đo kích thước ở server và phục vụ qua route có `nosniff` + `CSP sandbox`.

### STUDIO-10 (OPEN) — Retention và media mồ côi · **Low**

- **Vị trí:** `migrations/0003`, `0004` (không có TTL); `server/cms/media.ts` (R2 `put` trước khi INSERT D1; audit INSERT nằm ngoài try, nên nếu audit lỗi thì có media mà không có audit; không có job đối soát R2↔`cms_media`)
- **Bằng chứng:** Đọc mã. Không có Cron Trigger hay script cleanup nào trong repo (`grep scheduled|cron` → không có).
- **Tác động:** Bảng `cms_rate_limits`/`cms_comment_rate_limits` tăng không giới hạn. `abuse_key` (HMAC IP, là dữ liệu bút danh) được lưu vô thời hạn. Object R2 mồ côi tốn chi phí và không ai quản lý.
- **Chặn staging?** Không. **Chặn production?** **Có** (yêu cầu quyền riêng tư/retention và vận hành): cần Cron xóa `window_start < now-24h`, xóa hoặc xoay `abuse_key` sau N ngày, và job đối soát media.

### STUDIO-18 (mới) — Cache public làm chậm việc gỡ nội dung · **Low** · CONFIRMED

- **Vị trí:** `server/cms/handler.ts:28,30`: `cache-control: public, max-age=60, stale-while-revalidate=300`
- **Bằng chứng [IND], E2E:** Sau khi Archive qua UI, server trả `404` cho slug (đã kiểm bằng `curl`), nhưng trình duyệt vẫn nhận **200** cho slug từ HTTP cache. Nội dung bị gỡ có thể còn hiển thị tới ~360 s trên client, và lâu hơn nếu sau này có CDN/Cache Rule cache `/api/content/*`.
- **Tác động:** Trong scenario C (phiên Admin bị chiếm và đăng nội dung độc hại), việc gỡ khẩn cấp bị chậm.
- **Khắc phục:** Dùng `max-age=0, must-revalidate` kèm ETag, hoặc `s-maxage` ngắn cộng purge-by-tag khi publish/archive. Ghi thủ tục purge vào incident runbook.

### Các mục Info mới

- **STUDIO-19:** `server/cms/auth.ts:68-69` trả `error.message` của jose làm `code`. Ví dụ [IND]: `{"code":"\"alg\" (Algorithm) Header Parameter value not allowed"}`. Thông tin này để lộ thư viện dùng và lý do từ chối, giúp kẻ tấn công tinh chỉnh token giả. Khắc phục: map sang `access_invalid` và chỉ log chi tiết ở server.
- **STUDIO-20:** `server/cms/handler.ts:34` chấp nhận `ENVIRONMENT ∈ {staging, production, local-only, test}`. Bundle Functions production [IND] chứa `"local-only"` và `"test"`. Kiểm tra [IND] cho thấy `ENVIRONMENT=test` hoặc `local-only` cùng `CMS_ADMIN_ENABLED=true` → Admin API mở, **nhưng vẫn yêu cầu JWT Access thật** (owner hợp lệ → 200). Đây không phải bypass. Khuyến nghị: Pages chỉ chấp nhận `staging|production`, giống middleware UI (`functions/admin/[[path]].ts:6`).
- **STUDIO-21:** `scripts/verify-production-artifacts.mjs` chỉ quét `dist/`, không quét bundle Functions mà Pages thực sự deploy. Tôi đã build bundle bằng `wrangler pages functions build` và quét thủ công: **sạch** (0 marker `local-studio-owner`, `local-boundary-token`, `cms-dev-worker`, `localVerify`, test sitekey, `security-test`). Danh sách pattern cũng thiếu `local.invalid`, `invalid.test`, `security-test`, `REPLACE_WITH`. Khuyến nghị: thêm bước build + quét bundle Functions vào `npm run build`/CI.
- **STUDIO-22:** Với `cooldownDuration:30s`, `cacheMaxAge:600s` [IND]: khóa mới (`kid` lạ) bị **từ chối trong ≤30 s** sau lần fetch gần nhất, sau đó được chấp nhận (`rotationImmediate=401`, `rotationAfter31s=200`). Khóa đã bị gỡ khỏi JWKS vẫn **được chấp nhận tới ≤600 s** (`retiredKeyWithinCacheAge=200`). Cloudflare Access xoay khóa có giai đoạn chồng lấn nên chấp nhận được. Cần ghi vào runbook: thu hồi khẩn cấp phải dựa vào revoke session Access và đổi `ACCESS_AUD`, không dựa vào JWKS. 10 token có `kid` lạ chỉ gây **0** lần fetch thêm, nên không còn khuếch đại DoS.
- **STUDIO-23:** Trên runtime Pages local [IND], `/%61dmin`, `/admin%2F`, `/api/%61dmin/session` và `/api//admin/session` không khớp route Function và nhận **200 `text/html`**. Đó là SPA shell tĩnh, **không có dữ liệu Admin và không đi tới handler Admin**. Frontend cũng không coi các path này là `/admin` (`isAdminPath` so sánh chuỗi nguyên văn). Cần xác minh rằng Access path matching trên edge phủ các biến thể encode: NOT VERIFIED.

### Ghi chú UI (không phải bảo mật, quan sát trong E2E)

- `/admin/articles` ở 390 px bị tràn ngang 23 px. Nguyên nhân là `span.sr-only` (cột "Hành động") dùng `position:absolute` thoát khỏi `.studio-table-wrap`. Các trang `/admin/comments`, `/admin/articles/new` và `/blog` ở 390 px không tràn.
- Editor vẫn ghi "Mọi thay đổi chỉ tồn tại trong phiên prototype này" dù đang ở chế độ API thật và D1 persistent, dễ gây hiểu nhầm.
- Màn hình moderation hiển thị nút "Ẩn" cho comment `pending`; server từ chối đúng (409, `pending→hidden`), nhưng UI nên ẩn nút này.

---

## 4. Kết quả kiểm thử tự chạy

### 4.1 Lệnh dự án [IND]

| Lệnh | Kết quả Claude | Codex báo cáo |
|---|---|---|
| `npm test` | **PASS 180/180** (exit 0) | 180/180 |
| `npm run cms:test` | **Không tồn tại** (`Missing script`). Script thực tế là `cms:test:local` | – |
| `npm run cms:test:local` | **PASS 41/41** (exit 0) | 41/41 |
| `npx tsc -b` | **PASS** (exit 0, không có lỗi; TS1294 đã hết) | PASS |
| `npx oxlint` | **PASS** (exit 0) | PASS |
| Build CMS local (`vite build --outDir dist-cms-local` với env giống `cms:dev`) rồi `npm run build` | **PASS**; scanner: "Production artifacts clean" | PASS |
| Grep độc lập trên `dist/` (test sitekey, `local-*`, `invalid.test`, `cms-dev-worker`, `security-test`, `REPLACE_WITH`) | **0 match**. `dist-cms-local/` chứa test sitekey (đúng kỳ vọng) | – |
| `wrangler pages functions build` + grep marker | **0 match**; routes: `/admin/:path*`, `/api/admin/:path*`, `/api/comments`, `/api/content/:path*`, … | Chưa kiểm |
| `npm audit --omit=dev` | **0 vulnerabilities** | 0 |
| `git diff --check` | **PASS** (chỉ có cảnh báo LF→CRLF). Lưu ý: lệnh này **không** kiểm file untracked | PASS |
| Migrations local trên DB cô lập | `0001→0005` áp dụng theo thứ tự; `last_mutation_id` có mặt trên `cms_comments`/`cms_contents`; migration cũ không bị sửa (hash 0002–0004 trùng audit gốc) | Applied |

### 4.2 PoC gốc chạy lại [IND]

- `jwt.poc.ts` (audit gốc): 9/9 ca bảo mật PASS. Ca "OBSERVATION: JWKS re-fetched every request" giờ **FAIL**, đúng như mong đợi: STUDIO-06 đã được sửa.
- Các ca B.2–B.4 của audit gốc được viết lại trong `retest.poc.ts` để phù hợp với gate mới (bản gốc không đặt `CMS_ADMIN_ENABLED` nên giờ nhận 404).

### 4.3 Chất lượng test mới của Codex (đã đọc assertion)

- `tests/studio-remediation.integration.test.ts`: **thực chất**. Dùng D1 workerd thật (`getPlatformProxy`, `persist:false`), áp migrations thật, so snapshot D1 và đếm audit thật. **Hạn chế:** dùng verifier giả (`verify=async()=>identity`), không kiểm `thumbnailUrl`/`gallery` (STUDIO-17), không kiểm phân loại lỗi của POST.
- `tests/access-jwt.test.ts`: dùng RS256 thật. **Thiếu:** chữ ký sai / khóa lạ trùng `kid`, nhầm khóa HS256, xoay khóa, JWKS lỗi mạng hoặc trả rác. Ngoài ra cache JWKS ở module scope có thể làm test phụ thuộc thứ tự chạy (dùng chung issuer).
- `tests/comments-security.test.ts` (20 test): có, nhưng dùng `verify` giả. Chưa có test cho bypass bare-domain.

---

## 5. Kết quả PoC trên D1 thật (`retest.poc.ts`, 16/16 PASS) [IND]

Môi trường: `getPlatformProxy` + config `wrangler.retest.jsonc` riêng + persist trong `%TEMP%`. Admin đi qua **`verifyAccess` thật** (không inject) với token RS256 ký tại chỗ; JWKS phục vụ từ bộ nhớ. Turnstile đi qua **`verifyTurnstile` thật** với siteverify bị mock.

| Nhóm | Kết quả |
|---|---|
| STUDIO-01 cross-kind (6 hướng × GET/REVISIONS/PATCH/DELETE = 24 ca) | **24/24 → 404**; snapshot D1 (row + số revision + số audit) của 3 bản ghi không đổi; số audit `success` không đổi |
| STUDIO-01 same-kind | `javascript:`, `"  JaVaScRiPt:"`, `data:`, `http:`, key top-level lạ (`kind`, `id`), key data lạ, `DownloadUrl`, `__proto__`, `data` là mảng, key của kind khác → **11/11 → 400**, D1 không đổi |
| Public API | Không có `javascript:` trong `downloadUrl`/`websiteUrl`/`githubUrl`. **Có** trong `thumbnailUrl`/`gallery` (STUDIO-17) |
| STUDIO-02 | Valid → 200, đúng **1** audit `{"status":"approved","fromVersion":1}`, actor đúng. Stale → 409. Missing PATCH/DELETE → **404**. Stale DELETE → 409. Không có audit `success` giả. State cuối là `approved v2` |
| STUDIO-02 race ×25 (approve vs reject) | **25/25 = `200/409`**; mỗi comment có đúng 1 audit, `status` trong audit khớp state đã commit, `version=2` |
| STUDIO-03 race ×25 | **25/25 = `200/409`**, không có `invalid_json`; 2 revision và 1 audit `update` cho mỗi bản ghi |
| STUDIO-03 phân loại lỗi | Xem §3 (PARTIAL) |
| STUDIO-11 content | draft→archived 200; **archived→published 409**; PATCH không có status giữ nguyên `archived`/`published`; archived→draft 200; draft→published 200 |
| STUDIO-11 comment | pending→hidden, approved→rejected, rejected→approved, hidden→rejected, pending→pending, pending→deleted: **409**. pending→approved, approved→hidden, hidden→approved, rejected→pending: 200 |
| Comments | Khách gửi `status:"approved", version, id` → lưu thành **`pending`**. Turnstile sai hostname → 400, sai action → 400, replay (`timeout-or-duplicate`) → 400, siteverify sập → 503, thiếu token → 400, thiếu secret → 503. Rate limit `202,202,202,202,202,429,429`. Comment rejected/hidden/pending: **0 rò rỉ public**. Field public chỉ gồm `id, displayName, body, createdAt, parentId` |
| STUDIO-05 | Polyglot → 201 (OPEN) |
| STUDIO-07 gate | Xem §6 |
| STUDIO-06 JWT | Valid 200 · chữ ký sai 401 · khóa lạ trùng `kid` 401 · `alg=none` 401 · HS256 confusion 401 · sai iss 401 · sai aud 401 · hết hạn 401 · `nbf` tương lai 401 · email lạ 403 · thiếu email 403 · 10 token hợp lệ → 0 fetch thêm · 10 `kid` lạ → 0 fetch thêm · JWKS lỗi mạng (cache lạnh) → 401 · JWKS trả 502/HTML → 401 |
| Rate limit Admin | Khi chạy race dày đặc mà không reset, request thứ 121 trong một phút nhận **429** (quan sát ngẫu nhiên, xác nhận rate limit Admin trên D1 hoạt động) |

---

## 6. Kiểm tra Admin gate (STUDIO-07)

### 6.1 Handler [IND]
| Điều kiện | Status |
|---|---|
| Không có `CMS_ADMIN_ENABLED`/`ENVIRONMENT` (mặc định), kèm JWT owner hợp lệ | **404** |
| `CMS_ADMIN_ENABLED="TRUE"` / `"1"` | 404 / 404 |
| `ENVIRONMENT` = `prod` / thiếu | 404 / 404 |
| Gate tắt + header giả (`x-cms-admin-enabled`, `x-environment`, `cf-access-authenticated-user-email`) | **404** |
| Gate bật, không có token | **401** |
| Gate bật, chỉ có header email giả | **401** |
| Gate bật, thiếu `ACCESS_AUD` | **503** |
| Gate bật, team là placeholder `REPLACE_WITH_TEAM…` / domain lạ `evil.example` | 503 / 503 |
| Gate bật, JWT hợp lệ nhưng email ngoài allowlist | **403** |
| Gate bật, JWT owner | 200 |
| API public khi gate tắt | 200 (độc lập với gate) |

### 6.2 Runtime Pages local (`wrangler pages dev dist`, 127.0.0.1) [IND]

| Path | Gate tắt (`ENVIRONMENT=production`) | Gate bật, không có JWT (chỉ header email giả) |
|---|---|---|
| `/admin`, `/admin/`, `/admin/articles`, `/admin/x/y` | 404 JSON | **401** JSON |
| `/Admin`, `/ADMIN/articles`, `/admin/../admin` | 404 | 401 |
| `/api/admin`, `/api/admin/`, `/api/admin/session`, `/api/admin/articles`, `/API/admin/articles`, `?x=1` | 404 | 401 |
| `/%61dmin`, `/admin%2F`, `/api/%61dmin/session`, `/api//admin/session` | 200 SPA HTML (STUDIO-23) | 200 SPA HTML |
| JWT `alg=none` → `/api/admin/session`, `/admin` | – | 401, 401 |

`VITE_*` chỉ ảnh hưởng bundle UI. Middleware và handler đọc `CMS_ADMIN_ENABLED`/`ENVIRONMENT` từ biến môi trường Pages; client không thể đặt các biến này qua request.

---

## 7. Kiểm tra build isolation (STUDIO-09)

1. Build local CMS với `VITE_STUDIO_ENABLED=true`, `VITE_CMS_API_ENABLED=true`, `VITE_COMMENTS_TURNSTILE_SITE_KEY=1x00000000000000000000AA` → `dist-cms-local/` (test sitekey nằm trong `index-D0PrlbiM.js`, đúng kỳ vọng).
2. Sau đó chạy `npm run build` → `dist/`. Scanner PASS, grep độc lập 0 match.
3. Bundle Functions production (`wrangler pages functions build`): không import `local/`, không có `localVerify`, identity local hay secret local.
4. `wrangler.local.jsonc` trỏ `assets.directory` vào `./dist-cms-local`; `.gitignore` có `dist-cms-local`.
5. Bundle `dist/` production **vẫn chứa mã Studio** (`/api/admin/session`), dù route bị khóa ở runtime (Info, như audit gốc).
6. Local server: `wrangler dev` mặc định bind **127.0.0.1:8797**, không lộ ra LAN. Vite dev 5173/4173 cũng chỉ bind loopback. Harness local (verifier luôn đúng) chỉ chạy được qua `wrangler.local.jsonc`, và cấu hình này không thuộc đường deploy Pages.

> Lưu ý: bước 1–2 **đã ghi đè** `dist/` và `dist-cms-local/`. Đây là build output được gitignore, có thể tái tạo, không phải source.

---

## 8. Browser E2E (built-in browser, local CMS cô lập) [IND]

Môi trường: `wrangler dev --config wrangler.local.jsonc --persist-to %TEMP%\studio-retest\.e2e-state --port 8797`, D1 mới áp 0001–0005. Identity là harness local; Turnstile dùng **test sitekey** của Cloudflare (widget hiển thị "For testing only"). Đây **không phải** kiểm thử Access hay Turnstile thật.

| Bước | Thao tác UI thật | Kết quả |
|---|---|---|
| Tạo bài | Studio → Tạo bài viết, nhập tiêu đề, mô tả, body có payload XSS | – |
| Save Draft | Nút "Lưu nháp" | `POST /api/admin/articles` **201** |
| Refresh | Reload `/admin/articles` | Bài vẫn còn, trạng thái **Bản nháp** |
| Draft không public | – | list public 0; slug **404** |
| Publish | "Chỉnh sửa" → "Xuất bản demo" | `PATCH` **200** |
| Hiển thị public | `/blog/claude-e2e-retest-article` | H1 đúng; body render dạng **text**; 0 `img[onerror]`, 0 script, 0 `javascript:` link |
| Gửi comment | Form public + widget Turnstile test | Thông báo "đã được tiếp nhận"; public **0** comment |
| Pending | `/admin/comments` | 1 pending |
| Approve | Nút "Duyệt" | `PATCH /api/admin/comments/<id>` **200** |
| Comment public | Reload bài viết | "1 bình luận đã duyệt", nội dung hiển thị đúng |
| Archive | "Chỉnh sửa" → "Lưu trữ" | `PATCH` **200**; list public 0; comment **404**; slug: server **404** (curl), trình duyệt nhận 200 từ cache (STUDIO-18) |
| 390 px | `/admin/comments`, `/admin/articles/new`, `/blog` | Không tràn. `/admin/articles` tràn 23 px (ghi chú UI) |
| Clickjacking | Nhúng iframe cùng origin | Bị chặn (`X-Frame-Options: DENY` / `frame-ancestors 'none'`) |

**E2E local: PASS** cho toàn bộ luồng trên. **Không** bao gồm Cloudflare Access, IdP/MFA hay Turnstile thật.

---

## 9. Bề mặt tấn công còn lại

| Tác nhân | Còn lại |
|---|---|
| A. Ẩn danh | `POST /api/comments` (pending, Turnstile, 5/10 phút/IP, spam lọt bộ lọc: STUDIO-08). Đọc nội dung public. Phụ thuộc WAF/edge (NOT VERIFIED) |
| B. Có tài khoản Cloudflare nhưng không được cấp quyền | Bị chặn bởi iss/aud/allowlist (PoC). Phụ thuộc Access policy thật (NOT VERIFIED) |
| C. Chiếm phiên Admin | Toàn quyền CMS trong thời hạn token; có thể chèn `thumbnailUrl`/`gallery`/`downloadUrl` độc hại (STUDIO-17, latent), upload polyglot (STUDIO-05). Việc gỡ nội dung bị chậm do cache (STUDIO-18). Audit hiện **đáng tin** (STUDIO-02 đã sửa). Không thể chạm bucket release |
| D. Nội dung độc hại | XSS không thực thi (E2E). Rủi ro tiềm ẩn khi thêm renderer (STUDIO-04/17) |
| E. Nhầm môi trường | Gate mặc định tắt. Allowlist `test`/`local-only` (STUDIO-20). `wrangler.staging.jsonc` vẫn chứa placeholder và `database_id` toàn số 0. Pages chỉ tự đọc `wrangler.toml/json/jsonc`, không đọc `wrangler.staging.jsonc` |
| F. Release bucket | Không có đường ghi nào. Rủi ro phishing gián tiếp qua `downloadUrl` không giới hạn host (STUDIO-17) |

---

## 10. Đánh giá sẵn sàng cho staging (đều NOT VERIFIED; không tạo hay sửa tài nguyên Cloudflare)

| Điều kiện tiên quyết | Trạng thái | Bằng chứng cần có |
|---|---|---|
| Access IdP + MFA | NOT VERIFIED | Ảnh chụp policy: Include = owner email, Require = MFA hoặc hardware key, session ≤ 8 h |
| Access phủ `/admin`, `/admin/*`, `/api/admin`, `/api/admin/*` (kể cả biến thể encode) | NOT VERIFIED | `curl -I` ẩn danh lên từng path → 302 tới `*.cloudflareaccess.com` |
| Cấu hình Access JWT | Code PASS; cấu hình NOT VERIFIED | `ACCESS_TEAM_DOMAIN` khớp `<team>.cloudflareaccess.com`; AUD staging ≠ production; `/api/admin/session` với JWT thật → 200; email khác → 403 |
| Binding D1 staging | NOT VERIFIED (`database_id` là placeholder) | `wrangler d1 info` cho DB staging; migrations 0002–0005 đã áp |
| Tách R2 CMS Media | Code PASS (không tham chiếu `RELEASES`); bucket NOT VERIFIED | Bucket `aidesk-studio-media-staging` không có r2.dev/custom domain public; token CI không có quyền trên `aidesk-releases` |
| Turnstile staging | NOT VERIFIED | Sitekey/secret staging thật; hostname allowlist; thử replay token → 400 |
| WAF / Rate limiting | NOT VERIFIED; không có trong repo | Rule cho `/api/comments` và `/api/admin/*` |
| D1 export/restore hoặc Time Travel | NOT VERIFIED | Log diễn tập restore về một bookmark; kiểm tra số dòng |
| RTO/RPO | **Chưa có tài liệu** | Mục RTO/RPO trong runbook |
| Backup + incident response | Có một phần (`studio-v2-staging-runbook.md`); thiếu thủ tục purge cache (STUDIO-18) và revoke session Access | Runbook cập nhật |
| Retention + cleanup media | **OPEN** (STUDIO-10) | Cron Trigger cùng test |
| Bật gate | Phải đặt `CMS_ADMIN_ENABLED=true` + `ENVIRONMENT=staging` thủ công (mặc định tắt là đúng) | Ảnh chụp env Pages staging |

---

## 11. Blocker

**Staging blockers** (phải có trước khi bật `CMS_ADMIN_ENABLED` trên staging):
1. Access application và policy phủ đủ 4 nhóm path, bắt buộc MFA (cấu hình, không phải mã).
2. D1, R2, AUD và secrets riêng cho staging; thay hết placeholder trong `wrangler.staging.jsonc`.
3. Turnstile staging thật (sitekey/secret/hostname).

Không còn **blocker mã nguồn** nào cho staging.

**Production blockers:**
1. Bằng chứng E2E trên staging với Access, IdP/MFA và Turnstile thật (mục 10).
2. Diễn tập restore D1 (Time Travel hoặc export) cùng RTO/RPO được ghi lại.
3. STUDIO-10: retention và cleanup (rate-limit, `abuse_key`, media mồ côi).
4. STUDIO-17: schema và allowlist host cho mọi key `data` **trước khi** UI render các trường này (đặc biệt `downloadUrl`). Nếu chưa render thì đây là điều kiện cho tính năng, nhưng nên sửa trước production.
5. STUDIO-18: chính sách cache và quy trình purge khi gỡ nội dung.
6. WAF/rate rule ở edge.
7. STUDIO-05 nếu bật upload hoặc phục vụ media công khai.

---

## 12. Ưu tiên khắc phục tiếp theo (cho Codex)

1. **STUDIO-17:** Schema cho từng key `data` (URL + host allowlist, UUID media, mảng chuỗi có giới hạn) cùng regression test cho mọi key trong `DATA_KEYS`.
2. **STUDIO-03 (phần còn lại):** POST create dùng cùng cơ chế phân loại lỗi với PATCH; trùng slug → 409 `slug_conflict` cho cả POST và PATCH.
3. **STUDIO-10:** Cron retention cùng job đối soát R2↔`cms_media`; đưa audit INSERT của media vào cùng luồng lỗi.
4. **STUDIO-18:** Rút ngắn hoặc bỏ cache public, thêm purge vào runbook.
5. **STUDIO-19/20/21:** Chuẩn hóa mã lỗi auth; gate Pages chỉ chấp nhận `staging|production`; scanner quét thêm bundle Functions và bổ sung pattern.
6. **STUDIO-08:** Chuẩn hóa Unicode, dùng regex domain tổng quát, gom IPv6 theo /64.
7. Bổ sung test `access-jwt` (chữ ký sai, HS256, xoay khóa, JWKS lỗi) và sửa line ending CRLF của manifest.
8. Ghi chú UI: tràn 390 px, thông báo "prototype", nút "Ẩn" cho comment pending.

---

## 13. Kết luận

| Phạm vi | Quyết định | Lý do |
|---|---|---|
| **Local** | **GO** | Toàn bộ test PASS; E2E local PASS; server chỉ bind loopback; harness local cô lập khỏi build và Functions production |
| **Staging** | **CONDITIONAL GO** | Không còn Critical/High/Medium; không có blocker mã. Điều kiện: các staging blocker ở mục 11 (Access + MFA phủ 4 nhóm path, tài nguyên và AUD riêng, Turnstile thật), chỉ bật `CMS_ADMIN_ENABLED` sau khi đã cấu hình xong |
| **Production** | **NO-GO** | Chưa có bằng chứng staging thật (Access, Turnstile, restore drill, RTO/RPO), cùng STUDIO-10/17/18 và WAF còn mở |

Unit test và PoC local PASS **không** chứng minh production an toàn. Hệ thống không phải "không thể bị tấn công": kết luận này chỉ phản ánh snapshot đã nêu và các kiểm thử đã chạy.

---

## Phụ lục — Artifact của retest (ngoài repo)

`%TEMP%\studio-retest\`: `retest.poc.ts` (16 test), `retest-run.log`, `claude-start-manifest.txt` (99 hash), các log `npm-test.log`, `cms-test.log`, `tsc.log`, `lint.log`, `audit.log`, `build-local.log`, `build-prod.log`, `fnbuild.log`, `pages-off.log`, `pages-on.log`, `e2e-dev.log`, `e2e-migrate.log`, và `fnbundle/index.js` (bundle Functions dùng để quét). Toàn bộ tiến trình `wrangler`/`workerd` do Claude khởi chạy (cổng 8797–8799) đã được dừng; các cổng đã trống lúc kết thúc.
