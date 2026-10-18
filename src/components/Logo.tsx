import React from 'react'
import lockup from '../assets/brand/aidesk-lockup.png'
import mark from '../assets/brand/aidesk-mark.png'

// Official AI Desk lockup (A mark + wordmark) cut from the owner-supplied logo; see brand/README.md.
// The PNG is 96 px tall and shown at 28 px, so it stays sharp on 3x displays.
export const Logo: React.FC<{ className?: string; variant?: 'dark' | 'light' }> = ({ className = '', variant = 'dark' }) => (
  <a href="/" className={className ? `inline-flex items-center ${className}` : 'inline-flex items-center'} aria-label="AI Desk — trang chủ">
    {variant === 'light' ? (
      <>
        <img src={mark} alt="" width={36} height={28} className="h-7 w-9 select-none object-contain" draggable={false} />
        <span className="ml-2 text-[19px] font-bold tracking-[-0.035em] text-brand-navy">AI Desk</span>
      </>
    ) : (
      <img src={lockup} alt="" width={151} height={28} className="h-7 w-auto select-none" draggable={false} />
    )}
  </a>
)
