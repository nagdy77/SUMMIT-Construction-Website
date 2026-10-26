import { Container } from '../components/ui/Container'
import { Footer } from '../components/layout/Footer'
import { Header } from '../components/layout/Header'
import { useCopy, useLocale } from '../content/site'
import { routePath } from '../lib/routes'

export function NotFoundPage() {
  const locale = useLocale()
  const copy = useCopy()

  return (
    <div className="site-shell page-shell flex min-h-screen flex-col bg-[var(--color-page)] text-[var(--color-ink)]">
      <a className="skip-link" href="#main-content">{copy.actions.skip}</a>
      <Header />
      <main id="main-content" className="w-full flex-1">
        <section className="editorial-content-page">
          <Container>
            <header className="editorial-page-heading">
              <p className="eyebrow">404</p>
              <h1>{locale === 'en' ? 'Page not found.' : 'الصفحة غير موجودة.'}</h1>
            </header>
            <a className="text-link" href={routePath(locale)}>{copy.nav.home}<span aria-hidden="true">↗</span></a>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  )
}
