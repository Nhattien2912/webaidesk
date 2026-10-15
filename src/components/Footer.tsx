import React from 'react'
import { Mail } from 'lucide-react'
import { Logo } from './Logo'
import { SocialList } from './SocialLinks'
import { legalNav, mainNav } from '../config/navigation'
import { siteConfig } from '../config/site'

const BUILD_YEAR = new Date().getFullYear()

export const Footer: React.FC = () => (
  <footer className="border-t border-white/[0.06] bg-navy-950 text-slate-400">
    <div className="container-content grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
      <div className="space-y-4">
        <Logo />
        <p className="max-w-xs text-sm leading-relaxed">
          Ứng dụng Windows điều phối GPT Manager và các AI worker trong một quy trình làm việc.
        </p>
        <p className="max-w-sm text-xs leading-relaxed text-slate-500">
          AI Desk là công cụ độc lập, không liên kết với OpenAI, Anthropic, Google hay Microsoft. Các thương hiệu
          thuộc về chủ sở hữu tương ứng.
        </p>
      </div>

      <nav aria-label="Sản phẩm">
        <h2 className="text-sm font-semibold text-white">Sản phẩm</h2>
        <ul className="mt-4 space-y-2.5 text-sm">
          {mainNav.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="hover:text-white">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Pháp lý và cập nhật">
        <h2 className="text-sm font-semibold text-white">Thông tin</h2>
        <ul className="mt-4 space-y-2.5 text-sm">
          {legalNav.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="hover:text-white">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div>
        <h2 className="text-sm font-semibold text-white">Liên hệ</h2>
        <div className="mt-4 space-y-3 text-sm">
          {siteConfig.contactEmail ? (
            <a href={`mailto:${siteConfig.contactEmail}`} className="flex items-center gap-2 hover:text-white">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {siteConfig.contactEmail}
            </a>
          ) : (
            <p className="text-slate-500">Kênh liên hệ sẽ được công bố cùng bản Public Beta.</p>
          )}
          <SocialList tone="light" />
        </div>
      </div>
    </div>
    <div className="border-t border-white/[0.06]">
      <div className="container-content flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:justify-between">
        <span>© {BUILD_YEAR} AI Desk.</span>
        <span>Free Public Beta trước · AI Desk Pro sau</span>
      </div>
    </div>
  </footer>
)
