import { portfolioProjects } from '../data/portfolio'

export const staticRoutePaths = [
  ...(['en', 'ar'] as const).flatMap((locale) => [
    `/${locale}/`, `/${locale}/about/`, `/${locale}/services/`, `/${locale}/projects/`, `/${locale}/clients/`,
    `/${locale}/contact/`, `/${locale}/privacy/`,
    ...['construction', 'restoration', 'renovation', 'fit-out'].map((slug) => `/${locale}/services/${slug}/`),
    ...portfolioProjects.map(({ slug }) => `/${locale}/projects/${slug}/`),
  ]),
]

const indexableBasePages = ['', 'about/', 'services/', 'projects/', 'clients/', 'contact/']
const indexableServiceSlugs = ['construction', 'restoration', 'renovation', 'fit-out']
const indexableProjects = portfolioProjects.filter((project) => project.state === 'published')

export const indexableRoutePaths = [
  ...(['en', 'ar'] as const).flatMap((locale) => [
    ...indexableBasePages.map((page) => `/${locale}/${page}`),
    ...indexableServiceSlugs.map((slug) => `/${locale}/services/${slug}/`),
    ...indexableProjects
      .filter((project) => locale === 'en' || project.hasApprovedArabic)
      .map(({ slug }) => `/${locale}/projects/${slug}/`),
  ]),
]
