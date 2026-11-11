import { useState } from 'react'
import { assetUrl } from '../../lib/assets'

type Locale = 'en' | 'ar'
type Photo = { src: string; srcSet: string; alt: string; altAr?: string }
type Pair = { id: string; before: Photo; after: Photo }

const photo = (code: string, index: number, alt: string): Photo => {
  const slug = code.toLowerCase()
  const stem = `photo-${String(index).padStart(2, '0')}`
  return {
    src: `/assets/projects/portfolio/beit-al-razzaz/${slug}/${stem}-1400.webp`,
    srcSet: `/assets/projects/portfolio/beit-al-razzaz/${slug}/${stem}-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/${slug}/${stem}-1400.webp 1400w`,
    alt,
  }
}

const pair = (code: string, number: number, beforeIndex: number, afterIndex: number, beforeAlt: string, afterAlt: string): Pair => ({
  id: `${code}-${number}`,
  before: photo(code, beforeIndex, beforeAlt),
  after: photo(code, afterIndex, afterAlt),
})

const documentaryPairs: Pair[] = [
  pair('E3-00-27-01', 1, 2, 1, 'Room before reconstruction with exposed historic masonry', 'Reconstructed room after restoration'),
  pair('E3-00-27-01', 2, 3, 4, 'Damaged interior wall before restoration', 'Interior wall after restoration'),
  pair('E3-00-27-01', 3, 6, 5, 'Corridor during restoration work', 'Completed corridor after restoration'),
  pair('E3-01-37-03', 1, 1, 2, 'Corridor before restoration', 'Corridor after restoration'),
  pair('E3-01-37-05', 1, 1, 2, 'Window bay before floor restoration', 'Window bay after floor restoration'),
  pair('E3-01-37-07', 1, 1, 2, 'Ceiling area before restoration', 'Ceiling area after restoration'),
  pair('E3-01-37-07', 2, 3, 4, 'Interior structure before restoration', 'Interior structure after restoration'),
  pair('E3-01-37-07', 3, 5, 6, 'Interior wall before restoration', 'Interior wall after restoration'),
  pair('E3-01-37-09', 1, 1, 2, 'Timber ceiling before restoration', 'Timber ceiling after restoration'),
  pair('E3-01-37-09', 2, 3, 4, 'Interior room before restoration', 'Interior room after restoration'),
]

const phases = {
  en: [
    { title: 'Northeast building section reconstruction', arabic: 'فك وإعادة بناء الكتلة الشمالية الشرقية', problem: 'Moisture, water leaking from a neighbouring property’s pipe, and multiple structural cracks caused severe deterioration and left this section at risk of collapse.', intervention: 'The affected section was completely dismantled and faithfully reconstructed, with structural reinforcement to ensure stability.' },
    { title: 'Western wing of the eastern section', arabic: 'ترميم الجناح الغربي للجزء الشرقي', problem: 'The roofs were structurally unsafe, with deterioration also affecting the corridor roof and its structural elements.', intervention: 'Deteriorated roofs were replaced and the structure was reinforced.' },
    { title: 'First-floor ceiling restoration', arabic: 'ترميم ودرء الخطورة عن بعض فراغات أسقف الدور الأول بالجانب الشرقي', problem: 'Ceilings in several first-floor spaces were structurally unsafe.', intervention: 'Deteriorated elements were replaced, structural loads were appropriately redistributed, and the structure was reinforced.' },
  ],
  ar: [
    { title: 'إعادة بناء الكتلة الشمالية الشرقية', arabic: 'فك وإعادة بناء الكتلة الشمالية الشرقية', problem: 'تسبب تسرب المياه من ماسورة بعقار مجاور والرطوبة والشروخ الإنشائية المتعددة في تدهور شديد، مما جعل هذا الجزء معرضاً لخطر الانهيار.', intervention: 'فك الجزء المتضرر بالكامل وإعادة بنائه بأمانة، مع تدعيمه إنشائياً لضمان استقراره.' },
    { title: 'الجناح الغربي للجزء الشرقي', arabic: 'ترميم الجناح الغربي للجزء الشرقي', problem: 'كانت الأسقف غير آمنة إنشائياً، وشمل التدهور سقف الممر وعناصره الإنشائية.', intervention: 'استبدال الأسقف المتدهورة وتدعيم الهيكل الإنشائي.' },
    { title: 'ترميم أسقف بالدور الأول', arabic: 'ترميم ودرء الخطورة عن بعض فراغات أسقف الدور الأول بالجانب الشرقي', problem: 'كانت الأسقف في عدد من فراغات الدور الأول غير آمنة إنشائياً.', intervention: 'استبدال العناصر المتدهورة، وإعادة توزيع الأحمال الإنشائية على النحو المناسب، مع تدعيم الهيكل.' },
  ],
}

const northern: Photo[] = [
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/01-1203.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/01-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/01-1203.webp 1203w', alt: 'Courtyard view of Beit Al-Razzaz', altAr: 'منظر للفناء في بيت الرزاز' },
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/02-1562.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/02-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/02-1562.webp 1562w', alt: 'Historic masonry and timber detail', altAr: 'تفصيل للحجر التاريخي والعناصر الخشبية' },
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/03-1570.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/03-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/03-1570.webp 1570w', alt: 'Interior stair and restored historic fabric', altAr: 'درج داخلي وعناصر معمارية تاريخية مرممة' },
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/04-1563.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/04-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/04-1563.webp 1563w', alt: 'View upward through historic timber structure', altAr: 'منظر علوي للعناصر الخشبية التاريخية' },
  { src: '/assets/projects/portfolio/beit-al-razzaz/northern-side/05-1586.webp', srcSet: '/assets/projects/portfolio/beit-al-razzaz/northern-side/05-720.webp 720w, /assets/projects/portfolio/beit-al-razzaz/northern-side/05-1586.webp 1586w', alt: 'Restored interior stair detail', altAr: 'تفصيل لدرج داخلي مرمم' },
]

function ResponsiveImage({ image, eager = false, locale = 'en' }: { image: Photo; eager?: boolean; locale?: Locale }) {
  return <img src={assetUrl(image.src)} srcSet={image.srcSet.split(', ').map((item) => `${assetUrl(item.split(' ')[0])} ${item.split(' ')[1]}`).join(', ')} sizes="(max-width: 760px) 100vw, 50vw" alt={locale === 'ar' ? image.altAr ?? 'صورة توثيقية من بيت الرزاز' : image.alt} width="1400" height="933" loading={eager ? 'eager' : 'lazy'} decoding="async" />
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
    <figure className="beit-hero-photo"><ResponsiveImage image={northern[0]} eager locale={locale} /><figcaption>{isArabic ? 'الفناء التاريخي لبيت الرزاز' : 'The historic courtyard at Beit Al-Razzaz'}</figcaption></figure>
    <section className="beit-story" aria-labelledby="beit-story-heading">
      <div><p className="eyebrow">{isArabic ? 'قصة الترميم' : 'The restoration story'}</p><h2 id="beit-story-heading">{isArabic ? 'تثبيت المبنى وصون طابعه التاريخي' : 'Stabilising the structure. Preserving its character.'}</h2></div>
      <p>{isArabic ? 'عالج المشروع المخاطر الإنشائية في الجانب الشرقي من بيت الرزاز، مع الحفاظ على طابعه المعماري التاريخي. شملت الأعمال إعادة بناء الجزء الشمالي الشرقي المتضرر، ومعالجة الأسقف غير الآمنة، وتدعيم العناصر الإنشائية للحفاظ على استقرار المبنى.' : 'The work addressed structural risks on the eastern side of Beit Al-Razzaz while safeguarding its historic architectural character. It included faithful reconstruction of a severely deteriorated northeast section, attention to unsafe roofs and ceilings, and structural reinforcement to support the building’s stability.'}</p>
    </section>

    <section className="beit-phases" aria-labelledby="beit-phases-heading">
      <header className="beit-section-heading"><p className="eyebrow">{isArabic ? 'مراحل الترميم' : 'Restoration phases'}</p><h2 id="beit-phases-heading">{isArabic ? 'ثلاثة محاور للعمل الإنشائي' : 'Three areas of structural intervention'}</h2></header>
      {phases[locale].map((phase, index) => <article className="beit-phase" key={phase.title}><div className="beit-phase-title"><span>{String(index + 1).padStart(2, '0')}</span><h3>{isArabic ? phase.arabic : phase.title}</h3></div><div className="beit-phase-copy"><div><h4>{isArabic ? 'التحدي' : 'The challenge'}</h4><p>{phase.problem}</p></div><div><h4>{isArabic ? 'تدخل SUMMIT' : 'SUMMIT’s intervention'}</h4><p>{phase.intervention}</p></div></div></article>)}
    </section>

    <section className="beit-documentation" aria-labelledby="beit-documentation-heading">
      <header className="beit-section-heading"><p className="eyebrow">{isArabic ? 'توثيق الأعمال' : 'Restoration documentation'}</p><h2 id="beit-documentation-heading">{isArabic ? 'صور من مراحل العمل' : 'Photographs from the work'}</h2><p>{isArabic ? 'حرّك الفاصل لاستكشاف حالة العناصر المعمارية قبل أعمال الترميم وبعدها.' : 'Move the divider to explore the architectural elements before and after restoration.'}</p></header>
      <div className="beit-pair-grid">{documentaryPairs.map((item) => <article className="beit-photo-pair" key={item.id}><Comparison item={item} locale={locale} /></article>)}</div>
    </section>

    <section className="beit-northern" aria-labelledby="beit-northern-heading">
      <header className="beit-section-heading"><p className="eyebrow">{isArabic ? 'الجانب الشمالي' : 'Northern side'}</p><h2 id="beit-northern-heading">{isArabic ? 'تفاصيل معمارية تاريخية' : 'Historic architectural details'}</h2></header>
      <div className="beit-northern-grid">{northern.map((image, index) => <figure key={image.src}><ResponsiveImage image={image} eager={index === 0} locale={locale} /></figure>)}</div>
    </section>
  </div>
}
