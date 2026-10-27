import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Container } from '../ui/Container'
import { ThemeToggle } from './ThemeProvider'
import { assetUrl } from '../../lib/assets'
import { useCopy, useCurrentPath, useLocale } from '../../content/site'
import { resolveRoute, routePath } from '../../lib/routes'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLElement>(null)
  const menuBackdropRef = useRef<HTMLButtonElement>(null)
  const menuTimelineRef = useRef<gsap.core.Timeline | null>(null)
  const menuInitializedRef = useRef(false)
  const locale = useLocale()
  const currentPath = useCurrentPath()
  const copy = useCopy()
  const navigation = [
    { label: copy.nav.home, page: 'home', href: routePath(locale) },
    { label: copy.nav.about, page: 'about', href: routePath(locale, 'about') },
    { label: copy.nav.services, page: 'services', href: routePath(locale, 'services') },
    { label: copy.nav.projects, page: 'projects', href: routePath(locale, 'projects') },
    { label: copy.nav.clients, page: 'clients', href: routePath(locale, 'clients') },
    { label: copy.nav.contact, page: 'contact', href: routePath(locale, 'contact') },
    { label: copy.nav.privacy, page: 'privacy', href: routePath(locale, 'privacy') },
  ]
  const currentRoute = resolveRoute(currentPath)
  const alternateLocale = locale === 'en' ? 'ar' : 'en'
  const languageHref = currentRoute.page === 'not-found' ? routePath(alternateLocale) : routePath(alternateLocale, currentRoute.page, currentRoute.slug)

  useEffect(() => {
    let frame = 0
    const update = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => setScrolled(window.scrollY > 12))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
    }
  }, [])

  useLayoutEffect(() => {
    const panel = menuPanelRef.current
    const backdrop = menuBackdropRef.current
    const button = menuButtonRef.current
    if (!panel || !backdrop || !button) return
    const lines = Array.from(button.querySelectorAll<HTMLElement>('.menu-toggle-line'))
    const links = Array.from(panel.querySelectorAll<HTMLElement>('.mobile-navigation-link'))
    const accent = panel.querySelector<HTMLElement>('.mobile-navigation-accent')
    const animated = [panel, backdrop, ...lines, ...links, ...(accent ? [accent] : [])]
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    menuTimelineRef.current?.kill()
    gsap.killTweensOf(animated)

    if (!menuInitializedRef.current) {
      gsap.set([panel, backdrop], { autoAlpha: 0, visibility: 'hidden' })
      gsap.set(panel, { y: -10, clipPath: 'inset(0 0 100% 0)' })
      gsap.set(links, { autoAlpha: 0, y: 18 })
      if (accent) gsap.set(accent, { scaleX: 0, transformOrigin: locale === 'ar' ? 'right center' : 'left center' })
      menuInitializedRef.current = true
      if (!menuOpen) return
    }

    if (reducedMotion) {
      gsap.set(lines[0], { y: menuOpen ? 6 : 0, rotation: menuOpen ? 45 : 0 })
      gsap.set(lines[1], { autoAlpha: menuOpen ? 0 : 1, scaleX: menuOpen ? 0 : 1 })
      gsap.set(lines[2], { y: menuOpen ? -6 : 0, rotation: menuOpen ? -45 : 0 })
      gsap.set(panel, { autoAlpha: menuOpen ? 1 : 0, y: 0, clipPath: 'inset(0)', visibility: menuOpen ? 'visible' : 'hidden' })
      gsap.set(backdrop, { autoAlpha: menuOpen ? 1 : 0, visibility: menuOpen ? 'visible' : 'hidden' })
      gsap.set(links, { autoAlpha: menuOpen ? 1 : 0, y: 0 })
      if (accent) gsap.set(accent, { scaleX: menuOpen ? 1 : 0 })
      return
    }

    const timeline = gsap.timeline({ defaults: { overwrite: 'auto' } })
    menuTimelineRef.current = timeline
    if (menuOpen) {
      gsap.set([panel, backdrop], { visibility: 'visible' })
      timeline
        .to(lines[0], { y: 6, rotation: 45, duration: .36, ease: 'power3.inOut' }, 0)
        .to(lines[1], { autoAlpha: 0, scaleX: 0, duration: .22, ease: 'power2.in' }, 0)
        .to(lines[2], { y: -6, rotation: -45, duration: .36, ease: 'power3.inOut' }, 0)
        .fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: .28, ease: 'power2.out' }, 0)
        .fromTo(panel, { autoAlpha: 0, y: -10, clipPath: 'inset(0 0 100% 0)' }, { autoAlpha: 1, y: 0, clipPath: 'inset(0)', duration: .48, ease: 'power3.inOut' }, .02)
        .fromTo(links, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: .4, stagger: .045, ease: 'power3.out' }, .2)
      if (accent) timeline.to(accent, { scaleX: 1, duration: .5, ease: 'power3.out' }, .26)
    } else {
      timeline.to(links, { autoAlpha: 0, y: -9, duration: .16, stagger: { each: .018, from: 'end' }, ease: 'power2.in' }, 0)
      if (accent) timeline.to(accent, { scaleX: 0, duration: .2, ease: 'power2.in' }, 0)
      timeline
        .to(panel, { autoAlpha: 0, y: -8, clipPath: 'inset(0 0 100% 0)', duration: .34, ease: 'power3.inOut' }, .08)
        .to(backdrop, { autoAlpha: 0, duration: .24, ease: 'power2.in' }, .08)
        .to(lines[0], { y: 0, rotation: 0, duration: .32, ease: 'power3.inOut' }, .08)
        .to(lines[1], { autoAlpha: 1, scaleX: 1, duration: .24, ease: 'power2.out' }, .16)
        .to(lines[2], { y: 0, rotation: 0, duration: .32, ease: 'power3.inOut' }, .08)
        .set([panel, backdrop], { visibility: 'hidden' })
    }

    return () => { timeline.kill() }
  }, [locale, menuOpen])

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

      const focusable = Array.from(headerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]):not([tabindex="-1"])') ?? [])
        .filter((element) => element.getClientRects().length > 0 && !element.closest('[inert]'))
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
    <header ref={headerRef} data-scrolled={scrolled ? 'true' : 'false'} data-menu-open={menuOpen ? 'true' : 'false'} className="site-header sticky top-0 z-50 border-b border-[var(--color-border)]">
      <Container className="relative z-10 flex h-[5.25rem] items-center justify-between gap-4">
        <a href={routePath(locale)} aria-label="SUMMIT Construction" className="flex shrink-0 items-center gap-4" onClick={() => setMenuOpen(false)}>
          <img src={assetUrl('/assets/brand/summit-logo-gold-intro.webp')} alt="SUMMIT Construction" width="269" height="240" decoding="async" className="h-[3.35rem] w-[3.75rem] object-contain" />
          <span className="hidden border-l border-[var(--color-border)] pl-4 text-[0.54rem] font-semibold uppercase leading-5 tracking-[0.22em] text-[var(--color-muted)] sm:block">Construction<br />Restoration & renovation</span>
        </a>
        <div className="flex items-center gap-2 lg:gap-4">
          <nav aria-label={locale === 'en' ? 'Main navigation' : 'التنقل الرئيسي'} className="hidden items-center gap-2 lg:flex xl:gap-3 2xl:gap-5">
            {navigation.map((item) => <a key={item.href} href={item.href} aria-current={currentRoute.page === item.page || (currentRoute.page === 'project-detail' && item.page === 'projects') || (currentRoute.page === 'service-detail' && item.page === 'services') ? 'page' : undefined} className="nav-link">{item.label}</a>)}
          </nav>
          <a data-magnetic className="language-switch" lang={locale === 'en' ? 'ar' : 'en'} href={languageHref}>{copy.home.language}</a>
          <ThemeToggle />
          <button ref={menuButtonRef} data-magnetic type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? copy.actions.close : copy.actions.menu} className="menu-toggle theme-toggle lg:hidden" onClick={() => setMenuOpen((value) => !value)}>
            <span className="menu-toggle-lines" aria-hidden="true"><i className="menu-toggle-line" /><i className="menu-toggle-line" /><i className="menu-toggle-line" /></span>
          </button>
        </div>
      </Container>
      <button ref={menuBackdropRef} type="button" tabIndex={-1} aria-label={copy.actions.close} aria-hidden={!menuOpen} inert={!menuOpen} className="mobile-menu-backdrop fixed inset-0 top-[5.25rem] bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)} />
      <nav ref={menuPanelRef} id="mobile-navigation" aria-label={locale === 'en' ? 'Mobile navigation' : 'قائمة التنقل'} aria-hidden={!menuOpen} inert={!menuOpen} className="mobile-navigation absolute inset-x-0 top-full border-b border-[var(--color-border)] lg:hidden">
        <span className="mobile-navigation-accent" aria-hidden="true" />
        <Container className="relative z-10 max-h-[calc(100svh-5.25rem)] overflow-auto pb-7 pt-3">
          {navigation.map((item, index) => <a key={item.href} href={item.href} aria-current={currentRoute.page === item.page || (currentRoute.page === 'project-detail' && item.page === 'projects') || (currentRoute.page === 'service-detail' && item.page === 'services') ? 'page' : undefined} className="mobile-navigation-link flex min-h-14 items-center justify-between border-b border-[var(--color-border)] py-2 text-xl tracking-tight" onClick={() => setMenuOpen(false)}><span>{item.label}</span><span className="text-[0.6rem] tracking-widest text-[var(--color-accent)]">0{index + 1}</span></a>)}
          <div className="mobile-navigation-link mt-4 flex items-center justify-between gap-3"><span className="text-[0.6rem] uppercase tracking-widest text-[var(--color-muted)]">{copy.actions.theme}</span><ThemeToggle labelled /></div>
        </Container>
      </nav>
    </header>
  )
}
