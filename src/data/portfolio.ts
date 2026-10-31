import { projects, type ProjectCategory, type ProjectContentStatus, type ProjectRecord } from './projects'

export type Locale = 'en' | 'ar'
export type { ProjectCategory }
export type ProjectState = 'published' | 'pending-media' | 'awaiting-client-correction'

export type PortfolioImage = {
  src: string
  srcSet?: string
  alt: Record<Locale, string>
  width?: number
  height?: number
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
  historicalBackground: Record<Locale, string> | null
  scope: Record<Locale, string[]>
  duration: string | null
  bua: string | null
  year: string | null
  cover: PortfolioImage | null
  gallery: PortfolioImage[]
  pendingMedia: boolean
  contentStatus: ProjectContentStatus
  hasApprovedArabic: boolean
  seo: { title: Record<Locale, string>; description: Record<Locale, string> }
  approvalNeeds: string[]
}

function recordToPortfolioProject(project: ProjectRecord): PortfolioProject {
  const titleAr = project.title.ar ?? project.title.en
  const publicDescription = project.publicOverview
  const correctionPending = project.contentStatus !== 'source-supplied'
  const pendingDescription = 'Project information is awaiting client correction before publication.'
  const descriptionEn = publicDescription ?? pendingDescription
  const gallery = project.images.map((image) => ({
    src: image.src,
    srcSet: image.srcSet,
    alt: { en: image.alt, ar: image.alt },
    width: image.width,
    height: image.height,
  }))
  const disputedSpecifications = project.contentStatus === 'awaiting-conflict-resolution'

  return {
    id: project.id,
    slug: project.slug,
    title: { en: project.title.en, ar: titleAr },
    sourceFolder: project.inboxFolder,
    state: project.pendingMedia ? 'pending-media' : correctionPending ? 'awaiting-client-correction' : 'published',
    category: project.category,
    location: { en: project.specifications.location, ar: project.specifications.location },
    client: project.specifications.client,
    description: publicDescription ? { en: publicDescription, ar: publicDescription } : null,
    historicalBackground: project.historicalBackground ? { en: project.historicalBackground, ar: project.historicalBackground } : null,
    scope: { en: [project.specifications.scope], ar: [project.specifications.scope] },
    duration: disputedSpecifications ? null : project.specifications.projectDuration,
    bua: disputedSpecifications ? null : project.specifications.bua ?? null,
    year: disputedSpecifications ? null : project.specifications.year ?? null,
    cover: gallery[0] ?? null,
    gallery,
    pendingMedia: project.pendingMedia,
    contentStatus: project.contentStatus,
    hasApprovedArabic: project.title.ar !== null,
    seo: {
      title: { en: `${project.title.en} | SUMMIT Construction`, ar: `${titleAr} | SUMMIT Construction` },
      description: { en: descriptionEn, ar: descriptionEn },
    },
    approvalNeeds: [
      ...(project.pendingMedia ? ['replacement project photography'] : []),
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
