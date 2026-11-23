import { projects, type ProjectCategory, type ProjectContentStatus, type ProjectRecord } from './projects'

export type Locale = 'en' | 'ar'
export type { ProjectCategory }
export type ProjectState = 'published' | 'pending-media' | 'awaiting-client-correction'

export type PortfolioImage = {
  src: string
  srcSet?: string
  alt: Record<Locale, string>
  fit?: 'cover' | 'contain'
  position?: string
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
  categoryStatus: 'confirmed' | 'tentative'
  location: Record<Locale, string> | null
  client: string | null
  description: Record<Locale, string> | null
  summary: Record<Locale, string> | null
  detailsNote: Record<Locale, string> | null
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

const projectSeoOverrides: Partial<Record<string, {
  title: Partial<Record<Locale, string>>
  description: Partial<Record<Locale, string>>
}>> = {
  'mohamed-ali-palace': {
    title: {
      en: 'Mohamed Ali Palace Marble Restoration | SUMMIT Construction',
      ar: 'ترميم رخام قصر محمد علي | سوميت للإنشاءات',
    },
    description: {
      en: 'SUMMIT restored about 4,000 m² of Italian Carrara marble at Al-Fasqiya Palace in Shubra El-Kheima with partner The Stone Shop.',
      ar: 'رممت سوميت نحو 4000 م² من رخام كرارا الإيطالي في قصر الفسقية بشبرا الخيمة، بالتعاون مع The Stone Shop.',
    },
  },
  'beit-al-razzaz': {
    title: { en: 'Beit Al Razzaz Heritage Restoration | SUMMIT Construction' },
    description: { en: 'Explore SUMMIT’s structural repair, adaptive reuse and restoration work on the eastern side of Beit Al Razzaz in Al Darb Al Ahmar, Cairo.' },
  },
  'safi-al-din-gowhar': {
    title: { en: 'Safi Al Din Gowhar Dewatering | SUMMIT Construction' },
    description: { en: 'Explore SUMMIT’s specialist dewatering system for the historic Safi Al Din Gowhar dome on Al Saleeba Street in Cairo.' },
  },
  'st-andrews-church': {
    title: { en: 'St Andrews Church Structural Restoration | SUMMIT Construction' },
    description: { en: 'SUMMIT carried out structural restoration and reinforcement works for the floor of the main prayer hall at St Andrews Church in Cairo.' },
  },
  'new-capital-administrations-district': {
    title: { en: 'New Capital Ministry Marble Works | SUMMIT Construction' },
    description: { en: 'SUMMIT delivered mechanical marble installation for the Transportation Ministry at the New Administrative Capital with GAMA Construction.' },
  },
  'stream-3': {
    title: { en: 'Stream 3 Finishing Works | SUMMIT Construction' },
    description: { en: 'SUMMIT completed full finishing works for one building at Stream Live 3 in Cairo Festival City for GAMA Construction.' },
  },
  'oriana-cairo-festival-city': {
    title: { en: 'Oriana Cairo Festival City Villa Finishing | SUMMIT Construction' },
    description: { en: 'SUMMIT delivered external finishing works for 12 villas at Oriana Villas 3 in Cairo Festival City for GAMA Construction.' },
  },
  alto: {
    title: { en: 'Alto External Finishing | SUMMIT Construction' },
    description: { en: 'SUMMIT delivered external painting and marble finishing for two Alto buildings in Uptown Cairo for Arabian Construction Co. (ACC).' },
  },
  marvel: {
    title: { en: 'Marvel Residential Fit-Out | SUMMIT Construction' },
    description: { en: 'Explore SUMMIT’s turnkey residential finishing work for an apartment at Marvel Compound in the Fifth Settlement.' },
  },
  bcbg: {
    title: { en: 'BCBG Retail Fit-Out | SUMMIT Construction' },
    description: { en: 'SUMMIT delivered full finishing and MEP works for the BCBG retail project at Mall of Arabia in collaboration with Fashion International Group.' },
  },
  desigual: {
    title: { en: 'Desigual Retail Fit-Out | SUMMIT Construction' },
    description: { en: 'SUMMIT delivered a fully furnished turnkey Desigual retail fit-out, including imported furniture and cladding, within a seven-week programme.' },
  },
  voda: {
    title: { en: 'Voda Retail Fit-Out | SUMMIT Construction' },
    description: { en: 'SUMMIT completed full finishing and MEP works for the Voda retail project in Alexandria in 2019, covering a 30 m² area in four weeks.' },
  },
}

function recordToPortfolioProject(project: ProjectRecord): PortfolioProject {
  const titleAr = project.title.ar ?? project.title.en
  const publicDescription = project.publicOverview
  const localizedDescription = typeof publicDescription === 'string'
    ? { en: publicDescription, ar: publicDescription }
    : publicDescription
  const localizedSummary = project.shortOverview ?? localizedDescription
  const correctionPending = project.contentStatus !== 'source-supplied'
  const pendingDescription = 'Project information is awaiting client correction before publication.'
  const descriptionEn = localizedSummary?.en ?? project.detailsNote?.en ?? pendingDescription
  const gallery = project.images.map((image) => ({
    src: image.src,
    srcSet: image.srcSet,
    alt: { en: image.alt, ar: image.altAr ?? image.alt },
    fit: image.fit,
    position: image.position,
    width: image.width,
    height: image.height,
  }))
  const disputedSpecifications = project.contentStatus === 'awaiting-conflict-resolution'
  const seoOverride = projectSeoOverrides[project.slug]

  return {
    id: project.id,
    slug: project.slug,
    title: { en: project.title.en, ar: titleAr },
    sourceFolder: project.inboxFolder,
    state: project.pendingMedia ? 'pending-media' : correctionPending ? 'awaiting-client-correction' : 'published',
    category: project.category,
    categoryStatus: project.categoryStatus ?? 'confirmed',
    location: project.specifications.location ? { en: project.specifications.location, ar: project.specifications.location } : null,
    client: project.specifications.client,
    description: localizedDescription ?? null,
    summary: localizedSummary ?? null,
    detailsNote: project.detailsNote ?? null,
    historicalBackground: project.historicalBackground ? { en: project.historicalBackground, ar: project.historicalBackground } : null,
    scope: project.specifications.scope ? { en: [project.specifications.scope], ar: [project.specifications.scope] } : { en: [], ar: [] },
    duration: disputedSpecifications ? null : project.specifications.projectDuration,
    bua: disputedSpecifications ? null : project.specifications.bua ?? null,
    year: disputedSpecifications ? null : project.specifications.year ?? null,
    cover: gallery[0] ?? null,
    gallery,
    pendingMedia: project.pendingMedia,
    contentStatus: project.contentStatus,
    // Only records with supplied bilingual narrative copy are approved for
    // Arabic project-description metadata.
    hasApprovedArabic: (publicDescription !== null && typeof publicDescription === 'object') || Boolean(project.shortOverview),
    seo: {
      title: {
        en: seoOverride?.title.en ?? `${project.title.en} | SUMMIT Construction`,
        ar: seoOverride?.title.ar ?? `${titleAr} | سوميت للإنشاءات`,
      },
      description: {
        en: seoOverride?.description.en ?? descriptionEn,
        ar: seoOverride?.description.ar ?? localizedSummary?.ar ?? project.detailsNote?.ar ?? descriptionEn,
      },
    },
    approvalNeeds: [
      ...(project.pendingMedia ? ['replacement project photography'] : []),
      'approved Arabic content translation',
      ...project.reviewNotes,
    ],
  }
}

export const portfolioProjects: PortfolioProject[] = projects.map(recordToPortfolioProject)
export const publishedProjects = portfolioProjects

export const portfolioCapacity = 19
export const registeredProjectFolderCount = projects.length
export const remainingProjectIdentities = portfolioCapacity - registeredProjectFolderCount
