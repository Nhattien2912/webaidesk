import React from 'react'
import { Mail } from 'lucide-react'
import { Logo } from './Logo'
import { SocialList } from './SocialLinks'
import { legalNav, mainNav, resourcesNav } from '../config/navigation'
import { siteConfig } from '../config/site'

const BUILD_YEAR = new Date().getFullYear()

export const Footer: React.FC = () => (
  <footer className="border-t border-brand-border bg-brand-surface text-slate-600">
    <div className="container-content grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
      <div className="space-y-4">
        <Logo variant="light" />
        <p className="max-w-xs text-sm leading-relaxed">
          Ứng dụng Windows điều phối GPT Manager và các AI worker trong một quy trình làm việc.
        </p>
        <p className="max-w-sm text-xs leading-relaxed text-slate-500">
          AI Desk là công cụ độc lập, không liên kết với OpenAI, Anthropic, Google hay Microsoft. Các thương hiệu
          thuộc về chủ sở hữu tương ứng.
        </p>
      </div>

      <nav aria-label="Sản phẩm">
        <h2 className="text-sm font-semibold text-brand-navy">Sản phẩm</h2>
        <ul className="mt-4 space-y-2.5 text-sm">
          {mainNav
            .filter((item): item is typeof item & { href: string } => !item.children && Boolean(item.href))
            .map((item) => (
              <li key={item.href}>
                <a href={item.href} className="hover:text-brand-primary">
                  {item.label}
                </a>
              </li>
            ))}
        </ul>
      </nav>

      <nav aria-label="Tài nguyên">
        <h2 className="text-sm font-semibold text-brand-navy">Tài nguyên</h2>
        <ul className="mt-4 space-y-2.5 text-sm">
          {resourcesNav.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="hover:text-brand-primary">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div>
        <h2 className="text-sm font-semibold text-brand-navy">Thông tin</h2>
        <ul className="mt-4 space-y-2.5 text-sm">
          {legalNav.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="hover:text-brand-primary">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-3 text-sm">
          {siteConfig.contactEmail ? (
            <a href={`mailto:${siteConfig.contactEmail}`} className="flex items-center gap-2 hover:text-brand-primary">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {siteConfig.contactEmail}
            </a>
          ) : (
            <p className="text-slate-500">Theo dõi AI Desk qua các kênh cộng đồng bên dưới.</p>
          )}
          <SocialList tone="light" />
        </div>
      </div>
    </div>
    <div className="border-t border-brand-border">
      <div className="container-content flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:justify-between">
        <span>© {BUILD_YEAR} AI Desk.</span>
        <span>Beta Windows miễn phí · AI Desk Pro dự kiến trong tương lai</span>
      </div>
    </div>
  </footer>
)
