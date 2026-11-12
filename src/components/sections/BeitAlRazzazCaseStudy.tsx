import { useState } from 'react'
import { assetUrl } from '../../lib/assets'

type Locale = 'en' | 'ar'
type Photo = { src: string; srcSet: string; alt: string; altAr?: string }
type Pair = { id: string; before: Photo; after: Photo }

const editorialPhoto = (folder: string, stem: string, alt: string, altAr: string): Photo => ({
  src: `/assets/projects/portfolio/beit-al-razzaz/${folder}/${stem}-large.webp`,
  srcSet: `/assets/projects/portfolio/beit-al-razzaz/${folder}/${stem}-small.webp 720w, /assets/projects/portfolio/beit-al-razzaz/${folder}/${stem}-large.webp 1600w`,
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
]

const westernComparisons: Pair[] = [
  { id: 'western-window-bay', before: editorialPhoto('phase-2-western-wing/comparisons', '01-before', 'Western Wing window bay before floor restoration', 'منطقة نافذة بالجناح الغربي قبل ترميم الأرضية'), after: editorialPhoto('phase-2-western-wing/comparisons', '01-after', 'Western Wing window bay after floor restoration', 'منطقة نافذة بالجناح الغربي بعد ترميم الأرضية') },
  { id: 'western-stair', before: editorialPhoto('phase-2-western-wing/comparisons', '02-before', 'Western Wing interior before restoration', 'فراغ داخلي بالجناح الغربي قبل الترميم'), after: editorialPhoto('phase-2-western-wing/comparisons', '02-after', 'Western Wing interior after restoration', 'فراغ داخلي بالجناح الغربي بعد الترميم') },
  { id: 'western-room', before: editorialPhoto('phase-2-western-wing/comparisons', '03-before', 'Western Wing room before restoration', 'غرفة بالجناح الغربي قبل الترميم'), after: editorialPhoto('phase-2-western-wing/comparisons', '03-after', 'Western Wing room after restoration', 'غرفة بالجناح الغربي بعد الترميم') },
]

const westernWing = numberedGallery('phase-2-western-wing/gallery', 16, 'Western Wing restoration photograph', 'صورة من أعمال ترميم الجناح الغربي')
const archiveViews = numberedGallery('archive-views', 3, 'Historic view of Beit Al-Razzaz', 'صورة تاريخية لبيت الرزاز')
const carpentryAll = numberedGallery('carpentry-workshop', 11, 'Carpentry Workshop restoration photograph', 'صورة من ترميم ورشة النجارة')
const carpentryComparison: Pair = {
  id: 'carpentry-workshop-interior',
  before: carpentryAll[10],
  after: carpentryAll[0],
}
const carpentryGallery = carpentryAll.slice(1, 10)

const northern: Photo[] = [
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/01-1203.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/01-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/01-1203.webp 1203w', alt: 'Courtyard view of Beit Al-Razzaz', altAr: 'منظر للفناء في بيت الرزاز' },
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/02-1562.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/02-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/02-1562.webp 1562w', alt: 'Historic masonry and timber detail', altAr: 'تفصيل للحجر التاريخي والعناصر الخشبية' },
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/03-1570.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/03-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/03-1570.webp 1570w', alt: 'Interior stair and restored historic fabric', altAr: 'درج داخلي وعناصر معمارية تاريخية مرممة' },
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/04-1563.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/04-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/04-1563.webp 1563w', alt: 'View upward through historic timber structure', altAr: 'منظر علوي للعناصر الخشبية التاريخية' },
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/05-1586.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/05-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/05-1586.webp 1586w', alt: 'Restored interior stair detail', altAr: 'تفصيل لدرج داخلي مرمم' },
  ...numberedGallery('northern-side', 7, 'Northern side architectural photograph', 'صورة معمارية للجانب الشمالي', 6),
]

function ResponsiveImage({ image, eager = false, locale = 'en', sizes = '(max-width: 760px) 100vw, 50vw' }: { image: Photo; eager?: boolean; locale?: Locale; sizes?: string }) {
  return <img src={assetUrl(image.src)} srcSet={image.srcSet.split(', ').map((item) => `${assetUrl(item.split(' ')[0])} ${item.split(' ')[1]}`).join(', ')} sizes={sizes} alt={locale === 'ar' ? image.altAr ?? 'صورة توثيقية من بيت الرزاز' : image.alt} width="1600" height="1067" loading={eager ? 'eager' : 'lazy'} decoding="async" />
}

function PhotoGallery({ images, locale }: { images: Photo[]; locale: Locale }) {
  return <div className="beit-editorial-grid">{images.map((image) => <figure key={image.src}><ResponsiveImage image={image} locale={locale} sizes="(max-width: 760px) 50vw, 33vw" /></figure>)}</div>
}

function Comparison({ item, locale }: { item: Pair; locale: Locale }) {
  const [position, setPosition] = useState(50)
  const labels = locale === 'en' ? { before: 'Before', after: 'After', compare: 'Reveal before and after photographs' } : { before: 'قبل', after: 'بعد', compare: 'مقارنة صور قبل الترميم وبعده' }
  const { before, after } = item
  const setFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    setPosition(Math.round(Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100))))
  }
  return <figure className="beit-comparison" dir="ltr">
    <div className="beit-comparison-image" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setFromPointer(event) }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setFromPointer(event) }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}><ResponsiveImage image={before} locale={locale} /><div className="beit-comparison-after" style={{ clipPath: `inset(0 0 0 ${position}%)` }}><ResponsiveImage image={after} locale={locale} /></div><span className="beit-photo-label beit-photo-label--before">{labels.before}</span><span className="beit-photo-label beit-photo-label--after">{labels.after}</span><span className="beit-comparison-divider" style={{ left: `${position}%` }} aria-hidden="true" /></div>
    <input aria-label={labels.compare} aria-valuetext={`${position}%`} type="range" min="0" max="100" value={position} onChange={(event) => setPosition(Number(event.target.value))} />
  </figure>
}

export function BeitAlRazzazCaseStudy({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar'
  return <div className={`beit-case-study${isArabic ? ' is-arabic' : ''}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <figure className="beit-hero-photo"><ResponsiveImage image={northern[0]} eager locale={locale} /><figcaption>{isArabic ? 'المرحلة الأولى – المنطقة الشمالية · الفناء التاريخي لبيت الرزاز' : 'Phase 1 – Northern Side · The historic courtyard at Beit Al-Razzaz'}</figcaption></figure>
    <section className="beit-story" aria-labelledby="beit-story-heading">
      <div><p className="eyebrow">{isArabic ? 'قصة الترميم' : 'The restoration story'}</p><h2 id="beit-story-heading">{isArabic ? 'تثبيت المبنى وصون طابعه التاريخي' : 'Stabilising the structure. Preserving its character.'}</h2></div>
      <p>{isArabic ? 'عالج المشروع المخاطر الإنشائية في الجانب الشرقي من بيت الرزاز، مع الحفاظ على طابعه المعماري التاريخي. شملت الأعمال إعادة بناء الجزء الشمالي الشرقي المتضرر، ومعالجة الأسقف غير الآمنة، وتدعيم العناصر الإنشائية للحفاظ على استقرار المبنى.' : 'The work addressed structural risks on the eastern side of Beit Al-Razzaz while safeguarding its historic architectural character. It included faithful reconstruction of a severely deteriorated northeast section, attention to unsafe roofs and ceilings, and structural reinforcement to support the building’s stability.'}</p>
    </section>

    <nav className="beit-phase-navigation" aria-label={isArabic ? 'مراحل مشروع بيت الرزاز' : 'Beit Al-Razzaz project phases'}>
      <a href="#beit-phase-1"><span>01</span><strong>{isArabic ? 'المرحلة الأولى – المنطقة الشمالية' : 'Phase 1 – Northern Side'}</strong></a>
      <a href="#beit-phase-2"><span>02</span><strong>{isArabic ? 'المرحلة الثانية – الجناح الغربي' : 'Phase 2 – Western Wing'}</strong></a>
    </nav>

    <section id="beit-phase-1" className="beit-gallery-section beit-phase-section" aria-labelledby="beit-phase-1-heading">
      <header className="beit-section-heading"><p className="eyebrow">{isArabic ? 'المرحلة الأولى' : 'Phase 1'}</p><h2 id="beit-phase-1-heading">{isArabic ? 'المرحلة الأولى – المنطقة الشمالية' : 'Phase 1 – Northern Side'}</h2><p>{isArabic ? 'مقارنات موثقة وصور المنطقة الشمالية.' : 'Verified comparisons and photographs from the Northern Side.'}</p></header>
      <div className="beit-pair-grid">{northernComparisons.map((item) => <article className="beit-photo-pair" key={item.id}><Comparison item={item} locale={locale} /></article>)}</div>
      <h3 className="beit-subsection-heading">{isArabic ? 'صور المنطقة الشمالية' : 'Northern Side gallery'}</h3>
      <PhotoGallery images={northern.slice(1)} locale={locale} />
    </section>

    <section id="beit-phase-2" className="beit-gallery-section beit-phase-section" aria-labelledby="beit-phase-2-heading">
      <header className="beit-section-heading"><p className="eyebrow">{isArabic ? 'المرحلة الثانية' : 'Phase 2'}</p><h2 id="beit-phase-2-heading">{isArabic ? 'المرحلة الثانية – الجناح الغربي' : 'Phase 2 – Western Wing'}</h2><p>{isArabic ? 'مقارنات موثقة وصور الجناح الغربي.' : 'Verified comparisons and photographs from the Western Wing.'}</p></header>
      <div className="beit-pair-grid">{westernComparisons.map((item) => <article className="beit-photo-pair" key={item.id}><Comparison item={item} locale={locale} /></article>)}</div>
      <h3 className="beit-subsection-heading">{isArabic ? 'صور الجناح الغربي' : 'Western Wing gallery'}</h3>
      <PhotoGallery images={westernWing} locale={locale} />
    </section>

    <section className="beit-gallery-section" aria-labelledby="beit-carpentry-heading">
      <header className="beit-section-heading"><p className="eyebrow">{isArabic ? 'بيت الرزاز' : 'Beit Al-Razzaz'}</p><h2 id="beit-carpentry-heading">{isArabic ? 'ورشة النجارة' : 'Carpentry Workshop'}</h2></header>
      <dl className="beit-section-funding"><div><dt>{isArabic ? 'جهة التمويل' : 'Funding Entity'}</dt><dd>{isArabic ? 'السفارة الرومانية' : 'Romanian Embassy'}</dd></div></dl>
      <div className="beit-featured-comparison"><Comparison item={carpentryComparison} locale={locale} /></div>
      <PhotoGallery images={carpentryGallery} locale={locale} />
    </section>

    <section className="beit-gallery-section" aria-labelledby="beit-archive-heading">
      <header className="beit-section-heading"><p className="eyebrow">{isArabic ? 'صور أرشيفية' : 'Archive views'}</p><h2 id="beit-archive-heading">{isArabic ? 'مشاهد تاريخية لبيت الرزاز' : 'Historic views of Beit Al-Razzaz'}</h2></header>
      <PhotoGallery images={archiveViews} locale={locale} />
    </section>
  </div>
}
