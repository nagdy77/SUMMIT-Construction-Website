import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'

type ButtonVariant = 'gold' | 'dark' | 'light'

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  gold: 'button-gold',
  dark: 'button-dark',
  light: 'button-outline',
}

export function ButtonLink({ children, className = '', variant = 'gold', ...props }: ButtonLinkProps) {
  return (
    <a
      data-magnetic
      className={`summit-button group inline-flex min-h-12 items-center justify-center gap-5 border px-6 py-3 font-body text-[0.6875rem] font-bold uppercase tracking-[0.16em] transition-colors duration-200 ${variants[variant]} ${className}`}
      {...props}
    >
      <span>{children}</span>
      <span aria-hidden="true" className="text-base leading-none transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
        <Icon name="arrow-right" size={18} />
      </span>
    </a>
  )
}
