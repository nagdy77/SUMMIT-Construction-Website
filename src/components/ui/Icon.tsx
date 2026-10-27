import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'sun'
  | 'moon'
  | 'arrow-right'
  | 'arrow-left'
  | 'chevron-left'
  | 'chevron-right'
  | 'mail'
  | 'close'
  | 'menu'
  | 'pause'
  | 'play'
  | 'construction'
  | 'restoration'
  | 'renovation'
  | 'location'

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
  size?: number
}

const paths: Record<IconName, ReactNode> = {
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20.6 14.1A8.8 8.8 0 0 1 9.9 3.4 8.8 8.8 0 1 0 20.6 14.1Z" />,
  'arrow-right': <path d="M4 12h16m-6-6 6 6-6 6" />,
  'arrow-left': <path d="M20 12H4m6-6-6 6 6 6" />,
  'chevron-left': <path d="m15 5-7 7 7 7" />,
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m3 6 9 7 9-7" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M8 12h12M4 17h16" />,
  pause: <path d="M8 5v14M16 5v14" />,
  play: <path d="m8 4 12 8-12 8Z" />,
  construction: <><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-7h6v7M3 5l9-3 9 3" /><path d="M9 10h.01M15 10h.01" /></>,
  restoration: <><path d="M3 21h18M5 18V9m5 9V9m4 9V9m5 9V9M3 9h18L12 3 3 9ZM4 18h16v3" /></>,
  renovation: <><path d="M4 21V9l8-6 8 6v12M8 21v-8h8v8M3 21h18" /><path d="m14 7 3 3m-9 0 2-2" /></>,
  location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
}

/** Shared geometric icon language. Supply an accessible label only for standalone icons. */
export function Icon({ name, size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
