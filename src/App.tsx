import { useEffect } from 'react'
import Home from './pages/Home'
import { ProjectDetailPage, ProjectsPage } from './pages/PortfolioPages'
import { AboutPage, ClientsPage, ContactPage, DownloadsPage, PrivacyPage, ServiceDetailPage, ServicesPage } from './pages/InnerPages'
import { NotFoundPage } from './pages/NotFoundPage'
import { LocaleProvider } from './content/site'
import { resolveRoute } from './lib/routes'
import { trackPageView } from './lib/analytics'

export function App({ path }: { path: string }) {
  const route = resolveRoute(path)
  useEffect(() => {
    document.documentElement.lang = route.locale
    document.documentElement.dir = route.locale === 'ar' ? 'rtl' : 'ltr'
    trackPageView(path)
  }, [path, route.locale])

  let page
  if (route.page === 'home') page = <Home />
  else if (route.page === 'about') page = <AboutPage />
  else if (route.page === 'services') page = <ServicesPage />
  else if (route.page === 'projects') page = <ProjectsPage />
  else if (route.page === 'project-detail') page = <ProjectDetailPage slug={route.slug} />
  else if (route.page === 'service-detail') page = <ServiceDetailPage slug={route.slug} />
  else if (route.page === 'clients') page = <ClientsPage />
  else if (route.page === 'downloads') page = <DownloadsPage />
  else if (route.page === 'contact') page = <ContactPage />
  else if (route.page === 'privacy') page = <PrivacyPage />
  else page = <NotFoundPage />

  return <LocaleProvider locale={route.locale} path={path}>{page}</LocaleProvider>
}

