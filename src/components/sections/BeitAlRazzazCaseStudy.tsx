import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { assetUrl } from '../../lib/assets'
import { MediaCarousel, type CarouselMedia } from '../ui/MediaCarousel'

type Locale = 'en' | 'ar'
type Photo = { src: string; srcSet: string; alt: string; altAr?: string }
type Pair = { id: string; before: Photo; after: Photo }

const editorialPhoto = (folder: string, stem: string, alt: string, altAr: string, largeWidth = 1200): Photo => ({
  src: `/assets/projects/portfolio/beit-al-razzaz/${folder}/${stem}-large.webp`,
  srcSet: `/assets/projects/portfolio/beit-al-razzaz/${folder}/${stem}-mobile.webp 480w, /assets/projects/portfolio/beit-al-razzaz/${folder}/${stem}-small.webp 720w, /assets/projects/portfolio/beit-al-razzaz/${folder}/${stem}-large.webp ${largeWidth}w`,
  alt,
  altAr,
})

const numberedGallery = (folder: string, count: number, enLabel: string, arLabel: string, start = 1) => Array.from({ length: count }, (_, offset) => {
  const index = start + offset
  const stem = String(index).padStart(2, '0')
  return editorialPhoto(folder, stem, `${enLabel} ${index}`, `${arLabel} ${index}`)
})

const northernComparisons: Pair[] = [
  { id: 'northern-room-reconstruction', before: editorialPhoto('phase-1-northern/comparisons', '01-before', 'Northern Side room before reconstruction with exposed historic masonry', 'غرفة بالمنطقة الشمالية قبل إعادة البناء مع ظهور البناء الحجري التاريخي'), after: editorialPhoto('phase-1-northern/comparisons', '01-after', 'Northern Side room after reconstruction', 'غرفة بالمنطقة الشمالية بعد إعادة البناء') },
  { id: 'northern-interior-wall', before: editorialPhoto('phase-1-northern/comparisons', '02-before', 'Northern Side interior wall before restoration', 'جدار داخلي بالمنطقة الشمالية قبل الترميم'), after: editorialPhoto('phase-1-northern/comparisons', '02-after', 'Northern Side interior wall after restoration', 'جدار داخلي بالمنطقة الشمالية بعد الترميم') },
  { id: 'northern-corridor', before: editorialPhoto('phase-1-northern/comparisons', '03-before', 'Northern Side corridor during restoration', 'ممر بالمنطقة الشمالية أثناء أعمال الترميم'), after: editorialPhoto('phase-1-northern/comparisons', '03-after', 'Northern Side corridor after restoration', 'ممر بالمنطقة الشمالية بعد الترميم') },
  { id: 'northern-rooftop-structure', before: editorialPhoto('phase-1-northern/comparisons', '04-before', 'Northern Side rooftop structure before completion', 'الهيكل العلوي بالمنطقة الشمالية قبل الاكتمال', 960), after: editorialPhoto('phase-1-northern/comparisons', '04-after', 'Northern Side rooftop structure after completion', 'الهيكل العلوي بالمنطقة الشمالية بعد الاكتمال') },
  { id: 'northern-window-corridor', before: editorialPhoto('northern-side', '09', 'Northern Side window corridor before restoration', 'ممر النوافذ بالمنطقة الشمالية قبل الترميم'), after: editorialPhoto('northern-side', '08', 'Northern Side window corridor after restoration', 'ممر النوافذ بالمنطقة الشمالية بعد الترميم') },
  { id: 'northern-staircase', before: editorialPhoto('northern-side', '07', 'Northern Side staircase before restoration', 'درج بالمنطقة الشمالية قبل الترميم'), after: editorialPhoto('northern-side', '06', 'Northern Side staircase after restoration', 'درج بالمنطقة الشمالية بعد الترميم') },
]

const westernComparisons: Pair[] = [
  { id: 'western-window-bay', before: editorialPhoto('phase-2-western-wing/comparisons', '01-before', 'Western Wing window bay before floor restoration', 'منطقة نافذة بالجناح الغربي قبل ترميم الأرضية'), after: editorialPhoto('phase-2-western-wing/comparisons', '01-after', 'Western Wing window bay after floor restoration', 'منطقة نافذة بالجناح الغربي بعد ترميم الأرضية') },
  { id: 'western-stair', before: editorialPhoto('phase-2-western-wing/comparisons', '02-before', 'Western Wing interior before restoration', 'فراغ داخلي بالجناح الغربي قبل الترميم'), after: editorialPhoto('phase-2-western-wing/comparisons', '02-after', 'Western Wing interior after restoration', 'فراغ داخلي بالجناح الغربي بعد الترميم') },
  { id: 'western-room', before: editorialPhoto('phase-2-western-wing/comparisons', '03-before', 'Western Wing room before restoration', 'غرفة بالجناح الغربي قبل الترميم'), after: editorialPhoto('phase-2-western-wing/comparisons', '03-after', 'Western Wing room after restoration', 'غرفة بالجناح الغربي بعد الترميم') },
  { id: 'western-corridor-finish', before: editorialPhoto('phase-2-western-wing/gallery', '01', 'Western Wing corridor before restoration', 'ممر بالجناح الغربي قبل الترميم'), after: editorialPhoto('phase-2-western-wing/gallery', '02', 'Western Wing corridor after restoration', 'ممر بالجناح الغربي بعد الترميم') },
  { id: 'western-window-wall', before: editorialPhoto('phase-2-western-wing/gallery', '03', 'Western Wing window wall before restoration', 'جدار النوافذ بالجناح الغربي قبل الترميم'), after: editorialPhoto('phase-2-western-wing/gallery', '04', 'Western Wing window wall after restoration', 'جدار النوافذ بالجناح الغربي بعد الترميم') },
  { id: 'western-timber-window', before: editorialPhoto('phase-2-western-wing/gallery', '05', 'Western Wing timber window before restoration', 'نافذة خشبية بالجناح الغربي قبل الترميم'), after: editorialPhoto('phase-2-western-wing/gallery', '06', 'Western Wing timber window after restoration', 'نافذة خشبية بالجناح الغربي بعد الترميم') },
  { id: 'western-door-wall', before: editorialPhoto('phase-2-western-wing/gallery', '07', 'Western Wing doorway before restoration', 'مدخل بالجناح الغربي قبل الترميم'), after: editorialPhoto('phase-2-western-wing/gallery', '08', 'Western Wing doorway after restoration', 'مدخل بالجناح الغربي بعد الترميم') },
  { id: 'western-timber-ceiling', before: editorialPhoto('phase-2-western-wing/gallery', '09', 'Western Wing timber ceiling before restoration', 'سقف خشبي بالجناح الغربي قبل الترميم'), after: editorialPhoto('phase-2-western-wing/gallery', '10', 'Western Wing timber ceiling after restoration', 'سقف خشبي بالجناح الغربي بعد الترميم') },
  { id: 'western-window-room', before: editorialPhoto('phase-2-western-wing/gallery', '11', 'Western Wing window room before restoration', 'غرفة النوافذ بالجناح الغربي قبل الترميم'), after: editorialPhoto('phase-2-western-wing/gallery', '12', 'Western Wing window room after restoration', 'غرفة النوافذ بالجناح الغربي بعد الترميم') },
]

const westernWing = numberedGallery('phase-2-western-wing/gallery', 4, 'Western Wing restoration photograph', 'صورة من أعمال ترميم الجناح الغربي', 13)
const qaitbayAll = numberedGallery('qaitbay-main-hall', 17, 'Qaitbay’s Seat Main Hall restoration photograph', 'صورة من أعمال ترميم مقعد قايتباي – القاعة الرئيسية')
const qaitbayComparisons: Pair[] = [
  {
    id: 'qaitbay-exterior-restoration',
    before: qaitbayAll[8],
    after: qaitbayAll[6],
  },
]
const qaitbayGallery = qaitbayAll.filter((_, index) => ![4, 6, 8].includes(index))
const archiveViews = numberedGallery('archive-views', 3, 'Historic view of Beit Al-Razzaz', 'صورة تاريخية لبيت الرزاز')
const carpentryAll = numberedGallery('carpentry-workshop', 11, 'Carpentry Workshop restoration photograph', 'صورة من ترميم ورشة النجارة')
const carpentryComparisons: Pair[] = [
  {
    id: 'carpentry-workshop-interior',
    before: carpentryAll[10],
    after: carpentryAll[0],
  },
  {
    id: 'carpentry-workshop-ceiling',
    before: carpentryAll[7],
    after: carpentryAll[5],
  },
]
const carpentryGallery = carpentryAll.filter((_, index) => ![0, 5, 6, 7, 10].includes(index))

const northern: Photo[] = [
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/01-1203.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/01-480.webp 480w, /assets/projects/portfolio/beit-al-razzaz/northern-side/01-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/01-1203.webp 1203w', alt: 'Courtyard view of Beit Al-Razzaz', altAr: 'منظر للفناء في بيت الرزاز' },
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/02-1562.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/02-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/02-1562.webp 1562w', alt: 'Historic masonry and timber detail', altAr: 'تفصيل للحجر التاريخي والعناصر الخشبية' },
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/03-1570.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/03-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/03-1570.webp 1570w', alt: 'Interior stair and restored historic fabric', altAr: 'درج داخلي وعناصر معمارية تاريخية مرممة' },
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/04-1563.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/04-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/04-1563.webp 1563w', alt: 'View upward through historic timber structure', altAr: 'منظر علوي للعناصر الخشبية التاريخية' },
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/05-1586.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/05-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/05-1586.webp 1586w', alt: 'Restored interior stair detail', altAr: 'تفصيل لدرج داخلي مرمم' },
  ...numberedGallery('northern-side', 9, 'Northern side architectural photograph', 'صورة معمارية للجانب الشمالي', 6),
]
const northernGallery = northern.filter((_, index) => ![0, 5, 6, 7, 8].includes(index))

function ResponsiveImage({ image, eager = false, requested = true, locale = 'en', sizes = '(max-width: 760px) 100vw, 50vw', onLoad }: { image: Photo; eager?: boolean; requested?: boolean; locale?: Locale; sizes?: string; onLoad?: () => void }) {
  return <img src={requested ? assetUrl(image.src) : undefined} srcSet={requested ? image.srcSet.split(', ').map((item) => `${assetUrl(item.split(' ')[0])} ${item.split(' ')[1]}`).join(', ') : undefined} sizes={sizes} alt={locale === 'ar' ? image.altAr ?? 'صورة توثيقية من بيت الرزاز' : image.alt} width="1200" height="800" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'low'} decoding="async" draggable="false" onLoad={onLoad} />
}

function PhotoGallery({ images, locale, label }: { images: Photo[]; locale: Locale; label: string }) {
  const carouselImages: CarouselMedia[] = images.map((image) => ({
    id: image.src,
    src: image.src,
    srcSet: image.srcSet,
    alt: locale === 'ar' ? image.altAr ?? 'صورة توثيقية من بيت الرزاز' : image.alt,
    width: 1400,
    height: 933,
  }))
  return <MediaCarousel images={carouselImages} locale={locale} label={label} className="beit-photo-carousel" />
}

function Comparison({ item, locale }: { item: Pair; locale: Locale }) {
  const figureRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const rangeRef = useRef<HTMLInputElement>(null)
  const pointerBoundsRef = useRef<DOMRect | null>(null)
  const [requested, setRequested] = useState(false)
  const [loaded, setLoaded] = useState(0)
  const labels = locale === 'en' ? { before: 'Before', after: 'After', compare: 'Reveal before and after photographs' } : { before: 'قبل', after: 'بعد', compare: 'مقارنة صور قبل الترميم وبعده' }
  const { before, after } = item
  useEffect(() => {
    const figure = figureRef.current
    if (!figure) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setRequested(true)
      observer.disconnect()
    }, { rootMargin: '800px 0px', threshold: .01 })
    observer.observe(figure)
    return () => observer.disconnect()
  }, [])
  const applyPosition = useCallback((next: number) => {
    const position = Math.round(Math.max(0, Math.min(100, next)))
    imageRef.current?.style.setProperty('--comparison-position', `${position}%`)
    if (rangeRef.current) {
      rangeRef.current.value = String(position)
      rangeRef.current.setAttribute('aria-valuetext', `${position}%`)
    }
  }, [])
  const setFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = pointerBoundsRef.current ?? event.currentTarget.getBoundingClientRect()
    applyPosition((event.clientX - bounds.left) / bounds.width * 100)
  }
  const markLoaded = useCallback(() => setLoaded((count) => Math.min(2, count + 1)), [])
  const ready = loaded === 2
  return <figure ref={figureRef} className={`beit-comparison${ready ? ' is-ready' : ' is-loading'}`} dir="ltr" aria-busy={!ready}>
    <div ref={imageRef} className="beit-comparison-image" style={{ '--comparison-position': '50%' } as CSSProperties} onPointerDown={(event) => { pointerBoundsRef.current = event.currentTarget.getBoundingClientRect(); event.currentTarget.setPointerCapture(event.pointerId); setFromPointer(event) }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setFromPointer(event) }} onPointerUp={(event) => { pointerBoundsRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }} onPointerCancel={(event) => { pointerBoundsRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}><ResponsiveImage image={before} requested={requested} locale={locale} sizes="(max-width: 760px) 48vw, 31vw" onLoad={markLoaded} /><div className="beit-comparison-after"><ResponsiveImage image={after} requested={requested} locale={locale} sizes="(max-width: 760px) 48vw, 31vw" onLoad={markLoaded} /></div><span className="beit-photo-label beit-photo-label--before">{labels.before}</span><span className="beit-photo-label beit-photo-label--after">{labels.after}</span><span className="beit-comparison-divider" aria-hidden="true" /></div>
    <input ref={rangeRef} aria-label={labels.compare} aria-valuetext="50%" type="range" min="0" max="100" step="1" defaultValue="50" onInput={(event) => applyPosition(Number(event.currentTarget.value))} />
  </figure>
}

export function BeitAlRazzazCaseStudy({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar'
  return <div className={`beit-case-study${isArabic ? ' is-arabic' : ''}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <figure className="beit-hero-photo"><ResponsiveImage image={northern[0]} eager locale={locale} sizes="100vw" /><figcaption>{isArabic ? 'المرحلة الأولى – المنطقة الشمالية · الفناء التاريخي لبيت الرزاز' : 'Phase 1 – Northern Side · The historic courtyard at Beit Al-Razzaz'}</figcaption></figure>
    <section className="beit-story" aria-labelledby="beit-story-heading">
      <div><p className="eyebrow">{isArabic ? 'قصة الترميم' : 'The restoration story'}</p><h2 id="beit-story-heading">{isArabic ? 'تثبيت المبنى وصون طابعه التاريخي' : 'Stabilising the structure. Preserving its character.'}</h2></div>
      <p>{isArabic ? 'عالج المشروع المخاطر الإنشائية في الجانب الشرقي من بيت الرزاز، مع الحفاظ على طابعه المعماري التاريخي. شملت الأعمال إعادة بناء الجزء الشمالي الشرقي المتضرر، ومعالجة الأسقف غير الآمنة، وتدعيم العناصر الإنشائية للحفاظ على استقرار المبنى.' : 'The work addressed structural risks on the eastern side of Beit Al-Razzaz while safeguarding its historic architectural character. It included faithful reconstruction of a severely deteriorated northeast section, attention to unsafe roofs and ceilings, and structural reinforcement to support the building’s stability.'}</p>
    </section>

    <nav className="beit-phase-navigation" aria-label={isArabic ? 'أقسام مشروع بيت الرزاز' : 'Beit Al-Razzaz project sections'}>
      <a href="#beit-phase-1"><span>01</span><strong>{isArabic ? 'المرحلة الأولى – المنطقة الشمالية' : 'Phase 1 – Northern Side'}</strong></a>
      <a href="#beit-phase-2"><span>02</span><strong>{isArabic ? 'المرحلة الثانية – الجناح الغربي' : 'Phase 2 – Western Wing'}</strong></a>
      <a href="#beit-qaitbay"><span aria-hidden="true">•</span><strong>{isArabic ? 'مقعد قايتباي – القاعة الرئيسية' : 'Qaitbay’s Seat Main Hall'}</strong></a>
    </nav>

    <section id="beit-phase-1" className="beit-gallery-section beit-phase-section" aria-labelledby="beit-phase-1-heading">
      <header className="beit-section-heading"><p className="eyebrow">{isArabic ? 'المرحلة الأولى' : 'Phase 1'}</p><h2 id="beit-phase-1-heading">{isArabic ? 'المرحلة الأولى – المنطقة الشمالية' : 'Phase 1 – Northern Side'}</h2><p>{isArabic ? 'مقارنات موثقة وصور المنطقة الشمالية.' : 'Verified comparisons and photographs from the Northern Side.'}</p></header>
      <div className="beit-pair-grid">{northernComparisons.map((item) => <article className="beit-photo-pair" key={item.id}><Comparison item={item} locale={locale} /></article>)}</div>
      <h3 className="beit-subsection-heading">{isArabic ? 'صور المنطقة الشمالية' : 'Northern Side gallery'}</h3>
      <PhotoGallery images={northernGallery} locale={locale} label={isArabic ? 'معرض صور المنطقة الشمالية' : 'Northern Side gallery'} />
    </section>

    <section id="beit-phase-2" className="beit-gallery-section beit-phase-section" aria-labelledby="beit-phase-2-heading">
      <header className="beit-section-heading"><p className="eyebrow">{isArabic ? 'المرحلة الثانية' : 'Phase 2'}</p><h2 id="beit-phase-2-heading">{isArabic ? 'المرحلة الثانية – الجناح الغربي' : 'Phase 2 – Western Wing'}</h2><p>{isArabic ? 'مقارنات موثقة وصور الجناح الغربي.' : 'Verified comparisons and photographs from the Western Wing.'}</p></header>
      <div className="beit-pair-grid">{westernComparisons.map((item) => <article className="beit-photo-pair" key={item.id}><Comparison item={item} locale={locale} /></article>)}</div>
      <h3 className="beit-subsection-heading">{isArabic ? 'صور الجناح الغربي' : 'Western Wing gallery'}</h3>
      <PhotoGallery images={westernWing} locale={locale} label={isArabic ? 'معرض صور الجناح الغربي' : 'Western Wing gallery'} />
    </section>

    <section id="beit-qaitbay" className="beit-gallery-section" aria-labelledby="beit-qaitbay-heading">
      <header className="beit-section-heading"><p className="eyebrow">{isArabic ? 'بيت الرزاز' : 'Beit Al-Razzaz'}</p><h2 id="beit-qaitbay-heading">{isArabic ? 'مقعد قايتباي – القاعة الرئيسية' : 'Qaitbay’s Seat Main Hall'}</h2><p>{isArabic ? 'صور ترميم القاعة الرئيسية ضمن دراسة حالة بيت الرزاز.' : 'Main Hall restoration photographs within the Beit Al-Razzaz case study.'}</p></header>
      <div className="beit-pair-grid">{qaitbayComparisons.map((item) => <article className="beit-photo-pair" key={item.id}><Comparison item={item} locale={locale} /></article>)}</div>
      <PhotoGallery images={qaitbayGallery} locale={locale} label={isArabic ? 'معرض صور مقعد قايتباي – القاعة الرئيسية' : 'Qaitbay’s Seat Main Hall gallery'} />
    </section>

    <section className="beit-gallery-section" aria-labelledby="beit-carpentry-heading">
      <header className="beit-section-heading"><p className="eyebrow">{isArabic ? 'بيت الرزاز' : 'Beit Al-Razzaz'}</p><h2 id="beit-carpentry-heading">{isArabic ? 'ورشة النجارة' : 'Carpentry Workshop'}</h2></header>
      <dl className="beit-section-funding"><div><dt>{isArabic ? 'جهة التمويل' : 'Funding Entity'}</dt><dd>{isArabic ? 'السفارة الرومانية' : 'Romanian Embassy'}</dd></div></dl>
      <div className="beit-pair-grid">{carpentryComparisons.map((item) => <article className="beit-photo-pair" key={item.id}><Comparison item={item} locale={locale} /></article>)}</div>
      <PhotoGallery images={carpentryGallery} locale={locale} label={isArabic ? 'معرض صور ورشة النجارة' : 'Carpentry Workshop gallery'} />
    </section>

    <section className="beit-gallery-section" aria-labelledby="beit-archive-heading">
      <header className="beit-section-heading"><p className="eyebrow">{isArabic ? 'صور أرشيفية' : 'Archive views'}</p><h2 id="beit-archive-heading">{isArabic ? 'مشاهد تاريخية لبيت الرزاز' : 'Historic views of Beit Al-Razzaz'}</h2></header>
      <PhotoGallery images={archiveViews} locale={locale} label={isArabic ? 'معرض الصور التاريخية لبيت الرزاز' : 'Historic views of Beit Al-Razzaz gallery'} />
    </section>
  </div>
}
