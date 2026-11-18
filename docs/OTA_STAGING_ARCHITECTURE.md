# AI Desk OTA — môi trường staging cô lập (thiết kế V1)

Trạng thái 2026-11-18: **code + test offline**. Chưa tạo tài nguyên Cloudflare, chưa build bản QA, chưa deploy.

## 1. Hai môi trường, không có đường chéo

| | production (giữ nguyên) | staging (QA) |
|---|---|---|
| Feed origin compile vào app | `https://webaidesk.pages.dev` | `https://webaidesk-staging.pages.dev` (allowlist trong `src/shared/updateTarget.ts`) |
| Pages project | `webaidesk` | `webaidesk-staging` (mới) — biến `RELEASE_TARGET=staging` |
| R2 bucket (binding `RELEASES`) | `aidesk-releases` | `aidesk-releases-staging` (mới, riêng tư) |
| Catalog | `server/releaseData.ts` | `server/releaseDataStaging.ts` |
| Khoá Ed25519 | `release-*` (`release-2026a`) | `staging-*` (`staging-2026a`, mới, khác khoá production) |
| Version gate (AI-Desk) | `release/published-versions.json` | `release/published-versions.staging.json` |
| Profile của app | `%APPDATA%\ai-desk` | `%APPDATA%\ai-desk-qa` (kể cả `crash.log`) |
| Journal pipeline | `%LOCALAPPDATA%\aidesk-release\state\production-beta-<v>.json` | `…\staging-beta-<v>.json` |

Chặn nhầm đích ở **4 lớp**, lớp nào cũng fail-closed:
1. **Build AI-Desk** (`resolveUpdateTarget`, chạy trong `electron.vite.config.ts` và `updater-before-pack.mjs`): target lạ, staging thiếu origin hợp lệ / thiếu khoá, staging mang khoá `release-*`, production trỏ origin khác hoặc mang khoá `staging-*` → **build dừng**.
2. **App lúc chạy** (`compiledUpdateTarget`): giá trị compile không nhất quán → không tin khoá nào → check-only (không bao giờ tự chuyển sang production). Bộ lọc khoá theo tiền tố target.
3. **Website** (`server/releaseTarget.ts`): catalog staging chỉ phục vụ khi `RELEASE_TARGET=staging` **và** host là `webaidesk-staging.pages.dev` (hoặc preview `*.webaidesk-staging.pages.dev`); host staging thiếu biến, hoặc biến staging trên host production → `503 target_mismatch`. Production không đặt biến → hành vi y như cũ.
4. **Pipeline** (`scripts/release-beta.mjs --target`): `--target` bắt buộc cho mọi chế độ thay đổi trạng thái; app phải được build cho đúng target (đọc `define_UPDATE_TARGET_default` trong `app.asar`, bản cũ ≤ beta.3 = production); app không được mang khoá của môi trường kia; key id đúng tiền tố; signer staging không được là khoá production; staging không bao giờ ghi catalog production; câu xác nhận chứa tên target (`UPLOAD staging …` không duyệt được production và ngược lại).

Bản 0.5.0-beta.2 / beta.3 đang phát hành **không đổi**: build mặc định vẫn ra đúng object `PRODUCTION_TARGET` (cùng origin, cùng profile, cùng khoá), website production không đặt `RELEASE_TARGET`.

## 2. Bản QA

- Build từ một **staging worktree dùng một lần** của AI-Desk có commit target (branch `feature/ota-staging-target`):
  ```
  set AIDESK_UPDATE_TARGET=staging
  set AIDESK_UPDATE_FEED_ORIGIN=https://webaidesk-staging.pages.dev
  set AIDESK_RELEASE_FEED_KEYS=staging-2026a:<spki staging>
  node scripts/release-version.mjs prepare --version 0.5.0-beta.2 --channel beta --write   (staging cho phép nhãn thấp hơn package.json)
  npm run dist:win   (+ các biến helper như bản thường)
  ```
  Log phải có `UPDATER_TARGET: staging https://webaidesk-staging.pages.dev (profile %APPDATA%\ai-desk-qa …)`.
- Lặp lại với `0.5.0-beta.3` (danh sách staging phải có beta.2 → gate chặn tái dùng nhãn).
- **Giới hạn còn lại**: bản QA vẫn là identity "Stable" của AI Desk (cùng appId, cùng native host `com.aidesk.gptweb`, cùng cổng Control API 38421, cùng thư mục cài mặc định). Vì vậy **chỉ cài bản QA trên máy ảo / tài khoản Windows riêng**, không bao giờ trên máy đang dùng AI Desk thật. Tách appId/productName/native host cho QA là việc V2.

## 3. Tài nguyên Cloudflare cần Owner duyệt (chưa làm)
1. Khoá staging: `node scripts/release-components.mjs keygen --out C:\Users\clubb\AiDeskKeys\staging-2026a.pem --key-id staging-2026a`.
2. R2 bucket riêng tư `aidesk-releases-staging` (không public, không r2.dev).
3. Pages project `webaidesk-staging` (không gắn Git, không custom domain), binding `RELEASES` → bucket staging, biến `RELEASE_TARGET=staging`, `ENVIRONMENT=staging`. Không gắn `CMS_DB` / bug report.
4. Deploy lần đầu: `npm run check` rồi `npx wrangler pages deploy dist-public --project-name webaidesk-staging --branch main`.

## 4. Quy trình E2E beta.2 QA → beta.3 QA (trên VM)
1. Tạo tài nguyên mục 3; build **beta.2 QA** và **beta.3 QA** (mục 2); giữ `stage-<v>\dist\win-unpacked` của từng bản.
2. Phát hành beta.2 QA lên staging:
   `node scripts/release-beta.mjs 0.5.0-beta.2 --target staging --key C:\Users\clubb\AiDeskKeys\staging-2026a.pem --artifacts <qa-beta2> --unpacked <qa-beta2-win-unpacked> --release`
   (gõ `UPLOAD staging …`, `PUBLISH staging …`, `PROMOTE staging …`).
3. Trên VM: cài beta.2 QA từ file Setup (tải tay), mở → kiểm tra `%APPDATA%\ai-desk-qa` được tạo, `%APPDATA%\ai-desk` **không** có.
4. Phát hành beta.3 QA lên staging bằng lệnh tương tự.
5. Trên VM: Settings → Check for updates → thấy 0.5.0-beta.3, tự tải, "Update verified (SHA-512 + signed release)" → Restart and update → app mở lại **0.5.0-beta.3**, dữ liệu QA còn nguyên.
6. Thử phủ định: dùng tài khoản quản trị Cloudflare đổi `latest.yml` staging trỏ sang installer khác (hoặc ký bằng khoá production) → app phải từ chối.
7. Báo cáo PASS/FAIL; xoá VM. Production không bị đụng ở bất kỳ bước nào.
