import type { Locale } from '../data/portfolio'

export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '')
export const sitePath = (path: string) => `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`

export type RouteInfo = { locale: Locale; page: string; slug?: string }

const topLevelPages = new Set(['about', 'services', 'projects', 'clients', 'contact', 'privacy'])

export function resolveRoute(input: string): RouteInfo {
  let pathname = input.split(/[?#]/, 1)[0] || '/'
  if (BASE_PATH && pathname.startsWith(`${BASE_PATH}/`)) pathname = pathname.slice(BASE_PATH.length)
  if (pathname === BASE_PATH || pathname === '/') pathname = '/en/'
  const segments = pathname.split('/').filter(Boolean)
  const locale: Locale = segments[0] === 'ar' ? 'ar' : 'en'
  const tail = segments.slice(1)
  if (!tail.length) return { locale, page: 'home' }
  if (tail[0] === 'projects' && tail[1]) return { locale, page: 'project-detail', slug: tail[1] }
  if (tail[0] === 'services' && tail[1]) return { locale, page: 'service-detail', slug: tail[1] }
  return { locale, page: topLevelPages.has(tail[0]) ? tail[0] : 'not-found' }
}

export function routePath(locale: Locale, page = 'home', slug?: string) {
  const tail = page === 'home' ? '' : page === 'project-detail' ? `projects/${slug}/` : page === 'service-detail' ? `services/${slug}/` : `${page}/`
  return sitePath(`/${locale}/${tail}`)
}


