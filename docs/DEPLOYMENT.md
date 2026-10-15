# Triển khai website AI Desk (Cloudflare Pages)

Tài liệu này mô tả cấu hình cần có. **Chưa có gì được deploy** từ repo này.

## 1. Pages project

- Build command: `npm run build` · Output: `dist` · Functions: thư mục `functions/` (tự nhận).
- Biến môi trường build (`VITE_*`): xem `.env.example`. Đây là giá trị công khai, không chứa secret.
- Định tuyến: `/`, `/privacy`, `/terms`, `/changelog`. Repo không có `404.html`, nên Pages trả `index.html`
  cho đường dẫn lạ và ứng dụng hiển thị trang "Không tìm thấy" (kèm `noindex`).
- Header bảo mật và CSP: `public/_headers`.
- Mạng xã hội: YouTube (`https://www.youtube.com/@NhattienIT`) và Facebook
  (`https://www.facebook.com/profile.php?id=61595065515012`) là mặc định chính thức trong `src/lib/social.ts`;
  chỉ đặt `VITE_SOCIAL_YOUTUBE_URL` / `VITE_SOCIAL_FACEBOOK_URL` khi cần ghi đè. GitHub chưa có URL chính thức
  (`VITE_SOCIAL_GITHUB_URL` để trống thì hiển thị "Liên kết sẽ được cập nhật").

## 2. Form nhận tin AI Desk Pro (D1)

1. Tạo D1: `wrangler d1 create <DB_NAME>`.
2. Sao chép `wrangler.toml.example` → `wrangler.toml`, điền tên/ID database.
3. Áp migration: `wrangler d1 migrations apply <DB_NAME> --remote` (`migrations/0001_waitlist.sql`).
4. Gắn binding `DB` cho Pages project (Settings → Functions → D1 bindings).
5. Secret (khuyến nghị): `IP_HASH_SALT`; tuỳ chọn `TURNSTILE_SECRET_KEY` + biến build `VITE_TURNSTILE_SITE_KEY`.

API `POST /api/waitlist`:

| Kết quả | HTTP | Body |
|---|---|---|
| Ghi nhận (kể cả email đã có) | 200 | `{"ok":true}` |
| Email sai / thiếu đồng ý / honeypot / gửi quá nhanh / sai Origin | 400 | `{"ok":false,"error":"invalid_email" \| "consent_required" \| "rejected"}` |
| Turnstile sai (khi bật) | 400 | `captcha_failed` |
| Quá 5 lần/giờ/IP | 429 | `rate_limited` |
| Chưa gắn D1 | 503 | `not_configured` |
| Lỗi DB | 500 | `server_error` |

Frontend chỉ báo thành công khi nhận `200` + `{"ok":true}`. Mọi phản hồi khác (kể cả khi Function chưa
được deploy) hiển thị lỗi và nói rõ đăng ký **chưa được lưu**.

## 3. Bản tải (Pages Functions + R2 private)

Hiện trạng đã xác minh: Pages project `webaidesk` (https://webaidesk.pages.dev, GitHub `Nhattien2912/webaidesk`,
branch `main`); R2 bucket `aidesk-releases` **private**, chưa có EXE. Website giữ **fail-closed** cho tới khi có
bản phát hành được duyệt.

Nguồn metadata duy nhất: `server/releases.json` (quy tắc trong `server/releaseRecords.ts`). Chi tiết pipeline,
định dạng record, `latest.yml` và cache: xem [RELEASE_PIPELINE.md](RELEASE_PIPELINE.md). Contract updater
cho Desktop (Phase B, chưa làm): [DESKTOP_UPDATER_PHASE_B.md](DESKTOP_UPDATER_PHASE_B.md).

### Routes

| Route | Mục đích |
|---|---|
| `GET /api/releases/latest` | Manifest v1 cho website (bản hiện tại của kênh `stable`) |
| `GET/HEAD /api/download/<file>.exe` | Tải installer/portable đã publish + duyệt |
| `GET/HEAD /api/updates/stable/latest.yml` | Feed electron-updater (file do electron-builder sinh, phục vụ nguyên văn) |
| `GET/HEAD /api/updates/stable/<installer>.exe[.blockmap]` | Installer + blockmap cho updater |

Tất cả đọc từ bucket R2 **private** qua binding `RELEASES`; không bật public bucket hay `r2.dev`.
Website và updater luôn lấy **cùng một bản** (semver cao nhất đã publish + duyệt + ký).

| Lỗi | HTTP |
|---|---|
| Sai method | 405 |
| Tên file / kênh không hợp lệ | 400 `invalid_filename` / 404 `unknown_channel` |
| Không có trong records / chưa publish / chưa duyệt / chưa ký | 404 `not_found` |
| Chưa có bản hiện tại | 404 `no_release` |
| Chưa gắn binding `RELEASES` | 503 `not_configured` |
| Record có nhưng R2 thiếu object | 503 `release_unavailable` |
| Size/SHA-256 (hoặc nội dung latest.yml) khác record | 503 `integrity_mismatch` |
| Lỗi đọc R2 | 502 `storage_error` |

### Thiết lập Cloudflare (người dùng tự làm, chưa làm trong repo này)

1. Pages → `webaidesk` → Settings → Bindings → **R2 bucket**: biến `RELEASES` → bucket `aidesk-releases`
   (Production; thêm Preview nếu muốn test staging). Hoặc dùng `wrangler.toml.example` (đọc cảnh báo trong file).
2. Không đặt `ALLOW_UNSIGNED_DOWNLOAD` (feed updater không bao giờ phục vụ bản chưa ký).
3. Tạo R2 API token chỉ có Object Read & Write trên `aidesk-releases`, rồi tự chạy `aws configure --profile r2`
   (AWS CLI v2 đủ mới để có `--if-none-match`). Không lưu khóa trong repo.

### Phát hành một bản (sau khi đã ký số)

```bash
node scripts/release.mjs inspect  --dir <thư-mục-output-electron-builder>
node scripts/release.mjs stage    --dir <dir> --account-id <id> --execute --write   # upload + verify, record = staged
node scripts/release.mjs approve  --version <semver> --write
node scripts/release.mjs publish  --version <semver> --write                         # rồi review + deploy
node scripts/release.mjs withdraw --version <semver> --write                         # rollback, rồi deploy
```

Mặc định mọi lệnh là dry-run. Bản chưa ký chỉ được stage để test nội bộ, không thể approve/publish.

## 4. Kiểm tra trước khi công bố

```bash
npm run check
```

(`typecheck` + `lint` + `test` + `build`.)
