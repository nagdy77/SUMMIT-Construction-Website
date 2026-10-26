import { Container } from '../ui/Container'
import { assetUrl } from '../../lib/assets'
import { useCopy, useLocale } from '../../content/site'
import { routePath } from '../../lib/routes'

export function Footer() {
  const locale = useLocale()
  const copy = useCopy()
  const footerNavigation = [
    { label: copy.nav.home, page: 'home' }, { label: copy.nav.about, page: 'about' }, { label: copy.nav.services, page: 'services' },
    { label: copy.nav.projects, page: 'projects' }, { label: copy.nav.clients, page: 'clients' }, { label: copy.nav.downloads, page: 'downloads' },
    { label: copy.nav.contact, page: 'contact' }, { label: copy.nav.privacy, page: 'privacy' },
  ]
  return (
    <footer className="site-footer border-t border-[var(--color-border)] text-[var(--color-ink)]">
      <Container className="grid gap-10 pb-20 pt-12 sm:grid-cols-2 sm:items-end lg:grid-cols-12 lg:pb-20 lg:pt-16">
        <div className="lg:col-span-3"><a href={routePath(locale)} className="inline-flex" aria-label="SUMMIT Construction home"><img src={assetUrl('/assets/brand/summit-logo-gold-intro.webp')} alt="SUMMIT Construction" width="269" height="240" loading="lazy" decoding="async" className="h-20 w-auto object-contain" /></a></div>
        <nav aria-label={copy.nav.home} className="grid grid-cols-2 gap-x-8 gap-y-2 sm:justify-self-end lg:col-span-6 lg:grid-cols-4 lg:justify-self-stretch">
          {footerNavigation.map((item) => <a key={item.page} className="flex min-h-11 items-center font-body text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent)]" href={routePath(locale, item.page)}>{item.label}</a>)}
        </nav>
        <p className="font-body text-[0.6875rem] leading-5 text-[var(--color-muted)] sm:col-span-2 lg:col-span-3 lg:text-right rtl:lg:text-left">© {new Date().getFullYear()} SUMMIT Construction.<br />{locale === 'en' ? 'All rights reserved.' : 'جميع الحقوق محفوظة.'}</p>
      </Container>
    </footer>
  )
}
