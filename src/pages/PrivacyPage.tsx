import React from 'react'
import { PageLayout, Section } from './PageLayout'
import { siteConfig } from '../config/site'

// Facts below come from the website source and the AI Desk desktop code (read-only audit):
// local Control API on 127.0.0.1, GPT companion extension limited to chatgpt.com, optional APIZ
// and OpenAI tunnel egress only when configured, waitlist stored in Cloudflare D1.

const contact = siteConfig.contactEmail || '[cần cấu hình]'

export const PrivacyPage: React.FC = () => (
  <PageLayout
    title="Chính sách quyền riêng tư"
    intro="AI Desk xử lý dữ liệu gì, ở đâu và vì sao."
    needsReview
    updated="15/10/2026"
  >
    <Section title="1. Website này">
      <ul className="list-disc space-y-2 pl-5">
        <li>Website không dùng cookie theo dõi, không dùng công cụ phân tích và không yêu cầu đăng nhập.</li>
        <li>
          Phông chữ được tải từ Google Fonts, nên trình duyệt của bạn gửi địa chỉ IP tới máy chủ của Google khi tải
          trang.
        </li>
        <li>Website được phục vụ qua Cloudflare; Cloudflare có thể ghi nhật ký kỹ thuật theo chính sách của họ.</li>
      </ul>
    </Section>

    <Section title="2. Đăng ký nhận tin AI Desk Pro">
      <p>Khi bạn tự nguyện gửi form nhận tin, chúng tôi lưu:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>địa chỉ email, thời điểm đăng ký và phiên bản nội dung đồng ý bạn đã chấp nhận;</li>
        <li>
          một mã băm (hash) của địa chỉ IP, chỉ để giới hạn số lần gửi và chống spam; địa chỉ IP gốc không được lưu.
        </li>
      </ul>
      <p>
        Dữ liệu được lưu trong cơ sở dữ liệu Cloudflare D1 và chỉ dùng để gửi thông báo về AI Desk Pro. Chúng tôi
        không bán hay chia sẻ email cho bên thứ ba vì mục đích quảng cáo. Thời gian lưu trữ: <em>[cần cấu hình]</em>.
      </p>
      <p>
        Để xem, sửa hoặc xóa email khỏi danh sách, liên hệ: <strong>{contact}</strong>.
      </p>
    </Section>

    <Section title="3. Ứng dụng AI Desk trên Windows">
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Việc điều phối chạy trên máy của bạn. Control API của AI Desk chỉ lắng nghe trên địa chỉ nội bộ 127.0.0.1 và
          yêu cầu token.
        </li>
        <li>
          Nội dung bạn giao cho GPT Manager và các worker (ChatGPT, Codex, Claude…) được gửi tới các dịch vụ đó qua ứng
          dụng và tài khoản của chính bạn, và chịu chính sách quyền riêng tư của từng dịch vụ.
        </li>
        <li>
          Extension đồng hành được cài vào hồ sơ trình duyệt dùng cho GPT Manager và chỉ chạy trên chatgpt.com. Theo
          thiết kế, extension không đọc cookie, mật khẩu hay token đăng nhập.
        </li>
        <li>
          Một số tính năng mạng là tùy chọn và chỉ hoạt động khi bạn tự cấu hình, ví dụ dịch vụ APIZ hoặc tunnel kết
          nối từ xa tới Control API.
        </li>
        <li>
          Theo rà soát mã nguồn bản hiện tại, ứng dụng không gửi số liệu sử dụng về máy chủ của AI Desk; các bộ đếm
          sử dụng chỉ lưu trên máy.
        </li>
      </ul>
    </Section>

    <Section title="4. Liên hệ">
      <p>
        Câu hỏi về quyền riêng tư: <strong>{contact}</strong>. Đơn vị chịu trách nhiệm xử lý dữ liệu:{' '}
        <em>[cần cấu hình]</em>.
      </p>
    </Section>
  </PageLayout>
)
