import { projects as featuredProjects, type FeaturedProject } from './projects'
import { publicWorkingProjects } from './draft-portfolio'

export type Locale = 'en' | 'ar'
export type ProjectCategory = FeaturedProject['category'] | 'Retail Fit-Out' | 'Commercial Fit-Out'
export type ProjectState = 'published' | 'verified-pending-approval' | 'provisional'

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
  category: ProjectCategory | null
  location: Record<Locale, string> | null
  client: string | null
  description: Record<Locale, string> | null
  scope: Record<Locale, string[]> | null
  cover: PortfolioImage | null
  gallery: PortfolioImage[]
  seo: { title: Record<Locale, string>; description: Record<Locale, string> }
  approvalNeeds: string[]
}

const publishedRecord = (project: FeaturedProject, location: Record<Locale, string> | null, titleAr: string, descriptionAr: string, scope: Record<Locale, string[]>): PortfolioProject => ({
  id: project.id,
  slug: project.id,
  title: { en: project.name, ar: titleAr },
  sourceFolder: project.id === 'mohamed-ali-palace' ? 'M.ALI PALACE' : project.id === 'ministries-district' ? 'MINISTRIES DISTRICT' : 'Lakeview',
  state: 'published',
  category: project.category,
  location,
  client: null,
  description: { en: project.description, ar: descriptionAr },
  scope,
  cover: project.images[0] ? { src: project.images[0].src, alt: { en: project.images[0].alt, ar: `${titleAr} — صورة للمشروع` } } : null,
  gallery: project.images.slice(0, 5).map((image) => ({ src: image.src, alt: { en: image.alt, ar: `${titleAr} — ${image.label}` } })),
  seo: {
    title: { en: `${project.name} | SUMMIT Construction`, ar: `${titleAr} | سوميت للإنشاءات` },
    description: { en: project.description, ar: descriptionAr },
  },
  approvalNeeds: [],
})

const palace = featuredProjects.find((project) => project.id === 'mohamed-ali-palace')!
const ministries = featuredProjects.find((project) => project.id === 'ministries-district')!
const lakeview = featuredProjects.find((project) => project.id === 'lakeview-residence')!

const verifiedPublishedProjects: PortfolioProject[] = [
  publishedRecord(palace, null, 'قصر محمد علي', 'ترميم وتجديد الأعمال الرخامية في قصر الفسقية.', {
    en: ['Marble restoration', 'Palace renovation'], ar: ['ترميم الرخام', 'تجديد القصر'],
  }),
  publishedRecord(ministries, { en: 'Ministries District, New Administrative Capital', ar: 'منطقة الوزارات، العاصمة الإدارية الجديدة' }, 'منطقة الوزارات', 'أعمال الرخام الميكانيكي لواجهة وزارة النقل في منطقة الوزارات بالعاصمة الإدارية الجديدة.', {
    en: ['Mechanical marble works', 'Ministry elevation'], ar: ['أعمال الرخام الميكانيكي', 'واجهة الوزارة'],
  }),
  publishedRecord(lakeview, { en: 'Fifth Settlement', ar: 'التجمع الخامس' }, 'ليك ڤيو ريزيدنس', 'تشطيبات متكاملة لمشروع ليك ڤيو ريزيدنس في التجمع الخامس.', {
    en: ['Turnkey finishing'], ar: ['تشطيبات متكاملة'],
  }),
]

export const portfolioProjects: PortfolioProject[] = [...verifiedPublishedProjects, ...publicWorkingProjects]
export const publishedProjects = portfolioProjects

export const portfolioCapacity = 16
export const registeredProjectFolderCount = 11
export const remainingProjectIdentities = portfolioCapacity - registeredProjectFolderCount
