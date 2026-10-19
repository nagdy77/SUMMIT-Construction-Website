import { Container } from '../ui/Container'
import { useTheme } from './ThemeProvider'
import { assetUrl } from '../../lib/assets'

const footerNavigation = [
  { label: 'Home', href: '#top' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact', href: '#contact' },
]

export function Footer() {
  const theme = useTheme()?.theme ?? 'dark'
  return (
    <footer className="site-footer border-t border-[var(--color-border)] bg-[var(--color-page)] text-[var(--color-ink)]">
      <Container className="grid gap-10 pb-28 pt-12 sm:grid-cols-2 sm:items-end lg:grid-cols-12 lg:pb-28 lg:pt-16">
        <div className="lg:col-span-4">
          <a href="#top" className="inline-flex" aria-label="SUMMIT Construction home">
            <img
              src={assetUrl(theme === 'dark' ? '/assets/brand/summit-logo-gold-intro.webp' : '/assets/brand/summit-logo-dark-ui.webp')}
              alt="SUMMIT Construction"
              width="269"
              height="240"
              loading="lazy"
              decoding="async"
              className="h-20 w-auto object-contain"
            />
          </a>
        </div>

        <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-8 gap-y-4 sm:justify-self-end lg:col-span-5 lg:grid-cols-5 lg:justify-self-stretch">
          {footerNavigation.map((item) => (
            <a
              key={item.href}
              className="flex min-h-11 items-center font-body text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent)]"
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <p className="font-body text-[0.6875rem] leading-5 text-[var(--color-muted)] sm:col-span-2 lg:col-span-3 lg:text-right rtl:lg:text-left">
          © {new Date().getFullYear()} SUMMIT Construction.<br />All rights reserved.
        </p>
      </Container>
    </footer>
  )
}
