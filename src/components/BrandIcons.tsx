import React, { useId } from 'react'

// Local brand marks (no extra dependency). Decorative only: always aria-hidden, the link text
// carries the accessible name. Colours follow the official brand palettes.

type IconProps = { className?: string }

/** YouTube: white play triangle on the red rounded "play button". */
export const YouTubeIcon: React.FC<IconProps> = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false" data-brand="youtube">
    <path
      fill="#FF0000"
      d="M23.5 6.7a3 3 0 0 0-2.1-2.1C19.5 4.1 12 4.1 12 4.1s-7.5 0-9.4.5A3 3 0 0 0 .5 6.7C0 8.6 0 12 0 12s0 3.4.5 5.3a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.3.5-5.3s0-3.4-.5-5.3Z"
    />
    <path fill="#FFFFFF" d="M9.6 15.6 15.8 12 9.6 8.4v7.2Z" />
  </svg>
)

/** Facebook: white "f" on the Facebook-blue circle; the stem runs off the bottom edge like the official mark. */
export const FacebookIcon: React.FC<IconProps> = ({ className = 'h-6 w-6' }) => {
  const clipId = useId()
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false" data-brand="facebook">
      <defs>
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="12" fill="#0866FF" />
      <path
        clipPath={`url(#${clipId})`}
        fill="#FFFFFF"
        d="M13.6 24V15.2h2.9l.45-3.35H13.6V9.9c0-.95.3-1.62 1.68-1.62H17V5.3a23 23 0 0 0-2.5-.13c-2.48 0-4.18 1.5-4.18 4.29v2.39H7.5v3.35h2.82V24h3.28Z"
      />
    </svg>
  )
}
