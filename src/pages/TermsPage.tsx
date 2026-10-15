import React from 'react'
import { PageLayout, Section } from './PageLayout'
import { siteConfig } from '../config/site'

export const TermsPage: React.FC = () => (
  <PageLayout title="Điều khoản sử dụng" intro="Điều kiện khi tải và dùng AI Desk." needsReview updated="15/10/2026">
    <Section title="1. Giai đoạn Beta">
      <p>
        AI Desk đang ở giai đoạn thử nghiệm. Bản Free Public Beta được cung cấp miễn phí và “nguyên trạng”, có thể còn
        lỗi, thay đổi hoặc dừng một số tính năng mà không báo trước. Không có cam kết về độ sẵn sàng hay hỗ trợ.
      </p>
    </Section>

    <Section title="2. Trách nhiệm của bạn">
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Bạn tự chịu trách nhiệm tuân thủ điều khoản của từng dịch vụ AI bạn kết nối (ChatGPT, Codex, Claude và các
          dịch vụ khác) và có tài khoản hợp lệ cho các dịch vụ đó.
        </li>
        <li>
          Mã nguồn do các worker AI tạo ra hoặc sửa đổi cần được bạn kiểm tra trước khi sử dụng. Hãy dùng hệ thống
          quản lý phiên bản (ví dụ Git) và sao lưu dự án.
        </li>
        <li>Chỉ tải AI Desk từ website chính thức và kiểm tra mã SHA-256 được công bố.</li>
      </ul>
    </Section>

    <Section title="3. Miễn trừ trách nhiệm">
      <p>
        Trong phạm vi pháp luật cho phép, AI Desk không chịu trách nhiệm cho thiệt hại phát sinh từ việc sử dụng phần
        mềm, bao gồm mất dữ liệu, thay đổi mã nguồn ngoài ý muốn hoặc việc tài khoản dịch vụ bên thứ ba bị giới hạn.
      </p>
    </Section>

    <Section title="4. Thương hiệu">
      <p>
        AI Desk là công cụ độc lập. ChatGPT, Codex, Claude, Antigravity, Windows và các tên khác thuộc về chủ sở hữu
        tương ứng; việc nhắc đến chúng không có nghĩa là được tài trợ hay chứng thực.
      </p>
    </Section>

    <Section title="5. AI Desk Pro">
      <p>
        AI Desk Pro là phiên bản trả phí dự kiến ra mắt sau Public Beta. Giá, quyền lợi và điều khoản của Pro sẽ được
        công bố riêng; hiện chưa có thanh toán hay giấy phép trả phí nào.
      </p>
    </Section>

    <Section title="6. Liên hệ và luật áp dụng">
      <p>
        Liên hệ: <strong>{siteConfig.contactEmail || '[cần cấu hình]'}</strong>. Luật áp dụng và đơn vị phát hành:{' '}
        <em>[cần cấu hình]</em>.
      </p>
    </Section>
  </PageLayout>
)
