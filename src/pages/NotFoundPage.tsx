import React from 'react'
import { PageLayout } from './PageLayout'

export const NotFoundPage: React.FC = () => (
  <PageLayout title="Không tìm thấy trang" intro="Đường dẫn này không tồn tại hoặc đã được chuyển đi.">
    <p>
      <a href="/" className="font-medium text-accent-light hover:underline">
        Quay về trang chủ AI Desk
      </a>
    </p>
  </PageLayout>
)
