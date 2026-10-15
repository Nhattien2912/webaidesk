# AI Desk — Product Website

> "Một trung tâm. Nhiều AI. Một quy trình làm việc."  
> Website giới thiệu và điều phối phần mềm Windows Desktop **AI Desk**.

## 🚀 Giới thiệu

AI Desk là ứng dụng Windows điều phối GPT Manager (ChatGPT web) và các AI worker (Codex, Claude Code;
Antigravity/OpenCode đang thử nghiệm). Website định vị theo **Free Public Beta trước, Pro sau**:
không đăng nhập, không license gate, không thanh toán.

## Công nghệ

React 19 · TypeScript · Vite · Tailwind CSS · lucide-react. Backend tuỳ chọn: Cloudflare Pages Functions + D1
(`functions/`, `server/`, `migrations/`).

## Lệnh

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + lint + test + build
```

## Cấu trúc

- `src/components/` — các section của landing page
- `src/pages/` — Privacy, Terms, Changelog, 404 (Privacy/Terms là **bản nháp cần duyệt**)
- `src/config/site.ts` — social links, liên hệ, video, release manifest, waitlist (đọc từ `VITE_*`, xem `.env.example`)
- `src/data/` — nội dung Roadmap và Changelog
- `src/lib/releaseManifest.ts` — kiểm tra manifest, khoá nút tải khi thiếu/không hợp lệ
- `server/waitlistHandler.ts`, `functions/api/waitlist.ts` — API nhận tin AI Desk Pro
- `tests/` — `node --test` (không cần thêm dependency)

Triển khai: xem [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
