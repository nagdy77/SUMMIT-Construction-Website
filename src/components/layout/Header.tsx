import { useEffect, useRef, useState } from 'react'
import { Container } from '../ui/Container'
import { Icon } from '../ui/Icon'
import { ThemeToggle, useTheme } from './ThemeProvider'
import { assetUrl } from '../../lib/assets'

const navigation = [
  { label: 'Home', href: '#top' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact', href: '#contact' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('#top')
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const theme = useTheme()?.theme ?? 'dark'

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButtonRef.current?.focus() }
    }
    if (menuOpen) window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [menuOpen])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setActive(`#${visible.target.id}`)
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 })
    navigation.forEach(({ href }) => { const section = document.querySelector(href); if (section) observer.observe(section) })
    return () => observer.disconnect()
  }, [])

  return (
    <header className="site-header sticky top-0 z-50 border-b border-[var(--color-border)]">
      <Container className="relative z-10 flex h-[5.25rem] items-center justify-between gap-4">
        <a href="#top" aria-label="SUMMIT Construction home" className="flex shrink-0 items-center gap-4" onClick={() => setMenuOpen(false)}>
          <img src={assetUrl(theme === 'dark' ? '/assets/brand/summit-logo-gold-intro.webp' : '/assets/brand/summit-logo-dark-ui.webp')} alt="SUMMIT Construction" width="269" height="240" decoding="async" className="h-[3.35rem] w-[3.75rem] object-contain" />
          <span className="hidden border-l border-[var(--color-border)] pl-4 text-[0.54rem] font-semibold uppercase leading-5 tracking-[0.22em] text-[var(--color-muted)] sm:block">Construction<br />Restoration & renovation</span>
        </a>
        <div className="flex items-center gap-3 lg:gap-7">
          <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex xl:gap-9">
            {navigation.map((item) => <a key={item.href} href={item.href} aria-current={active === item.href ? 'page' : undefined} className="nav-link">{item.label}</a>)}
          </nav>
          <ThemeToggle />
          <button ref={menuButtonRef} type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} className="theme-toggle lg:hidden" onClick={() => setMenuOpen((value) => !value)}>
            <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </Container>
      {menuOpen ? <>
        <button type="button" tabIndex={-1} aria-label="Close navigation backdrop" className="fixed inset-0 top-[5.25rem] bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)} />
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="mobile-navigation absolute inset-x-0 top-full border-b border-[var(--color-border)] lg:hidden">
          <Container className="pb-7 pt-3">
            {navigation.map((item, index) => <a key={item.href} href={item.href} className="flex min-h-14 items-center justify-between border-b border-[var(--color-border)] py-3 text-2xl tracking-tight" onClick={() => setMenuOpen(false)}><span>{item.label}</span><span className="text-[0.6rem] tracking-widest text-[var(--color-accent)]">0{index + 1}</span></a>)}
            <div className="mt-5 flex items-center justify-between gap-3"><span className="text-[0.6rem] uppercase tracking-widest text-[var(--color-muted)]">Appearance</span><ThemeToggle labelled /></div>
            <button type="button" className="mt-3 flex min-h-11 items-center gap-2 text-xs text-[var(--color-muted)]" onClick={() => { setMenuOpen(false); window.dispatchEvent(new Event('summit:open-preview')) }}><Icon name="clock" size={15} />48-hour preview notice</button>
          </Container>
        </nav>
      </> : null}
    </header>
  )
}
