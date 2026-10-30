import { useEffect, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Container } from '../components/ui/Container'
import { Header } from '../components/layout/Header'
import { Footer } from '../components/layout/Footer'
import { useCopy, useLocale } from '../content/site'
import { publishedProjects, type ProjectCategory, type PortfolioProject } from '../data/portfolio'
import { routePath, sitePath } from '../lib/routes'
import { NotFoundPage as SharedNotFoundPage } from './NotFoundPage'

const categoryLabels: Record<'en' | 'ar', Record<ProjectCategory, string>> = {
  en: { 'Heritage Restoration': 'Heritage Restoration', Construction: 'Construction', 'Residential Fit-Out': 'Residential Fit-Out', 'Retail Fit-Out': 'Retail Fit-Out' },
  ar: { 'Heritage Restoration': 'ترميم التراث', Construction: 'الإنشاءات', 'Residential Fit-Out': 'التشطيبات السكنية', 'Retail Fit-Out': 'تشطيبات تجارية' },
}
gsap.registerPlugin(ScrollTrigger)

type ProjectFilter = 'all' | ProjectCategory

const projectFilters: ProjectFilter[] = ['all', 'Heritage Restoration', 'Construction', 'Residential Fit-Out', 'Retail Fit-Out']

function projectFilterBucket(project: PortfolioProject): Exclude<ProjectFilter, 'all'> | null {
  return project.category
}

function filterLabel(filter: ProjectFilter, locale: 'en' | 'ar', allLabel: string) {
  if (filter === 'all') return allLabel
  return categoryLabels[locale][filter]
}

function projectStatusLabel(project: PortfolioProject, locale: 'en' | 'ar') {
  return categoryLabels[locale][project.category]
}

function projectWorkingDescription(project: PortfolioProject, locale: 'en' | 'ar') {
  if (project.description) return project.description[locale]
  if (project.state === 'awaiting-client-correction') {
    return locale === 'en'
      ? 'The supplied project overview is awaiting client correction before publication.'
      : 'وصف المشروع المقدم بانتظار تصحيح العميل قبل النشر.'
  }
  return locale === 'en'
    ? 'Replacement project photography is pending.'
    : 'صور المشروع البديلة قيد الاستكمال.'
}

function pendingMediaLabel(_project: PortfolioProject, locale: 'en' | 'ar') {
  return locale === 'en' ? 'Project photography pending' : 'صور المشروع قيد الاستكمال'
}

function PageFrame({ children }: { children: ReactNode }) {
  return <div className="site-shell page-shell flex min-h-screen flex-col bg-[var(--color-page)] text-[var(--color-ink)]"><a className="skip-link" href="#main-content">{useCopy().actions.skip}</a><Header /><main id="main-content" className="w-full flex-1">{children}</main><Footer /></div>
}

function EditorialHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return <header className="editorial-page-heading brand-pattern-field brand-pattern-field--intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{intro ? <p className="editorial-intro">{intro}</p> : null}</header>
}

function ProjectCard({ project, index }: { project: PortfolioProject; index: number }) {
  const locale = useLocale()
  const copy = useCopy()
  const description = projectWorkingDescription(project, locale)
  return <article className="portfolio-card" style={{ ['--card-index' as string]: index }}>
    <a className="portfolio-card-link" href={routePath(locale, 'project-detail', project.slug)} aria-label={`${copy.actions.explore}: ${project.title[locale]}`}>
      {project.cover ? <div className="portfolio-card-image"><img src={sitePath(project.cover.src)} srcSet={project.cover.srcSet?.split(', ').map((item) => `${sitePath(item.split(' ')[0])} ${item.split(' ')[1]}`).join(', ')} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" alt={project.cover.alt[locale]} width="1200" height="800" loading="lazy" decoding="async" /><span className="portfolio-card-index">{String(index + 1).padStart(2, '0')}</span></div> : <div className="portfolio-card-image portfolio-card-placeholder"><div className="portfolio-card-placeholder-copy"><strong>{project.title[locale]}</strong><span>{pendingMediaLabel(project, locale)}</span></div><span className="portfolio-card-index">{String(index + 1).padStart(2, '0')}</span></div>}
      <div className="portfolio-card-meta"><span>{projectStatusLabel(project, locale)}</span><span aria-hidden="true">↗</span></div>
      <h2>{project.title[locale]}</h2>
      <p>{description}</p>
    </a>
  </article>
}

export function ProjectsPage() {
  const locale = useLocale()
  const copy = useCopy()
  const [filter, setFilter] = useState<ProjectFilter>('all')
  const pageRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const filtered = filter === 'all' ? publishedProjects : publishedProjects.filter((project) => projectFilterBucket(project) === filter)
  const categoryCount = (category: ProjectFilter) => category === 'all' ? publishedProjects.length : publishedProjects.filter((project) => projectFilterBucket(project) === category).length
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const cards = grid.querySelectorAll<HTMLElement>('.portfolio-card')
      gsap.fromTo(cards, { autoAlpha: 0, y: 22, scale: .988 }, { autoAlpha: 1, y: 0, scale: 1, duration: .72, stagger: .065, ease: 'power3.out', clearProps: 'opacity,visibility,transform' })
    })
    return () => media.revert()
  }, [filter])
  return <PageFrame><section ref={pageRef} className="portfolio-page"><Container>
    <EditorialHeader eyebrow={copy.pages.projects.eyebrow} title={copy.pages.projects.title} intro={copy.pages.projects.intro} />
    <div className="portfolio-toolbar"><p>{String(filtered.length).padStart(2, '0')} <span>{copy.labels.projects}</span></p><div role="group" aria-label={copy.actions.filter} className="portfolio-filters">{projectFilters.map((category) => <button data-magnetic key={category} type="button" aria-pressed={filter === category} onClick={() => setFilter(category)}><span>{filterLabel(category, locale, copy.actions.all)}</span><b aria-hidden="true">{String(categoryCount(category)).padStart(2, '0')}</b></button>)}</div></div>
    <div ref={gridRef} className="portfolio-grid" aria-live="polite">{filtered.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}</div>
    <aside className="portfolio-contact"><p className="eyebrow">{copy.labels.contact}</p><h2>{locale === 'en' ? 'Every project begins with a conversation.' : 'تبدأ كل حكاية مشروع بحوار.'}</h2><a data-magnetic className="text-link" href={routePath(locale, 'contact')}>{copy.actions.enquire}<span aria-hidden="true">↗</span></a></aside>
  </Container></section></PageFrame>
}

function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return <nav aria-label="Breadcrumb" className="breadcrumbs"><ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>{index ? <span aria-hidden="true">/</span> : null}{item.href ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>
}

export function ProjectDetailPage({ slug }: { slug?: string }) {
  const locale = useLocale()
  const copy = useCopy()
  const project = publishedProjects.find((item) => item.slug === slug)
  if (!project) return <SharedNotFoundPage />
  const sameCategory = publishedProjects.filter((item) => item.id !== project.id && item.category === project.category)
  const related = [...sameCategory, ...publishedProjects.filter((item) => item.id !== project.id && item.category !== project.category)].slice(0, 2)
  const description = projectWorkingDescription(project, locale)
  return <PageFrame><article className="detail-page"><Container>
    <Breadcrumbs items={[{ label: copy.nav.home, href: routePath(locale) }, { label: copy.nav.projects, href: routePath(locale, 'projects') }, { label: project.title[locale] }]} />
    <header className="detail-heading brand-pattern-field brand-pattern-field--intro"><p className="eyebrow">{projectStatusLabel(project, locale)}</p><h1>{project.title[locale]}</h1>{project.location ? <p className="detail-location">{project.location[locale]}</p> : null}<p>{description}</p></header>
    <ProjectGallery project={project} locale={locale} />
    {project.scope?.[locale]?.length ? <section className="detail-scope brand-pattern-field brand-pattern-field--metadata"><p className="eyebrow">{copy.labels.scope}</p><ul>{project.scope[locale].map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
    <div className="detail-cta"><a data-magnetic className="text-link" href={routePath(locale, 'contact')}>{copy.actions.enquire}<span aria-hidden="true">↗</span></a></div>
    <section className="related-projects"><p className="eyebrow">{copy.labels.related}</p><div className="portfolio-grid">{related.map((item, index) => <ProjectCard project={item} index={index} key={item.id} />)}</div></section>
  </Container></article></PageFrame>
}

function ProjectGallery({ project, locale }: { project: PortfolioProject; locale: 'en' | 'ar' }) {
  const copy = useCopy()
  const dialog = useRef<HTMLDialogElement>(null)
  const galleryRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState<number | null>(null)
  const images = project.gallery.slice(0, 5)
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (active !== null && !node.open) node.showModal()
    if (active === null && node.open) node.close()
  }, [active])
  useEffect(() => {
    const root = galleryRef.current
    if (!root) return
    const motion = gsap.matchMedia()
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      const tiles = root.querySelectorAll('button')
      gsap.from(tiles, { autoAlpha: 0, y: 24, scale: .985, duration: .8, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: root, start: 'top 88%', once: true }, clearProps: 'opacity,visibility,transform' })
    })
    return () => motion.revert()
  }, [project.id])
  useEffect(() => {
    const image = dialog.current?.querySelector('figure img')
    if (active === null || !image) return
    const motion = gsap.matchMedia()
    motion.add('(prefers-reduced-motion: no-preference)', () => gsap.fromTo(image, { opacity: 0, scale: 1.018, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: .62, ease: 'power3.out', clearProps: 'opacity,transform' }))
    return () => motion.revert()
  }, [active])
  const close = () => setActive(null)
  const step = (direction: number) => setActive((current) => current === null ? null : (current + direction + images.length) % images.length)
  const responsiveSrcSet = (image: PortfolioProject['gallery'][number]) => image.srcSet?.split(', ').map((item) => `${sitePath(item.split(' ')[0])} ${item.split(' ')[1]}`).join(', ')
  if (!project.cover) return <section className="detail-media-placeholder" aria-label={pendingMediaLabel(project, locale)}><div><strong>{project.title[locale]}</strong><span>{pendingMediaLabel(project, locale)}</span></div></section>
  return <>
    <button type="button" className="detail-cover gallery-trigger" onClick={() => setActive(0)} aria-label={`${copy.actions.explore}: ${project.title[locale]}`}>
      <img src={sitePath(project.cover.src)} srcSet={responsiveSrcSet(project.cover)} sizes="100vw" alt={project.cover.alt[locale]} width="1536" height="1024" fetchPriority="high" decoding="async" />
      {images.length > 1 ? <span className="gallery-count">{locale === 'en' ? 'View gallery' : 'عرض المعرض'} <b>{String(images.length).padStart(2, '0')}</b></span> : null}
    </button>
    {images.length > 1 ? <section ref={galleryRef} aria-label={copy.labels.projects} className="detail-gallery">{images.slice(1).map((image, index) => <button type="button" key={image.src} onClick={() => setActive(index + 1)} aria-label={`${copy.actions.explore}: ${project.title[locale]}, ${index + 2}`}>
      <img src={sitePath(image.src)} srcSet={responsiveSrcSet(image)} sizes="(max-width: 700px) 100vw, 50vw" alt={image.alt[locale]} loading="lazy" decoding="async" width="1200" height="800" />
    </button>)}</section> : null}
    <dialog ref={dialog} className="portfolio-lightbox" aria-label={copy.labels.projects} onClose={close} onClick={(event) => { if (event.target === dialog.current) close() }} onKeyDown={(event) => { if (event.key === 'ArrowRight') { event.preventDefault(); step(1) } if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) } }}>
      <div className="lightbox-toolbar"><span>{active === null ? '' : `${String(active + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}`}</span><span className="lightbox-progress" aria-hidden="true"><i style={{ transform: `scaleX(${active === null ? 0 : (active + 1) / images.length})` }} /></span><button data-magnetic type="button" onClick={close} aria-label={locale === 'en' ? 'Close gallery' : 'إغلاق المعرض'}>×</button></div>
      {active !== null && images[active] ? <figure><img src={sitePath(images[active].src)} srcSet={responsiveSrcSet(images[active])} sizes="100vw" alt={images[active].alt[locale]} /><figcaption>{images[active].alt[locale]}</figcaption></figure> : null}
      {images.length > 1 ? <div className="lightbox-controls"><button data-magnetic type="button" onClick={() => step(-1)} aria-label={locale === 'en' ? 'Previous image' : 'الصورة السابقة'}>←</button><button data-magnetic type="button" onClick={() => step(1)} aria-label={locale === 'en' ? 'Next image' : 'الصورة التالية'}>→</button></div> : null}
    </dialog>
  </>
}

export function NotFoundPage() {
  const locale = useLocale()
  const copy = useCopy()
  return <PageFrame><section className="editorial-content-page"><Container><EditorialHeader eyebrow="404" title={locale === 'en' ? 'Page not found.' : 'الصفحة غير موجودة.'} /><a data-magnetic className="text-link" href={routePath(locale)}>{copy.nav.home}<span aria-hidden="true">↗</span></a></Container></section></PageFrame>
}

