import type { HTMLAttributes } from 'react'

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'default' | 'narrow'
}

export function Container({ className = '', size = 'default', ...props }: ContainerProps) {
  const maxWidth = size === 'narrow' ? 'max-w-[1120px]' : 'max-w-[var(--content-width)]'

  return <div className={`mx-auto w-full ${maxWidth} px-[var(--page-gutter)] ${className}`} {...props} />
}
