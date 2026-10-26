import { useEffect, useRef, useState } from 'react'
import { Container } from '../ui/Container'
import { Icon } from '../ui/Icon'
import { ThemeToggle } from './ThemeProvider'
import { assetUrl } from '../../lib/assets'
import { useCopy, useCurrentPath, useLocale } from '../../content/site'
import { resolveRoute, routePath } from '../../lib/routes'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const locale = useLocale()
  const currentPath = useCurrentPath()
  const copy = useCopy()
  const navigation = [
    { label: copy.nav.home, page: 'home', href: routePath(locale) },
    { label: copy.nav.about, page: 'about', href: routePath(locale, 'about') },
    { label: copy.nav.services, page: 'services', href: routePath(locale, 'services') },
    { label: copy.nav.projects, page: 'projects', href: routePath(locale, 'projects') },
    { label: copy.nav.clients, page: 'clients', href: routePath(locale, 'clients') },
    { label: copy.nav.downloads, page: 'downloads', href: routePath(locale, 'downloads') },
    { label: copy.nav.contact, page: 'contact', href: routePath(locale, 'contact') },
    { label: copy.nav.privacy, page: 'privacy', href: routePath(locale, 'privacy') },
  ]
  const currentRoute = resolveRoute(currentPath)
  const languageHref = routePath(locale === 'en' ? 'ar' : 'en', currentRoute.page, currentRoute.slug)

  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') return

      const header = menuButtonRef.current?.closest<HTMLElement>('.site-header')
      const focusable = Array.from(header?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]):not([tabindex="-1"])') ?? [])
        .filter((element) => element.getClientRects().length > 0)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  return (
    <header className="site-header sticky top-0 z-50 border-b border-[var(--color-border)]">
      <Container className="relative z-10 flex h-[5.25rem] items-center justify-between gap-4">
        <a href={routePath(locale)} aria-label="SUMMIT Construction" className="flex shrink-0 items-center gap-4" onClick={() => setMenuOpen(false)}>
          <img src={assetUrl('/assets/brand/summit-logo-gold-intro.webp')} alt="SUMMIT Construction" width="269" height="240" decoding="async" className="h-[3.35rem] w-[3.75rem] object-contain" />
          <span className="hidden border-l border-[var(--color-border)] pl-4 text-[0.54rem] font-semibold uppercase leading-5 tracking-[0.22em] text-[var(--color-muted)] sm:block">Construction<br />Restoration & renovation</span>
        </a>
        <div className="flex items-center gap-2 lg:gap-4">
          <nav aria-label={locale === 'en' ? 'Main navigation' : 'التنقل الرئيسي'} className="hidden items-center gap-2 lg:flex xl:gap-3 2xl:gap-5">
            {navigation.map((item) => <a key={item.href} href={item.href} aria-current={currentRoute.page === item.page || (currentRoute.page === 'project-detail' && item.page === 'projects') || (currentRoute.page === 'service-detail' && item.page === 'services') ? 'page' : undefined} className="nav-link">{item.label}</a>)}
          </nav>
          <a className="language-switch" lang={locale === 'en' ? 'ar' : 'en'} href={languageHref}>{copy.home.language}</a>
          <ThemeToggle />
          <button ref={menuButtonRef} type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? copy.actions.close : copy.actions.menu} className="theme-toggle lg:hidden" onClick={() => setMenuOpen((value) => !value)}>
            <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </Container>
      {menuOpen ? <>
        <button type="button" tabIndex={-1} aria-label={copy.actions.close} className="fixed inset-0 top-[5.25rem] bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)} />
        <nav id="mobile-navigation" aria-label={locale === 'en' ? 'Mobile navigation' : 'قائمة التنقل'} className="mobile-navigation absolute inset-x-0 top-full border-b border-[var(--color-border)] lg:hidden">
          <Container className="max-h-[calc(100svh-5.25rem)] overflow-auto pb-7 pt-3">
            {navigation.map((item, index) => <a key={item.href} href={item.href} aria-current={currentRoute.page === item.page || (currentRoute.page === 'project-detail' && item.page === 'projects') || (currentRoute.page === 'service-detail' && item.page === 'services') ? 'page' : undefined} className="flex min-h-14 items-center justify-between border-b border-[var(--color-border)] py-2 text-xl tracking-tight" onClick={() => setMenuOpen(false)}><span>{item.label}</span><span className="text-[0.6rem] tracking-widest text-[var(--color-accent)]">0{index + 1}</span></a>)}
            <div className="mt-4 flex items-center justify-between gap-3"><span className="text-[0.6rem] uppercase tracking-widest text-[var(--color-muted)]">{copy.actions.theme}</span><ThemeToggle labelled /></div>
          </Container>
        </nav>
      </> : null}
    </header>
  )
}
