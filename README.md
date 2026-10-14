# AI Desk — Product Website

> "Một trung tâm. Nhiều AI. Một quy trình làm việc."  
> Website giới thiệu và điều phối phần mềm Windows Desktop **AI Desk**.

## 🚀 Giới thiệu

AI Desk là giải pháp Windows Desktop giúp lập trình viên điều phối và quản lý luồng làm việc giữa các công cụ AI lập trình hàng đầu:
- **GPT Manager (ChatGPT / Web)**: Quản lý, phân tích bài toán, lập kế hoạch và nghiệm thu kết quả.
- **OpenAI Codex**: Chuyên trách viết mã, refactor và tạo unit test.
- **Claude Desktop**: Đọc mã nguồn, đánh giá bảo mật và review diff.
- **Google Antigravity**: Môi trường IDE AI đồng bộ context.
- **OpenCode**: Worker mã nguồn mở tùy chọn.

## 🛠️ Công nghệ sử dụng

- **Frontend:** React 19, TypeScript
- **Styling:** Tailwind CSS, PostCSS
- **Icons & Animation:** Lucide Icons, Framer Motion
- **Tooling:** Vite
- **Deployment:** Cloudflare Pages / Vercel ready

## 💻 Khởi chạy môi trường phát triển

```bash
# Cài đặt dependencies
npm install

# Chạy dev server tại localhost:5173
npm run dev

# Build production
npm run build
```

## 🌐 Triển khai lên Cloudflare Pages

Dự án được cấu hình chuẩn cho Cloudflare Pages:
- **Framework Preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
