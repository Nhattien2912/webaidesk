# AI Desk Studio V2 — secure CMS architecture

## Trạng thái nghiệm thu

| Hạng mục | Trạng thái |
|---|---|
| Pages Functions public/admin handlers | Đã triển khai bằng code |
| Access JWT, audience/issuer/identity checks | Đã triển khai; kiểm thử local bằng injected verifier |
| D1 migration và repository | Đã áp dụng/kiểm tra trên D1 local |
| R2 media pipeline | Đã triển khai; binding mock đã kiểm thử local |
| Frontend DemoRepository/ApiRepository | Đã triển khai |
| Cloudflare Access, D1, R2 staging thật | Cần chủ sở hữu cấu hình staging |
| Đăng nhập Access end-to-end | Chưa xác minh staging |
| Production | Chưa triển khai, Admin mặc định tắt |

Public API và Admin API có handler/route riêng. Public query luôn thêm `status='published'` và không có endpoint mutation. Admin kiểm Access JWT tại server cho mọi request, sau đó kiểm Origin + CSRF HMAC cho mutation. Không có password riêng, bypass flag hoặc token trong localStorage.

D1 dùng `cms_contents` làm phần lõi được chuẩn hóa. V2.2 lưu payload riêng trong `data_json` với allowlist theo từng kind; các bảng `cms_videos` và `cms_applications` được giữ cho migration tương lai và chưa phải nguồn dữ liệu runtime. Mọi create/update ghi revision và audit trong cùng `D1.batch`; update dùng `WHERE version=?` và mutation marker để chống lost update và false-success audit. Soft delete/archive không xóa lịch sử.

Media chỉ dùng binding `CMS_MEDIA`, nhận JPEG/PNG/WebP tối đa 5 MB, kiểm magic bytes, kích thước, key ngẫu nhiên và SHA-256. Code CMS không tham chiếu binding `RELEASES`.

Frontend mặc định dùng `DemoRepository`. Staging chỉ bật `ApiRepository` khi có `VITE_STUDIO_ENABLED=true` và `VITE_CMS_API_ENABLED=true`; production mặc định vẫn trả 404 cho `/admin*`.

## Threat model

- Giả JWT/header: signature, issuer, audience, expiry và identity allowlist được kiểm server-side.
- CSRF: mutation yêu cầu Access token hợp lệ, exact allowlisted Origin, same-site fetch signal và HMAC CSRF token từ endpoint session.
- XSS: Markdown loại raw HTML nguy hiểm và scheme `javascript/data/vbscript`; frontend không dùng `dangerouslySetInnerHTML`.
- SQL injection: toàn bộ giá trị dùng prepared statements/bind parameters; filter cấu trúc lấy từ enum.
- Lost update: version bắt buộc, mismatch trả 409.
- Draft leak: public repository hard-code published và soft-delete filter.
- Upload polyglot/spoof: allowlist MIME + signature + byte/dimension limits; SVG/HTML bị từ chối.
- Supply-chain/secret leak: secret chỉ qua Pages/Workers secret; không đặt trong `VITE_*`, source, log hay ảnh.
- Privilege crossover: CMS Media và installer Release dùng binding/bucket khác nhau.

Giới hạn còn lại: chưa có malware/image decode service, rate limiting edge rule thật, staging IdP test, backup restore drill hoặc browser E2E với Access thực tế.
