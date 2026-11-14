import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Container } from '../components/ui/Container'
import { FoundersHeading } from '../components/ui/FoundersHeading'
import { Footer } from '../components/layout/Footer'
import { Header } from '../components/layout/Header'
import { useCopy, useHomeCopy, useLocale } from '../content/site'
import { privacyPolicyContent } from '../content/privacy'
import { routePath, sitePath } from '../lib/routes'
import { trackEvent } from '../lib/analytics'
import { NotFoundPage } from './NotFoundPage'

gsap.registerPlugin(ScrollTrigger)

type Locale = 'en' | 'ar'
type Localized = Record<Locale, string>
type EditorialImage = {
  src: string
  srcSet?: string
  alt: Localized
  position?: string
}

function projectEditorialImage(project: string, image: string, fullWidth: number, alt: Localized): EditorialImage {
  const base = `/assets/projects/portfolio/${project}/${image}`
  return { src: `${base}-${fullWidth}.webp`, srcSet: `${base}-720.webp 720w, ${base}-${fullWidth}.webp ${fullWidth}w`, alt, position: 'center' }
}

const images = {
  aboutWide: {
    src: '/assets/projects/featured/real-media/story-wide-wide-1916.webp',
    srcSet: '/assets/projects/featured/real-media/story-wide-wide-960.webp 960w, /assets/projects/featured/real-media/story-wide-wide-1440.webp 1440w, /assets/projects/featured/real-media/story-wide-wide-1916.webp 1916w',
    alt: { en: 'Restored historic architecture from a SUMMIT project', ar: 'عمارة تاريخية مرممة ضمن أحد مشروعات سوميت' },
  },
  aboutPortrait: {
    src: '/assets/projects/featured/real-media/story-portrait-portrait-1122.webp',
    srcSet: '/assets/projects/featured/real-media/story-portrait-portrait-640.webp 640w, /assets/projects/featured/real-media/story-portrait-portrait-960.webp 960w, /assets/projects/featured/real-media/story-portrait-portrait-1122.webp 1122w',
    alt: { en: 'Architectural detail documented at a SUMMIT project', ar: 'تفصيل معماري موثق في أحد مشروعات سوميت' },
  },
  construction: projectEditorialImage('new-capital-administrations-district', '01', 1312, {
    en: 'Administrative building under construction in the New Capital Administrations District',
    ar: 'مبنى إداري قيد الإنشاء في حي الوزارات بالعاصمة الإدارية الجديدة',
  }),
  constructionWide: projectEditorialImage('oriana-cairo-festival-city', '02', 1568, {
    en: 'Completed villa exterior at Oriana Cairo Festival City',
    ar: 'واجهة فيلا مكتملة في أوريانا كايرو فستيفال سيتي',
  }),
  restoration: projectEditorialImage('mohamed-ali-palace', '01', 1202, {
    en: 'Restored interior at Mohamed Ali Palace',
    ar: 'قاعة داخلية مرممة في قصر محمد علي',
  }),
  restorationWide: projectEditorialImage('beit-al-razzaz/northern-side', '01', 1203, {
    en: 'Restored courtyard and historic façades at Beit Al Razzaz',
    ar: 'الفناء والواجهات التاريخية المرممة في بيت الرزاز',
  }),
  renovation: projectEditorialImage('lakeview-residence', '03', 1206, {
    en: 'Finished residential interior at Lakeview Residence',
    ar: 'تشطيبات داخلية سكنية مكتملة في ليك فيو ريزيدنس',
  }),
  renovationWide: projectEditorialImage('lakeview-residence', '01', 1570, {
    en: 'Finished marble kitchen at Lakeview Residence',
    ar: 'مطبخ رخامي مكتمل في ليك فيو ريزيدنس',
  }),
  fitout: projectEditorialImage('bcbg', '01', 1231, {
    en: 'Completed BCBG retail storefront and interior',
    ar: 'واجهة ومتجر بي سي بي جي بعد اكتمال التشطيبات',
  }),
  fitoutDetail: projectEditorialImage('sky-offices', '02', 1424, {
    en: 'Completed glass-partitioned office interior at Sky Offices',
    ar: 'مكاتب داخلية مكتملة بقواطع زجاجية في سكاي أوفيسز',
  }),
  workmanship: {
    src: '/assets/projects/featured/real-media/about-workmanship-portrait-1122.webp',
    srcSet: '/assets/projects/featured/real-media/about-workmanship-portrait-640.webp 640w, /assets/projects/featured/real-media/about-workmanship-portrait-960.webp 960w, /assets/projects/featured/real-media/about-workmanship-portrait-1122.webp 1122w',
    alt: { en: 'Craft workmanship documented on a SUMMIT project', ar: 'أعمال حرفية موثقة في أحد مشروعات سوميت' },
  },
  contact: {
    src: '/assets/projects/featured/real-media/contact-work-wide-1914.webp',
    srcSet: '/assets/projects/featured/real-media/contact-work-wide-960.webp 960w, /assets/projects/featured/real-media/contact-work-wide-1440.webp 1440w, /assets/projects/featured/real-media/contact-work-wide-1914.webp 1914w',
    alt: { en: 'SUMMIT project team working on site', ar: 'فريق مشروع سوميت أثناء العمل في الموقع' },
  },
} satisfies Record<string, EditorialImage>

const profileOrganisations = [
  { name: 'GAMA Construction', logo: '/assets/clients/gama.webp' },
  { name: 'Hampikian', logo: '/assets/clients/hampikian.webp' },
  { name: 'ROWAD Modern Engineering', logo: '/assets/clients/rowad.webp' },
  { name: 'The Stone Shop', logo: '/assets/clients/the-stone-shop.webp' },
  { name: 'ABT', logo: '/assets/clients/abt.webp' },
  { name: 'Arabian Construction Co.', logo: '/assets/clients/acc.webp' },
  { name: 'Built Environment Collective', logo: '/assets/clients/built-environment-collective.webp' },
  { name: 'Egyptian Heritage Rescue Foundation', logo: '/assets/clients/egyptian-heritage-rescue-foundation.webp' },
]

function ClientLogoTrackSet({ duplicate = false }: { duplicate?: boolean }) {
  return <div className="client-logo-set" aria-hidden={duplicate || undefined}>
    {profileOrganisations.map((organisation, index) => <figure key={`${duplicate ? 'duplicate-' : ''}${organisation.name}`} className="client-logo-card" data-client-logo>
      <span>{String(index + 1).padStart(2, '0')}</span>
      <div className="client-logo-image">
        <img
          src={sitePath(organisation.logo)}
          alt={duplicate ? '' : `${organisation.name} logo`}
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption>{organisation.name}</figcaption>
    </figure>)}
  </div>
}

const serviceVisuals: Record<string, { primary: EditorialImage; secondary: EditorialImage; number: string }> = {
  restoration: { primary: images.restoration, secondary: images.restorationWide, number: '01' },
  renovation: { primary: images.renovation, secondary: images.renovationWide, number: '02' },
  'fit-out': { primary: images.fitout, secondary: images.fitoutDetail, number: '03' },
  construction: { primary: images.construction, secondary: images.constructionWide, number: '04' },
}

const foundersPresentation = {
  en: {
    eyebrow: 'Leadership',
    portraitAlt: 'Black-and-white portrait of SUMMIT founders Ahmed Elesawy on the left and Mohamed Haron on the right',
    translationStatus: null,
    founders: [
      {
        id: 'ahmed',
        name: 'Ahmed Elesawy',
        quote: 'Summit Company will be one of the most important emerging companies in the field of restoration and contracting because we do what we love, so the results become wonderful.\nOur passion is to build civilization with the spirit of heritage.',
      },
      {
        id: 'mohamed',
        name: 'Mohamed Haron',
        quote: 'Power without thinking does not mean anything.\nAt Summit, we care about strength and intelligence\nSo we are growing faster than any other company',
      },
    ],
  },
  ar: {
    eyebrow: 'القيادة',
    portraitAlt: 'صورة بالأبيض والأسود لمؤسسي سوميت، أحمد العيسوي على اليسار ومحمد هارون على اليمين',
    translationStatus: 'الترجمة العربية للمقولتين قيد اعتماد العميل قبل النشر.',
    founders: [
      {
        id: 'ahmed',
        name: 'أحمد العيسوي',
        quote: 'ستكون شركة سوميت واحدة من أهم الشركات الناشئة في مجال الترميم والمقاولات لأننا نفعل ما نحبه، فتكون النتائج رائعة.\nشغفنا هو أن نبني الحضارة بروح التراث.',
      },
      {
        id: 'mohamed',
        name: 'محمد هارون',
        quote: 'القوة من دون تفكير لا تعني شيئًا.\nفي سوميت، نهتم بالقوة والذكاء\nلذلك ننمو أسرع من أي شركة أخرى',
      },
    ],
  },
} satisfies Record<Locale, {
  eyebrow: string
  portraitAlt: string
  translationStatus: string | null
  founders: Array<{ id: 'ahmed' | 'mohamed'; name: string; quote: string }>
}>

function PageFrame({ children }: { children: ReactNode }) {
  const copy = useCopy()
  return <div className="site-shell page-shell flex min-h-screen flex-col bg-[var(--color-page)] text-[var(--color-ink)]"><a className="skip-link" href="#main-content">{copy.actions.skip}</a><Header /><main id="main-content" className="w-full flex-1">{children}</main><Footer /></div>
}

function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return <nav aria-label="Breadcrumb" className="breadcrumbs"><ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>{index ? <span aria-hidden="true">/</span> : null}{item.href ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>
}

function EditorialImageView({ image, sizes = '100vw', priority = false }: { image: EditorialImage; sizes?: string; priority?: boolean }) {
  const locale = useLocale()
  const srcSet = image.srcSet?.split(', ').map((item) => `${sitePath(item.split(' ')[0])} ${item.split(' ')[1]}`).join(', ')
  return <img src={sitePath(image.src)} srcSet={srcSet} sizes={sizes} alt={image.alt[locale]} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" style={image.position ? { objectPosition: image.position } : undefined} />
}

function useEditorialMotion<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!ref.current) return
    const context = gsap.context(() => {
      const media = gsap.matchMedia()
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((node) => {
          if (node.getBoundingClientRect().top < window.innerHeight * .92) return
          gsap.from(node, { y: 38, opacity: 0, duration: .85, ease: 'power3.out', scrollTrigger: { trigger: node, start: 'top 88%', once: true } })
        })
        gsap.utils.toArray<HTMLElement>('[data-image-reveal]').forEach((node) => {
          if (node.getBoundingClientRect().top < window.innerHeight * .92) return
          const image = node.querySelector<HTMLElement>('img')
          const timeline = gsap.timeline({ scrollTrigger: { trigger: node, start: 'top 88%', once: true } })
          timeline.from(node, { autoAlpha: 0, y: 42, duration: 1, ease: 'power3.out', clearProps: 'opacity,visibility,transform' })
          if (image) timeline.from(image, { yPercent: -5, scale: 1.075, duration: 1.15, ease: 'power3.out', clearProps: 'transform' }, 0)
        })
        const foundersStory = ref.current?.querySelector<HTMLElement>('[data-founders-story]')
        if (foundersStory) {
          const eyebrow = foundersStory.querySelector<HTMLElement>('[data-founders-eyebrow]')
          const headingLine = foundersStory.querySelector<HTMLElement>('[data-founders-heading-line]')
          const headingParts = [...foundersStory.querySelectorAll<HTMLElement>('[data-founders-heading-part]')]
          const translationStatus = foundersStory.querySelector<HTMLElement>('.founders-translation-status')
          const imageFrame = foundersStory.querySelector<HTMLElement>('[data-founders-image]')
          const image = imageFrame?.querySelector<HTMLElement>('img')
          const quotes = [...foundersStory.querySelectorAll<HTMLElement>('[data-founder-quote]')]
          const timeline = gsap.timeline({ scrollTrigger: { trigger: foundersStory, start: 'top 78%', once: true } })
          if (eyebrow) timeline.from(eyebrow, { y: 12, autoAlpha: 0, duration: .55, ease: 'power3.out', clearProps: 'opacity,visibility,transform' })
          if (headingLine) timeline.from(headingLine, { scaleX: 0, duration: .7, ease: 'power3.inOut', clearProps: 'transform' }, '-=.25')
          if (headingParts.length) timeline.from(headingParts, { yPercent: 82, autoAlpha: 0, duration: .86, stagger: .11, ease: 'power4.out', clearProps: 'opacity,visibility,transform' }, '-=.36')
          if (translationStatus) timeline.from(translationStatus, { y: 12, autoAlpha: 0, duration: .55, ease: 'power3.out', clearProps: 'opacity,visibility,transform' }, '-=.38')
          if (imageFrame) timeline.from(imageFrame, { y: 30, autoAlpha: 0, clipPath: 'inset(8% 0 8% 0 round var(--radius-media))', duration: 1.12, ease: 'power3.out', clearProps: 'clip-path,opacity,visibility,transform' }, '-=.18')
          if (image) timeline.from(image, { scale: 1.045, duration: 1.45, ease: 'power3.out', clearProps: 'transform' }, '<')
          if (quotes.length) timeline.from(quotes, { y: 24, autoAlpha: 0, duration: .82, stagger: .16, ease: 'power3.out', clearProps: 'opacity,visibility,transform' }, '-=.42')
        }
        gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((node) => gsap.fromTo(node, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: node.parentElement, start: 'top bottom', end: 'bottom top', scrub: .65 } }))
      })
      return () => media.revert()
    }, ref)
    return () => context.revert()
  }, [])
  return ref
}

export function AboutPage() {
  const locale = useLocale()
  const copy = useCopy()
  const root = useEditorialMotion<HTMLElement>()
  const isEnglish = locale === 'en'
  const founders = foundersPresentation[locale]
  const facts = isEnglish
    ? [{ label: 'Established', value: '2018' }, { label: 'Founders', value: 'Ahmed Elesawy & Mohamed Haron' }, { label: 'Origin', value: 'Egypt' }]
    : [{ label: 'التأسيس', value: '2018' }, { label: 'المؤسسون', value: 'أحمد العيسوي ومحمد هارون' }, { label: 'الموطن', value: 'مصر' }]
  const principles = isEnglish
    ? [
      { label: 'Vision', title: 'Build the future with the spirit of heritage.', body: 'To be recognised for innovative, sustainable and high-quality construction.' },
      { label: 'Mission', title: 'Construction and restoration with lasting value.', body: 'Superior construction and restoration services across residential, commercial and industrial sectors.' },
      { label: 'Values', title: 'Quality through considered execution.', body: 'Sustainability · Innovation · Quality · Commitment · Collaboration · Excellence' },
    ]
    : [
      { label: 'الرؤية', title: 'نبني المستقبل بروح التراث.', body: 'جذور مصرية. ورؤية للمستقبل.' },
      { label: 'المهمة', title: 'الإنشاء والترميم بقيمة تدوم.', body: 'تقديم خدمات إنشائية وترميم متميزة للقطاعات السكنية والتجارية والصناعية.' },
      { label: 'القيم', title: 'الخامات. التنفيذ. الاستدامة.', body: 'الاهتمام بالخامات والتنفيذ والاستدامة.' },
    ]
  return <PageFrame><article ref={root} className="inner-page about-editorial"><Container>
    <header className="inner-hero about-hero">
      <div className="inner-hero-copy brand-pattern-field brand-pattern-field--panel"><p className="eyebrow">{copy.pages.about.eyebrow}</p><h1>{copy.pages.about.title}</h1><p>{copy.pages.about.body}</p></div>
      <figure className="inner-hero-media"><EditorialImageView image={images.aboutWide} priority /></figure>
    </header>
    <section className="founders-story" aria-labelledby="founders-heading" data-founders-story>
      <header className="founders-heading">
        <p className="eyebrow" data-founders-eyebrow>{founders.eyebrow}</p>
        <FoundersHeading locale={locale} id="founders-heading" />
        {founders.translationStatus ? <p className="founders-translation-status" role="note">{founders.translationStatus}</p> : null}
      </header>
      <div className="founders-stage">
        <figure className="founders-image" data-founders-image>
          <img
            src={sitePath('/assets/about/founders/founders-wide-1536.webp')}
            srcSet={`${sitePath('/assets/about/founders/founders-wide-960.webp')} 960w, ${sitePath('/assets/about/founders/founders-wide-1536.webp')} 1536w`}
            sizes="(max-width: 1100px) calc(100vw - (2 * var(--page-gutter))), 48vw"
            alt={founders.portraitAlt}
            width="1536"
            height="1024"
            loading="lazy"
            decoding="async"
          />
        </figure>
        {founders.founders.map((founder) => (
          <article className={`founder-quote founder-quote--${founder.id}`} data-founder-quote key={founder.id}>
            <span className="founder-quotation-mark" aria-hidden="true">“</span>
            <span className="founder-accent-line" data-founder-line aria-hidden="true" />
            <h3 data-founder-name>{founder.name}</h3>
            <blockquote data-founder-copy><p>{founder.quote}</p></blockquote>
          </article>
        ))}
      </div>
    </section>
    <dl className="company-facts" data-reveal>{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
    <section className="editorial-photo-strip" aria-label={isEnglish ? 'SUMMIT project workmanship' : 'أعمال من مشروعات سوميت'}>
      <figure className="editorial-photo-strip__portrait" data-image-reveal><EditorialImageView image={images.workmanship} sizes="(max-width: 760px) 72vw, 34vw" /><figcaption><span>01</span>{isEnglish ? 'Workmanship / authentic project record' : 'الحرفية / توثيق أصلي للمشروع'}</figcaption></figure>
      <figure className="editorial-photo-strip__wide" data-image-reveal><div data-parallax><EditorialImageView image={images.restorationWide} sizes="(max-width: 760px) 100vw, 58vw" /></div><figcaption><span>02</span>{isEnglish ? 'Heritage fabric / authentic project record' : 'النسيج التراثي / توثيق أصلي للمشروع'}</figcaption></figure>
    </section>
    <section className="principles" aria-label={isEnglish ? 'Vision, mission and values' : 'الرؤية والمهمة والقيم'}>
      {principles.map((item, index) => <article key={item.label} data-reveal><span>0{index + 1}</span><p className="eyebrow">{item.label}</p><h2>{item.title}</h2><p>{item.body}</p></article>)}
    </section>
    <InnerCta title={isEnglish ? 'See the work behind the story.' : 'شاهد الأعمال وراء الحكاية.'} href={routePath(locale, 'projects')} label={copy.nav.projects} />
  </Container></article></PageFrame>
}

export function ServicesPage() {
  const locale = useLocale()
  const copy = useCopy()
  const home = useHomeCopy()
  const root = useEditorialMotion<HTMLElement>()
  return <PageFrame><section ref={root} className="inner-page services-editorial"><Container>
    <header className="services-index-heading brand-pattern-field brand-pattern-field--intro"><p className="eyebrow">{copy.pages.services.eyebrow}</p><h1>{copy.pages.services.title}</h1><p>{copy.pages.services.body}</p></header>
    <section className="formal-disciplines" aria-labelledby="formal-disciplines-title">
      <div className="formal-disciplines-heading" data-reveal><p className="eyebrow">{locale === 'en' ? 'Main services' : 'الخدمات الرئيسية'}</p><h2 id="formal-disciplines-title">{locale === 'en' ? 'Four connected disciplines' : 'أربعة تخصصات مترابطة'}</h2></div>
      <div className="formal-disciplines-grid">{home.services.cards.map((discipline, index) => <article key={discipline.name} data-reveal><span>0{index + 1}</span><h3>{discipline.name}</h3><p>{discipline.description}</p></article>)}</div>
    </section>
    <figure className="editorial-panorama" data-image-reveal><div data-parallax><EditorialImageView image={images.constructionWide} sizes="100vw" /></div><figcaption><span>01 / 04</span>{locale === 'en' ? 'Construction in progress / authentic SUMMIT photography' : 'أعمال إنشاء قيد التنفيذ / تصوير أصلي لسوميت'}</figcaption></figure>
    <div className="service-landing-label" data-reveal><p className="eyebrow">{locale === 'en' ? 'Dedicated service pages' : 'صفحات الخدمات المخصصة'}</p><p>{locale === 'en' ? 'Four focused landing pages aligned with the agreed website scope.' : 'أربع صفحات متخصصة متوافقة مع نطاق الموقع المتفق عليه.'}</p></div>
    <div className="services-index-list">{copy.serviceDetails.map((service) => {
      const visual = serviceVisuals[service.slug]
      return <a className={`service-index-row service-index-row--${service.slug}`} key={service.slug} href={routePath(locale, 'service-detail', service.slug)} data-reveal>
        <span className="service-index-number">{visual.number}</span>
        <div><h2>{service.title}</h2><p>{service.desc}</p></div>
        <figure data-image-reveal><EditorialImageView image={visual.primary} sizes="(max-width: 760px) 100vw, 30vw" /></figure>
        <span className="service-index-arrow" aria-hidden="true">↗</span>
      </a>
    })}</div>
    <InnerCta title={locale === 'en' ? 'A considered response to every brief.' : 'استجابة مدروسة لكل مشروع.'} href={routePath(locale, 'contact')} label={copy.actions.enquire} />
  </Container></section></PageFrame>
}

export function ServiceDetailPage({ slug }: { slug?: string }) {
  const locale = useLocale()
  const copy = useCopy()
  const root = useEditorialMotion<HTMLElement>()
  const index = copy.serviceDetails.findIndex((item) => item.slug === slug)
  const service = copy.serviceDetails[index]
  if (!service || !slug) return <NotFoundPage />
  const visual = serviceVisuals[slug]
  const next = copy.serviceDetails[(index + 1) % copy.serviceDetails.length]
  const composition = slug === 'restoration' ? 'wide' : slug === 'renovation' ? 'offset' : slug === 'fit-out' ? 'mosaic' : 'split'
  return <PageFrame><article ref={root} className={`inner-page service-detail service-detail--${composition}`}><Container>
    <Breadcrumbs items={[{ label: copy.nav.home, href: routePath(locale) }, { label: copy.nav.services, href: routePath(locale, 'services') }, { label: service.title }]} />
    <header className="service-detail-hero">
      <div className="brand-pattern-field brand-pattern-field--panel"><p className="eyebrow">{visual.number} · {copy.pages.services.eyebrow}</p><h1>{service.title}</h1><p>{service.desc}</p></div>
      <figure><EditorialImageView image={visual.primary} priority /></figure>
    </header>
    <section className="service-detail-body">
      <div data-reveal><p className="eyebrow">{copy.labels.scope}</p><ol>{service.scope.map((item, scopeIndex) => <li key={item}><span>{String(scopeIndex + 1).padStart(2, '0')}</span>{item}</li>)}</ol></div>
      <figure data-image-reveal><div data-parallax><EditorialImageView image={visual.secondary} sizes="(max-width: 760px) 100vw, 50vw" /></div></figure>
    </section>
    <nav className="service-next" aria-label={locale === 'en' ? 'Service navigation' : 'التنقل بين الخدمات'} data-reveal>
      <span>{locale === 'en' ? 'Next service' : 'الخدمة التالية'}</span><a data-magnetic href={routePath(locale, 'service-detail', next.slug)}>{next.title}<b aria-hidden="true">↗</b></a>
    </nav>
    <InnerCta title={locale === 'en' ? 'Discuss this service with SUMMIT.' : 'ناقش هذه الخدمة مع سوميت.'} href={`${routePath(locale, 'contact')}?interest=${encodeURIComponent(slug)}`} label={copy.actions.enquire} />
  </Container></article></PageFrame>
}

export function ClientsPage() {
  const locale = useLocale()
  const copy = useCopy()
  const root = useEditorialMotion<HTMLElement>()
  const logoCarousel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = logoCarousel.current
    if (!viewport) return

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let isVisible = true

    const renderLogoColor = () => {
      const viewportBounds = viewport.getBoundingClientRect()
      const center = viewportBounds.left + viewportBounds.width / 2
      const fullColorRadius = Math.min(96, viewportBounds.width * 0.09)
      const fadeRadius = Math.max(fullColorRadius + 1, viewportBounds.width * 0.34)
      const cards = Array.from(viewport.querySelectorAll<HTMLElement>('[data-client-logo]'))
      const strengths = cards.map((card) => {
        const bounds = card.getBoundingClientRect()
        const distance = Math.abs(bounds.left + bounds.width / 2 - center)
        if (distance <= fullColorRadius) return 1
        const progress = Math.min(1, (distance - fullColorRadius) / (fadeRadius - fullColorRadius))
        const eased = progress * progress * (3 - 2 * progress)
        return 1 - eased
      })

      cards.forEach((card, index) => {
        const strength = strengths[index]
        card.style.setProperty('--logo-grayscale', (1 - strength).toFixed(3))
        card.style.setProperty('--logo-saturation', (0.18 + strength * 0.82).toFixed(3))
        card.style.setProperty('--logo-opacity', (0.56 + strength * 0.44).toFixed(3))
      })
    }

    const tick = () => {
      renderLogoColor()
      if (!motionPreference.matches && isVisible && document.visibilityState === 'visible') frame = window.requestAnimationFrame(tick)
    }

    const restart = () => {
      window.cancelAnimationFrame(frame)
      renderLogoColor()
      if (!motionPreference.matches && isVisible && document.visibilityState === 'visible') frame = window.requestAnimationFrame(tick)
    }

    const resizeObserver = new ResizeObserver(restart)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
      restart()
    }, { rootMargin: '10%' })
    resizeObserver.observe(viewport)
    intersectionObserver.observe(viewport)
    motionPreference.addEventListener('change', restart)
    document.addEventListener('visibilitychange', restart)
    viewport.addEventListener('scroll', renderLogoColor, { passive: true })
    restart()

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      motionPreference.removeEventListener('change', restart)
      document.removeEventListener('visibilitychange', restart)
      viewport.removeEventListener('scroll', renderLogoColor)
    }
  }, [])

  return <PageFrame><section ref={root} className="inner-page clients-editorial"><Container>
    <header className="clients-heading brand-pattern-field brand-pattern-field--intro"><p className="eyebrow">{copy.pages.clients.eyebrow}</p><h1>{copy.pages.clients.title}</h1><p>{copy.pages.clients.body}</p></header>
    <p className="profile-source-note" data-reveal>{locale === 'en' ? 'The following marks are reproduced from the client-supplied SUMMIT company profile.' : 'العلامات التالية مأخوذة من الملف التعريفي لشركة سوميت المقدم من العميل.'}</p>
    <div ref={logoCarousel} className="client-logo-carousel" role="region" aria-label={locale === 'en' ? 'SUMMIT clients and partners logos' : 'شعارات عملاء وشركاء سوميت'}>
      <div className="client-logo-track">
        <ClientLogoTrackSet />
        <ClientLogoTrackSet duplicate />
      </div>
    </div>
    <InnerCta title={locale === 'en' ? 'Explore selected SUMMIT projects.' : 'استكشف مشروعات مختارة لسوميت.'} href={routePath(locale, 'projects')} label={copy.nav.projects} />
  </Container></section></PageFrame>
}

const contactLabels = {
  en: { name: 'Name', email: 'Email', phone: 'Phone', company: 'Company (optional)', interest: 'Project or service interest', message: 'Tell us about the project', choose: 'Select an interest', project: 'General project enquiry', submit: 'Send enquiry', sending: 'Sending…', required: 'Complete the required fields before continuing.', tooFast: 'Please review the enquiry and submit it again.', accepted: 'The form service accepted your enquiry for delivery.', error: 'The enquiry could not be submitted. Please try again or use the direct email option.', unavailable: 'Online form delivery is awaiting provider configuration. Please use the direct email option.', privacy: 'When configured, the form securely sends these fields to the approved form provider. This website does not contain email-service credentials.', alternative: 'Email directly instead' },
  ar: { name: 'الاسم', email: 'البريد الإلكتروني', phone: 'الهاتف', company: 'الشركة (اختياري)', interest: 'المشروع أو الخدمة محل الاهتمام', message: 'حدثنا عن المشروع', choose: 'اختر مجال الاهتمام', project: 'استفسار عام عن مشروع', submit: 'إرسال الاستفسار', sending: 'جارٍ الإرسال…', required: 'أكمل الحقول المطلوبة قبل المتابعة.', tooFast: 'يرجى مراجعة الاستفسار ثم إعادة إرساله.', accepted: 'قبلت خدمة النماذج استفسارك للتسليم.', error: 'تعذر إرسال الاستفسار. حاول مرة أخرى أو استخدم البريد الإلكتروني المباشر.', unavailable: 'إرسال النموذج عبر الإنترنت في انتظار إعداد مزود الخدمة. يرجى استخدام البريد الإلكتروني المباشر.', privacy: 'عند الإعداد، يرسل النموذج هذه الحقول بأمان إلى مزود النماذج المعتمد. ولا يحتوي الموقع على بيانات اعتماد خدمة البريد.', alternative: 'استخدم البريد المباشر بدلًا من ذلك' },
}

export function ContactPage() {
  const locale = useLocale()
  const copy = useCopy()
  const labels = contactLabels[locale]
  const root = useEditorialMotion<HTMLElement>()
  const formRef = useRef<HTMLFormElement>(null)
  const startedAt = useRef(Date.now())
  const [interest, setInterest] = useState('')
  const [status, setStatus] = useState('')
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const endpoint = import.meta.env.VITE_ENQUIRY_FORM_ENDPOINT?.trim()
  const endpointConfigured = Boolean(endpoint && /^https:\/\//i.test(endpoint))
  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get('interest')
    if (query && ['construction', 'restoration', 'renovation', 'fit-out'].includes(query)) setInterest(query)
  }, [])
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    if (String(data.get('website') || '')) return
    if (Date.now() - startedAt.current < 1500) { setFormState('error'); setStatus(labels.tooFast); return }
    if (!form.checkValidity()) { form.reportValidity(); setFormState('error'); setStatus(labels.required); return }
    if (!endpointConfigured || !endpoint) { setFormState('error'); setStatus(labels.unavailable); return }
    const selectedInterest = String(data.get('interest') || labels.project)
    data.set('form_name', 'SUMMIT project enquiry')
    data.set('locale', locale)
    data.set('page', window.location.href)
    data.set('submission_duration_ms', String(Date.now() - startedAt.current))
    setFormState('loading')
    setStatus(labels.sending)
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    try {
      const response = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: controller.signal })
      if (!response.ok) throw new Error(`Form endpoint returned ${response.status}`)
      setFormState('success')
      setStatus(labels.accepted)
      form.reset()
      setInterest('')
      startedAt.current = Date.now()
      if (import.meta.env.VITE_FORM_DELIVERY_VERIFIED === 'true') trackEvent('generate_lead', { form_id: 'project_enquiry', service_interest: selectedInterest })
    } catch {
      setFormState('error')
      setStatus(labels.error)
    } finally {
      window.clearTimeout(timeout)
    }
  }
  return <PageFrame><section ref={root} className="inner-page contact-editorial"><Container>
    <div className="contact-layout">
      <header className="brand-pattern-field brand-pattern-field--panel"><p className="eyebrow">{copy.pages.contact.eyebrow}</p><h1>{copy.pages.contact.title}</h1><p>{copy.pages.contact.body}</p><a data-magnetic className="contact-direct" href="mailto:Projects@Summit-constructions.com">Projects@Summit-constructions.com <span aria-hidden="true">↗</span></a></header>
      <form ref={formRef} className="enquiry-form" onSubmit={handleSubmit} noValidate aria-busy={formState === 'loading'} data-delivery-configured={endpointConfigured ? 'true' : 'false'}>
        <div className="form-field"><label htmlFor="contact-name">{labels.name}</label><input id="contact-name" name="name" autoComplete="name" required minLength={2} /></div>
        <div className="form-field"><label htmlFor="contact-email">{labels.email}</label><input id="contact-email" name="email" type="email" autoComplete="email" required /></div>
        <div className="form-field"><label htmlFor="contact-phone">{labels.phone}</label><input id="contact-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required minLength={7} maxLength={24} /></div>
        <div className="form-field"><label htmlFor="contact-company">{labels.company}</label><input id="contact-company" name="company" autoComplete="organization" /></div>
        <div className="form-field"><label htmlFor="contact-interest">{labels.interest}</label><select id="contact-interest" name="interest" required value={interest} onChange={(event) => setInterest(event.target.value)}><option value="">{labels.choose}</option><option value="general-project">{labels.project}</option>{copy.serviceDetails.map((service) => <option value={service.slug} key={service.slug}>{service.title}</option>)}</select></div>
        <div className="form-field form-field--wide"><label htmlFor="contact-message">{labels.message}</label><textarea id="contact-message" name="message" rows={6} required minLength={20} /></div>
        <div className="form-trap" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" /></div>
        <p className="form-privacy">{labels.privacy} <a href={routePath(locale, 'privacy')}>{copy.nav.privacy}</a></p>
        {!endpointConfigured ? <p className="form-configuration" role="note">{labels.unavailable}</p> : null}
        <div className="form-actions"><button data-magnetic className="button-link" type="submit" disabled={formState === 'loading'}>{formState === 'loading' ? labels.sending : labels.submit}<span aria-hidden="true">↗</span></button><a href="mailto:Projects@Summit-constructions.com">{labels.alternative}</a></div>
        <p className="form-status" data-state={formState} role={formState === 'error' ? 'alert' : 'status'} aria-live="polite">{status}</p>
      </form>
    </div>
    <figure className="contact-photo-band" data-image-reveal><div data-parallax><EditorialImageView image={images.contact} sizes="100vw" /></div><figcaption><span>SUMMIT / 01</span>{locale === 'en' ? 'From the client-supplied project archive' : 'من أرشيف المشروعات المقدم من العميل'}</figcaption></figure>
  </Container></section></PageFrame>
}

export function PrivacyPage() {
  const locale = useLocale()
  const policy = privacyPolicyContent[locale]
  const root = useEditorialMotion<HTMLElement>()
  return (
    <PageFrame>
      <section ref={root} className="inner-page privacy-editorial">
        <Container>
          <header className="privacy-header brand-pattern-field brand-pattern-field--panel">
            <div data-reveal>
              <p className="eyebrow">{policy.eyebrow}</p>
              <h1>{policy.title}</h1>
            </div>
            <div className="privacy-header-copy" data-reveal>
              <p>{policy.introduction}</p>
              <dl className="privacy-meta">
                <div><dt>{policy.statusLabel}</dt><dd>{policy.status}</dd></div>
                <div><dt>{policy.updatedLabel}</dt><dd>{policy.updated}</dd></div>
              </dl>
            </div>
          </header>

          <div className="privacy-document">
            <nav className="privacy-contents" aria-label={policy.contentsLabel}>
              <p>{policy.contentsLabel}</p>
              <ol>
                {policy.sections.map((section, index) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</a>
                  </li>
                ))}
              </ol>
            </nav>

            <article className="privacy-sections">
              {policy.sections.map((section, index) => (
                <section id={section.id} className="privacy-section" data-reveal key={section.id}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h2>{section.title}</h2>
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    {section.id === 'contact-information' ? (
                      <address className="privacy-contact">
                        <p>{policy.emailPrompt}</p>
                        <a href="mailto:Projects@Summit-constructions.com">Projects@Summit-constructions.com</a>
                      </address>
                    ) : null}
                  </div>
                </section>
              ))}
              <aside className="privacy-review-note" role="note" data-reveal><p>{policy.reviewNotice}</p></aside>
            </article>
          </div>
        </Container>
      </section>
    </PageFrame>
  )
}

function InnerCta({ title, href, label }: { title: string; href: string; label: string }) {
  return <aside className="inner-cta" data-reveal><h2>{title}</h2><a data-magnetic className="text-link" href={href}>{label}<span aria-hidden="true">↗</span></a></aside>
}
