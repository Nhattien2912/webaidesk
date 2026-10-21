# Studio V2.2 — Security Remediation

Ngày kiểm tra: 2026-10-19. Branch `feature/website-v3-premium-light`, HEAD ban đầu `6ef0c74f44ff54ce14128cd02b9bc6365752f975`. Không deploy, commit, push hoặc merge.

## Baseline và change control

Working tree ban đầu chứa toàn bộ thay đổi Website V3 và Studio V1/V2/V2.1 chưa commit. Checkpoint: `C:\Users\clubb\Desktop\WedAiDesk-checkpoints\studio-v2-2-security-baseline-20261019.zip`. Manifest baseline: `artifacts/studio-v2-2-security/baseline-sha256.txt`.

Toàn bộ 19 SHA-256 baseline khớp chính xác Appendix A của `STUDIO_SECURITY_AUDIT_CLAUDE.md`; không có file nào thay đổi từ snapshot Claude. Không phát hiện tiến trình khác ghi source audit trong thời gian remediation. Wrangler local cũ đã được dừng trước khi đổi schema/build.

## Findings

| ID | Severity | Root cause và remediation | Regression | Status |
|---|---|---|---|---|
| STUDIO-01 | Medium | Repository chỉ scope theo ID. `byId/update/archive/revisions` giờ nhận expected kind và SQL ràng buộc `id + kind`. PATCH merge an toàn với bản ghi đúng kind; top-level/data keys có allowlist theo article/video/app; URL ngoài phải HTTPS. | D1 thật: cross-kind GET/PATCH/DELETE/revisions đều 404, DB/audit không đổi; javascript URL và unknown key trả 400. | **FIXED** |
| STUDIO-02 | Medium | Audit statement chạy dù versioned UPDATE không đổi hàng. Migration `0005_mutation_integrity.sql` thêm marker ngẫu nhiên; revision/audit dùng conditional INSERT trong cùng D1 batch. Missing ID là 404, stale version là 409. | Stale/missing moderation không tăng success audit; hai moderation đồng thời chỉ một 200 và đúng một audit. | **FIXED** |
| STUDIO-03 | Low | DB constraint từ race bị catch thành invalid JSON. Handler chỉ map SyntaxError/payload-size; conflict được xác định bằng row/version và conditional batch không còn ném UNIQUE. | Hai PATCH cùng version trên D1 workerd: `[200,409]`, đúng hai revisions tổng cộng. | **FIXED** |
| STUDIO-04 | Low | Regex Markdown sanitizer không phải parser hoàn chỉnh. Hiện public UI render source bằng React text, không dùng raw HTML; chưa thêm renderer Markdown mới để tránh mở rộng phạm vi. | Existing XSS/Markdown tests. | **OPEN — block trước khi render Markdown thành HTML** |
| STUDIO-05 | Low | Upload chỉ magic-byte check, chưa decode/re-encode raster. Không thay pipeline media trong lượt bounded này. | MIME/signature/size tests hiện có. | **OPEN — production hardening** |
| STUDIO-06 | Low | `createRemoteJWKSet` tạo mỗi request. Thêm cache module-scope tối đa 8 issuer, refresh bounded; issuer chỉ chấp nhận `<team>.cloudflareaccess.com`. Verification RS256/issuer/audience vẫn bắt buộc. | JWT thật ký RS256; alg none, wrong issuer/AUD, expiry, nbf, identity đều reject. | **FIXED** |
| STUDIO-07 | Low | API Admin được bundle mọi environment và chỉ dựa vào Access vars. Thêm `CMS_ADMIN_ENABLED==='true'` + approved `ENVIRONMENT`; mặc định 404. Thêm Pages middleware cho `/admin*`; API vẫn verify Access/identity sau gate. | Default/missing env denied; JWT/headers tests; public API vẫn 200. | **FIXED IN CODE; staging E2E NOT VERIFIED** |
| STUDIO-08 | Low | Text filter bỏ bare domains. Thêm nhận diện bare-domain TLD phổ biến; rate limit vẫn D1/HMAC và global theo abuse key. | URL/HTML tests và sixth-request 429. | **PARTIAL — IPv6 /64 và WAF chưa triển khai** |
| STUDIO-09 | Low | `cms:dev` từng ghi test key vào `dist`. Local build giờ ghi `dist-cms-local`; production vẫn dùng `dist`. Scanner fail khi actual `dist` chứa test key/local identity/harness markers. | Đã chạy `cms:dev`, sau đó `npm run build`; `dist` sạch, marker chỉ ở `dist-cms-local`. | **FIXED** |
| STUDIO-10 | Low | Rate/abuse rows chưa có retention job. Không xóa dữ liệu owner trong lượt này. | N/A | **OPEN — cần retention/cron trước production** |
| STUDIO-11 | Low | Status client có thể chuyển tự do. Content dùng `canTransition`; comments có state machine; status thiếu giữ nguyên current. | Transition và concurrent moderation tests. | **FIXED** |
| STUDIO-12 | Info | Thiếu JWT/D1 PoC tests và script từng tham chiếu file thiếu; TS1294 do parameter properties. Field đã khai báo tường minh, script trỏ file thật, thêm JWT/comments/D1 integration suites. | Full suite 180/180. | **FIXED** |

Additional: STUDIO-13 production dependency audit = 0; dev-only advisories chưa được coi là runtime pass. STUDIO-14 docs đã sửa cho `data_json`. STUDIO-15 `/session` thiếu CSRF secret trả JSON 503. STUDIO-16 moderation body giới hạn 16 KiB.

## Files và vị trí remediation chính

- `server/cms/repository.ts`: kind-scoped read/write/archive/revisions; mutation marker conditional revision/audit.
- `server/cms/handler.ts`: Admin release gate, partial update merge, transition enforcement, precise error classification, JSON 503 cho CSRF config.
- `server/cms/comments.ts`: audit integrity, missing/stale distinction, moderation state machine, request-size cap, bare-domain filter.
- `server/cms/auth.ts`: bounded JWKS cache và Cloudflare Access hostname restriction.
- `server/cms/validation.ts`: allowlist top-level và `data` theo content kind; safe partial updates.
- `functions/admin/[[path]].ts`: server-side gate/Access middleware cho Admin UI.
- `migrations/0005_mutation_integrity.sql`: per-row mutation markers.
- `wrangler.local.jsonc`, `scripts/cms-local.mjs`, `scripts/verify-production-artifacts.mjs`: local/production artifact isolation.
- `tests/access-jwt.test.ts`, `tests/studio-remediation.integration.test.ts`: Appendix B và JWT regression.

## Verification results

- `npm test`: 180/180 PASS.
- `npm run cms:test:local`: 41/41 PASS.
- TypeScript `tsc -b`: PASS.
- Oxlint: PASS.
- `npm run build`: PASS; production artifact scanner PASS.
- `cms:dev` then production build: PASS; `dist` không có local/test markers.
- D1 local migration `0005_mutation_integrity.sql`: applied successfully without reset.
- `git diff --check`: PASS.
- `npm audit --omit=dev`: 0 vulnerabilities.

Chênh lệch 152/172 là do thời điểm: Claude chạy snapshot trước khi `comments-security.test.ts` được tính vào run và khi TS/script còn lỗi. V2.1 sau đó có 152 legacy + 20 comment tests = 172. V2.2 thêm 2 Access JWT và 6 real-D1 remediation tests = 180.

## Remaining risks and release gate

Production remains **NO-GO**. Medium findings đã sửa ở code, nhưng staging vẫn phải xác minh Cloudflare Access redirect/policy/MFA thật, Turnstile hostname/action/replay thật, D1 export/restore hoặc Time Travel, R2 permissions/polyglot strategy, WAF/rate rules, retention cleanup và environment bindings. Chỉ đặt `CMS_ADMIN_ENABLED=true` sau khi các điều kiện này được kiểm.

## Independent Claude retest

1. Re-run Appendix B.2 cross-kind PoC cho GET/PATCH/DELETE/revisions theo cả hai chiều.
2. Re-run B.3 stale/missing moderation và đếm success audit.
3. Re-run B.4 concurrent content update và concurrent moderation trên isolated D1.
4. Chạy `npm run cms:test:local` và kiểm real-D1 suite.
5. Chạy JWT forgery suite: alg none, foreign issuer/key, wrong AUD, expired, nbf, unauthorized email.
6. Xác minh Admin default/missing environment trả 404 và public content vẫn hoạt động.
7. Chạy `npm run cms:dev`, dừng, chạy `npm run build`, rồi scan actual `dist`.
8. Xác minh migration order có `0005_mutation_integrity.sql` mà không sửa migration cũ.
9. So sánh `artifacts/studio-v2-2-security/final-sha256.txt` với source frozen.

## Not verified

Không tuyên bố PASS cho browser E2E, staging Access, WAF, production/remote D1, Turnstile thật, R2 policy hoặc D1 restore drill. Không tài nguyên Cloudflare live nào bị thay đổi.
