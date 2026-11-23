import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useState, type ComponentType } from 'react'
import { LocaleProvider } from './content/site'
import { trackPageView } from './lib/analytics'
import { assetUrl } from './lib/assets'
import { shouldPlayEntrance } from './lib/entrance'
import { resolveRoute, type RouteInfo } from './lib/routes'
import { useMagneticControls } from './hooks/useMagneticControls'

type ClientPage = ComponentType<{ slug?: string; entranceReady?: boolean }>
const EntranceIntro = lazy(() => import('./components/layout/EntranceIntro').then((module) => ({ default: module.EntranceIntro })))

function EntranceFallback({ onSkip }: { onSkip: () => void }) {
  return <div className="entrance-intro fixed inset-0 z-[100] grid min-h-[100svh] place-items-center overflow-hidden bg-summit-charcoal" aria-label="SUMMIT Construction introduction">
    <img src={assetUrl('/assets/brand/summit-logo-gold-320.webp')} srcSet={`${assetUrl('/assets/brand/summit-logo-gold-320.webp')} 320w, ${assetUrl('/assets/brand/summit-logo-gold-480.webp')} 480w`} sizes="min(62vw, 18rem)" alt="SUMMIT Construction" width="480" height="429" className="h-auto w-[min(62vw,18rem)] object-contain" />
    <button data-skip-intro type="button" onClick={onSkip} className="absolute bottom-6 right-5 min-h-11 border-b border-white/35 px-2 py-2 font-body text-[0.625rem] font-bold uppercase tracking-[0.16em] text-summit-ivory">Skip intro</button>
  </div>
}

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

  useLayoutEffect(() => {
    if (!introActive) return
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [introActive])

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
      {introActive ? <Suspense fallback={<EntranceFallback onSkip={() => { revealPage(); completeIntro() }} />}><EntranceIntro key={introRun} onRevealHero={revealPage} onComplete={completeIntro} /></Suspense> : null}
      <LocaleProvider locale={route.locale} path={path}>
        <Page slug={route.slug} entranceReady={entranceReady} />
      </LocaleProvider>
    </>
  )
}
