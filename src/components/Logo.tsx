import React from 'react'
import lockup from '../assets/brand/aidesk-lockup.png'

// Official AI Desk lockup (A mark + wordmark) cut from the owner-supplied logo; see brand/README.md.
// The PNG is 96 px tall and shown at 28 px, so it stays sharp on 3x displays.
export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <a href="/" className={className ? `inline-flex items-center ${className}` : 'inline-flex items-center'} aria-label="AI Desk — trang chủ">
    <img src={lockup} alt="" width={151} height={28} className="h-7 w-auto select-none" draggable={false} />
  </a>
)
