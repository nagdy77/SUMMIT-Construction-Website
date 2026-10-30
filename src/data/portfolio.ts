import { projects, type ProjectCategory, type ProjectRecord } from './projects'

export type Locale = 'en' | 'ar'
export type { ProjectCategory }
export type ProjectState = 'published' | 'pending-media' | 'awaiting-client-correction'

export type PortfolioImage = {
  src: string
  srcSet?: string
  alt: Record<Locale, string>
}

export type PortfolioProject = {
  id: string
  slug: string
  title: Record<Locale, string>
  sourceFolder: string
  state: ProjectState
  category: ProjectCategory
  location: Record<Locale, string>
  client: string | null
  description: Record<Locale, string> | null
  scope: Record<Locale, string[]>
  duration: string
  bua: string | null
  year: string | null
  cover: PortfolioImage | null
  gallery: PortfolioImage[]
  pendingMedia: boolean
  seo: { title: Record<Locale, string>; description: Record<Locale, string> }
  approvalNeeds: string[]
}

function recordToPortfolioProject(project: ProjectRecord): PortfolioProject {
  const titleAr = project.title.ar ?? project.title.en
  const publicDescription = project.publicOverview
  const correctionPending = project.contentStatus !== 'source-supplied'
  const pendingDescription = 'Project information is awaiting client correction. Replacement project photography is also pending.'
  const descriptionEn = publicDescription ?? pendingDescription

  return {
    id: project.id,
    slug: project.slug,
    title: { en: project.title.en, ar: titleAr },
    sourceFolder: project.inboxFolder,
    state: correctionPending ? 'awaiting-client-correction' : 'pending-media',
    category: project.category,
    location: { en: project.specifications.location, ar: project.specifications.location },
    client: project.specifications.client,
    description: publicDescription ? { en: publicDescription, ar: publicDescription } : null,
    scope: { en: [project.specifications.scope], ar: [project.specifications.scope] },
    duration: project.specifications.projectDuration,
    bua: project.specifications.bua ?? null,
    year: project.specifications.year ?? null,
    cover: null,
    gallery: [],
    pendingMedia: true,
    seo: {
      title: { en: `${project.title.en} | SUMMIT Construction`, ar: `${titleAr} | SUMMIT Construction` },
      description: { en: descriptionEn, ar: descriptionEn },
    },
    approvalNeeds: [
      'replacement project photography',
      'approved Arabic title and translation',
      ...project.reviewNotes,
    ],
  }
}

export const portfolioProjects: PortfolioProject[] = projects.map(recordToPortfolioProject)
export const publishedProjects = portfolioProjects

export const portfolioCapacity = 16
export const registeredProjectFolderCount = projects.length
export const remainingProjectIdentities = portfolioCapacity - registeredProjectFolderCount
