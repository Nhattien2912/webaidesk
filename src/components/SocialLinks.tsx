import React from 'react'
import { Code2 } from 'lucide-react'
import { FacebookIcon, YouTubeIcon } from './BrandIcons'
import { socialLinks, type SocialId, type SocialLink } from '../config/site'
import { usableUrl } from '../lib/social'

const ICONS: Record<SocialId, React.FC<{ className?: string }>> = {
  youtube: YouTubeIcon,
  facebook: FacebookIcon,
  // No official GitHub link yet; keep the neutral icon.
  github: ({ className }) => <Code2 className={className} aria-hidden="true" />,
}

// Brand marks carry their own colours; only the neutral GitHub icon takes the theme colour.
function iconClass(id: SocialId, tone: 'light' | 'dark'): string {
  const size = tone === 'dark' ? 'h-6 w-6' : 'h-[18px] w-[18px]'
  return id === 'github' && tone === 'dark' ? `${size} shrink-0 text-accent-light` : `${size} shrink-0`
}

const DESCRIPTIONS: Record<SocialId, string> = {
  youtube: 'Video giới thiệu AI Desk, hướng dẫn sử dụng và chia sẻ quá trình phát triển.',
  facebook: 'Theo dõi tin tức, cập nhật sản phẩm và trao đổi cùng cộng đồng AI Desk.',
  github: 'Báo lỗi và theo dõi phát hành',
}

export const SocialList: React.FC<{ links?: SocialLink[]; tone?: 'light' | 'dark' }> = ({
  links = socialLinks,
  tone = 'dark',
}) => (
  <ul className="space-y-3">
    {links.map((link) => {
      const Icon = ICONS[link.id]
      const href = usableUrl(link.url)
      const base =
        tone === 'dark'
          ? 'flex items-center gap-4 card p-4'
          : 'flex items-center gap-3 text-sm'
      const content = (
        <>
          <Icon className={iconClass(link.id, tone)} />
          <span className="min-w-0">
            <span className={tone === 'dark' ? 'block font-semibold text-ink' : ''}>{link.label}</span>
            {tone === 'dark' && (
              <span className="block text-sm text-muted">{href ? DESCRIPTIONS[link.id] : 'Liên kết sẽ được cập nhật'}</span>
            )}
          </span>
        </>
      )
      return (
        <li key={link.id}>
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} hover:border-accent/40`}>
              {content}
            </a>
          ) : (
            <span className={`${base} opacity-60`} aria-disabled="true" data-social-unconfigured={link.id}>
              {content}
            </span>
          )}
        </li>
      )
    })}
  </ul>
)
