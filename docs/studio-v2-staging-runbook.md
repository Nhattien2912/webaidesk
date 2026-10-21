# Studio V2 staging, verification và rollback

## Cần phê duyệt trước khi thao tác Cloudflare thật

1. Tạo D1 database riêng `aidesk-studio-staging` và R2 bucket riêng `aidesk-studio-media-staging`.
2. Tạo Pages staging project hoặc staging branch/domain tách production.
3. Tạo Access self-hosted applications bao phủ chính xác `/admin`, `/admin/*`, `/api/admin`, `/api/admin/*`; policy chỉ allow identity chủ sở hữu qua Google và yêu cầu MFA/passkey.
4. Điền ID staging vào bản sao cấu hình triển khai. Không sửa binding `RELEASES` và không dùng database/bucket production.
5. Đặt `CMS_CSRF_SECRET` bằng `wrangler pages secret put`; không truyền secret trên command line hoặc commit `.dev.vars`.
6. Đặt `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ACCESS_ALLOWED_IDENTITIES`, `CMS_ALLOWED_ORIGINS`, `VITE_STUDIO_ENABLED=true`, `VITE_CMS_API_ENABLED=true` chỉ trong staging.
7. Áp migrations lên D1 staging sau backup/approval; deploy preview/staging, không production.

## Local

```text
npx wrangler d1 migrations apply aidesk-studio-staging --local --config wrangler.staging.jsonc
npm run check
```

Wrangler local persistence nằm trong `.wrangler/` và đã bị Git ignore qua pattern dự án/tooling; không dùng fixture làm dữ liệu remote.

## Security verification checklist

- Access redirects anonymous users trên cả root và wildcard paths.
- API tự reject JWT thiếu/sai/hết hạn/sai AUD dù gọi trực tiếp.
- Identity ngoài allowlist nhận 403.
- Mutation cross-origin/thiếu CSRF nhận 403.
- Draft/archived không xuất hiện qua list hoặc slug public.
- Upload SVG, fake MIME, >5 MiB, quá 12.000 px bị reject.
- Update stale version trả 409; publish tạo revision và audit.
- CMS service token/binding không có quyền với installer bucket.
- CSP, nosniff, referrer policy, no-store được xác nhận trên Admin API.
- Backup/restore D1 và media orphan cleanup được diễn tập.

## Cutover và rollback

Không cutover production cho đến khi checklist staging có bằng chứng. Khi được duyệt: backup D1, freeze schema, deploy version đã kiểm, bật Access trước khi bật `VITE_STUDIO_ENABLED`, smoke-test read/write/publish, sau đó mới cho phép sử dụng.

Rollback: tắt Studio flag và Access policy vẫn giữ nguyên; rollback Pages deployment; không hạ migration phá dữ liệu. Nếu mutation lỗi, thu hồi session Access, giữ DB/R2 để điều tra và phục hồi snapshot. Public API có thể fail closed/empty mà không ảnh hưởng release/download hiện hữu.
# V2.3 security operations addendum

- Public CMS API responses are `no-store`; an emergency content removal should be verified with a fresh API request and browser reload. If a future Cache Rule overrides this, purge `/api/content/*` before declaring containment.
- Emergency Access revocation must revoke the Access session and rotate `ACCESS_AUD`; do not rely on the 10-minute JWKS cache to invalidate a retired key immediately.
- Run `POST /api/admin/media/cleanup` with `{ "dryRun": true }` first. V2.3 has no destructive cleanup implementation and no production cron.
- Before enabling the staging Admin gate, replace every `REPLACE_WITH_*` and zero D1 ID, configure `CMS_ALLOWED_IMAGE_HOSTS`, `CMS_ALLOWED_DOWNLOAD_HOSTS`, `CMS_MEDIA_RETENTION_DAYS`, and run `GET /api/admin/security/url-audit` against a backup/restored copy first.
- Production remains blocked until a D1 restore drill defines and meets RPO/RTO, R2 reconciliation is tested, WAF/rate limiting is evidenced, and public media receives full decode/re-encode or stays disabled.
