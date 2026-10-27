import { useCallback, useEffect, useState, type ComponentType } from 'react'
import { EntranceIntro, shouldPlayEntrance } from './components/layout/EntranceIntro'
import { LocaleProvider } from './content/site'
import { trackPageView } from './lib/analytics'
import { resolveRoute, type RouteInfo } from './lib/routes'
import { useMagneticControls } from './hooks/useMagneticControls'

type ClientPage = ComponentType<{ slug?: string; entranceReady?: boolean }>

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
  const [introActive, setIntroActive] = useState(false)
  const [introRun, setIntroRun] = useState(0)
  const [entranceReady, setEntranceReady] = useState(false)
  useMagneticControls()

  const startEntrance = useCallback(() => {
    if (!shouldPlayEntrance()) {
      setIntroActive(false)
      setEntranceReady(true)
      return
    }

    setEntranceReady(false)
    setIntroRun((run) => run + 1)
    setIntroActive(true)
  }, [])

  const revealPage = useCallback(() => setEntranceReady(true), [])
  const completeIntro = useCallback(() => setIntroActive(false), [])

  useEffect(() => {
    document.documentElement.lang = route.locale
    document.documentElement.dir = route.locale === 'ar' ? 'rtl' : 'ltr'
    trackPageView(path)
  }, [path, route.locale])

  useEffect(() => {
    startEntrance()
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) startEntrance()
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [path, startEntrance])

  return (
    <>
      {introActive ? <EntranceIntro key={introRun} onRevealHero={revealPage} onComplete={completeIntro} /> : null}
      <LocaleProvider locale={route.locale} path={path}>
        <Page slug={route.slug} entranceReady={entranceReady} />
      </LocaleProvider>
    </>
  )
}
