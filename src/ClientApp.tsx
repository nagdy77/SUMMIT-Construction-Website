import { useEffect, type ComponentType } from 'react'
import { LocaleProvider } from './content/site'
import { trackPageView } from './lib/analytics'
import { resolveRoute, type RouteInfo } from './lib/routes'
import { useMagneticControls } from './hooks/useMagneticControls'

type ClientPage = ComponentType<{ slug?: string }>

export async function loadClientPage(route: RouteInfo): Promise<ClientPage> {
  if (route.page === 'home') return (await import('./pages/Home')).default

  if (route.page === 'projects' || route.page === 'project-detail') {
    const pages = await import('./pages/PortfolioPages')
    return route.page === 'projects' ? pages.ProjectsPage : pages.ProjectDetailPage
  }

  const pages = await import('./pages/InnerPages')
  if (route.page === 'about') return pages.AboutPage
  if (route.page === 'services') return pages.ServicesPage
  if (route.page === 'service-detail') return pages.ServiceDetailPage
  if (route.page === 'clients') return pages.ClientsPage
  if (route.page === 'contact') return pages.ContactPage
  if (route.page === 'privacy') return pages.PrivacyPage

  return (await import('./pages/NotFoundPage')).NotFoundPage
}

export function ClientApp({ path, Page }: { path: string; Page: ClientPage }) {
  const route = resolveRoute(path)
  useMagneticControls()

  useEffect(() => {
    document.documentElement.lang = route.locale
    document.documentElement.dir = route.locale === 'ar' ? 'rtl' : 'ltr'
    trackPageView(path)
  }, [path, route.locale])

  return (
    <LocaleProvider locale={route.locale} path={path}>
      <Page slug={route.slug} />
    </LocaleProvider>
  )
}
