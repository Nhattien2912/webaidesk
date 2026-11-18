# AI Desk — One-command beta release pipeline (V1)

`scripts/release-beta.mjs` điều phối toàn bộ việc phát hành một bản beta lên **update feed** (`/api/updates/beta/`).
Nó dùng lại các module có sẵn: `release.mjs` (inspectBuild, transitions, releaseData), `release-components.mjs`
(buildPayload, signPayload, verifyEnvelope, componentRecord). Nó **không** build AI Desk và **không** đổi nút tải trên
website (`src/lib/directDownload.ts`).

## Cách gọi

**`--target production|staging` là bắt buộc** cho mọi chế độ có thể thay đổi trạng thái (release, verify-only, reconcile,
clear-uncertain). Dry-run không có `--target` = xem trước production. Mọi khác biệt giữa hai môi trường (feed, project,
bucket, catalog, tiền tố khoá, journal) nằm trong `TARGETS` của script; xem `docs/OTA_STAGING_ARCHITECTURE.md`.

```bash
# Dry-run (mặc định): không upload, không ghi releaseData.ts, không deploy, không tạo journal.
node scripts/release-beta.mjs 0.5.0-beta.3
node scripts/release-beta.mjs 0.5.0-beta.3 --offline        # không có cả request đọc mạng

# Release: Owner chạy trong terminal của mình; mỗi bước có tác động production cần gõ một câu xác nhận.
node scripts/release-beta.mjs 0.5.0-beta.3 --target production --release [--backend aws|rclone|wrangler]

# Sau sự cố
node scripts/release-beta.mjs 0.5.0-beta.3 --target production --verify-only        # chạy lại POST-RELEASE (chỉ đọc)
node scripts/release-beta.mjs 0.5.0-beta.3 --target production --reconcile          # đối soát bước "started" với trạng thái thật (chỉ đọc)
node scripts/release-beta.mjs 0.5.0-beta.3 --target production --clear-uncertain productionDeploy   # Owner gõ CLEAR …; chỉ sửa journal
```

Mặc định: artifacts `C:\Users\clubb\Desktop\AI-Desk-builds\v<ver>` (Setup.exe, .blockmap, latest.yml); win-unpacked của
**cùng bản build** `…\AI-Desk-builds\stage-<ver>\dist\win-unpacked`; khoá `C:\Users\clubb\AiDeskKeys\release-2026a.pem`,
key id `release-2026a`. Đổi bằng `--artifacts`, `--unpacked`, `--key`, `--key-id`.

## Giai đoạn

| # | Giai đoạn | Làm gì | Fail-closed khi |
|---|---|---|---|
| 1 | PREFLIGHT | git branch/HEAD/dirty/index.lock, releaseData hợp lệ, version `x.y.z-beta.N`, so với feed hiện tại + mọi record, đọc feed live | trùng bản đã publish, bản withdrawn, downgrade/re-use, `.git/index.lock`, **release mode + working tree bẩn** (deploy build từ working tree) |
| 2 | BUILD | `inspectBuild` (latest.yml ↔ installer SHA-512/size, blockmap, Authenticode), `app.asar` của win-unpacked: version, khoá feed đã compile, app-update.yml | sai version (latest.yml / asar), sai hash/size, thiếu blockmap, win-unpacked không cùng build (dist/latest.yml khác), app thiếu khoá `key-id`, bản unsigned mà app đòi publisher |
| 3 | VERIFY | nạp khoá Ed25519 (không log), so với khoá trong app, ký `components.json` (sequence kế tiếp) **trong bộ nhớ**, verify lại, tính releaseData kế tiếp | thiếu khoá, khoá ≠ khoá trong app, chữ ký sai, manifest không chốt đúng installer, feed sau publish không phải bản này |
| 4 | UPLOAD ⛔ | gate `UPLOAD <ver> <sha256[0..8]>`; installer → blockmap → **latest.yml cuối**; HEAD trước: identical → dùng lại, khác → dừng; HEAD sau upload kiểm tra size + sha256 | key bất biến đã có nội dung khác, verify sau upload sai |
| 5 | PUBLISH ⛔ | gate `PUBLISH <ver> seq<N> <hash>`; upload components.json; HEAD công khai mọi object; ghi `server/releaseData.ts` (record feed-only + components published); `npm run check`; **deploy PREVIEW** (`--branch release-<ver>`) rồi kiểm tra preview phục vụ đúng latest.yml + components.json (chữ ký) + installer (Range 206) | object chưa đọc được công khai, check fail, preview không phục vụ đúng bản này |
| 6 | PROMOTE ⛔ | gate `PROMOTE <ver> <hash>`; deploy production `webaidesk` `--branch main` **không --config** (giữ binding Dashboard: RELEASES, CMS_DB, …) | deploy lỗi (ghi "uncertain" trong journal) |
| 7 | POST-RELEASE | kiểm tra production feed như ở preview; cảnh báo nếu nút tải website còn bản cũ; báo PASS/FAIL | bất kỳ sai khác nào → FAIL, không tuyên bố thành công |

## Cổng duyệt Owner
- Chỉ đọc từ **terminal tương tác** (stdin + stdout là TTY). Input bị pipe / do worker in ra → từ chối.
- Câu xác nhận gắn với **target** + version + 8 ký tự đầu sha256 installer (`UPLOAD staging 0.5.0-beta.3 3a78fd9b`); câu mơ hồ (`yes`, `ok`) → từ chối, không làm gì.
- Không có `--yes`, không có biến môi trường bỏ qua cổng. `--release` chỉ mở các cổng, không vượt qua chúng.

## Upload R2
Ưu tiên: **AWS CLI** (`aws` + `AIDESK_R2_ACCOUNT_ID`, profile `AIDESK_AWS_PROFILE` hoặc `r2`) → **rclone**
(`rclone` + `AIDESK_RCLONE_REMOTE`) → **wrangler** (R2 binding qua proxy của tài khoản wrangler đã đăng nhập; chậm,
~1,5 phút / 10 MB, multipart 10 MB có thử lại từng phần). Script không tạo token, không cài công cụ.
Multipart dở dang: AWS/rclone liệt kê và **báo** (không resume/abort); wrangler không liệt kê được → báo `UNKNOWN`,
kiểm tra trên Dashboard R2.

## Journal / chạy lại

Các điểm gián đoạn đã được kiểm thử: put lỗi → không publish; put đã tới R2 nhưng client báo lỗi → HEAD chứng minh, không
upload lại; key bất biến khác nội dung → dừng trước mọi cổng; sau khi upload components → chạy lại dùng đúng bytes/sequence;
preview deploy không rõ kết quả → UNCERTAIN, không deploy lại; `dist-public` đổi sau preview → không promote; production
deploy báo lỗi → UNCERTAIN, `--reconcile` chỉ đánh dấu xong khi feed thật phục vụ đúng bản này; CDN chậm → `--verify-only`;
manifest trong journal hết hạn → ký lại nếu chưa upload, từ chối nếu đã upload; ghi catalog atomic (temp + rename); release
mode từ chối khi không đọc được feed live hoặc chạy `--offline`.

`%LOCALAPPDATA%\aidesk-release\state\beta-<ver>.json` (+ bản `components.json` đã ký, để mọi lần chạy lại dùng **đúng
cùng bytes**). Không chứa khoá bí mật. Chạy lại sẽ:
- dừng nếu artifacts đã đổi (SHA-512 installer khác) — không trộn hai bản build dưới key bất biến;
- dừng nếu có bước "started" chưa có kết quả (deploy) — Owner tự kiểm tra rồi xoá mục đó trong journal;
- nhận ra `releaseData.ts` do chính pipeline ghi (sha256 khớp journal) và cho tiếp tục; object đã upload giống hệt được dùng lại.

## Kiểm thử
`tests/releaseBetaPipeline.test.ts` (22 test) + `tests/releaseTarget.test.ts` (3 test), mọi thứ từ xa đều giả lập: dry-run không tác động; thiếu khoá; khoá ≠ app;
sai hash; sai version; trùng/downgrade; multipart dở; cổng Owner (không TTY / câu sai); working tree bẩn; upload lỗi →
không publish; feed thiếu components ký → không promote; happy path; chạy lại sau lỗi.

## Chưa có trong V1
- Không build AI Desk (dùng artifact đã build + win-unpacked cùng bản).
- Không đổi nút tải website, không commit `releaseData.ts` (Owner tự commit).
- Bản QA vẫn dùng identity Stable (appId, native host, cổng 38421): chỉ cài trên VM / tài khoản Windows riêng.
