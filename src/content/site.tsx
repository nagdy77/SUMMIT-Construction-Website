import { createContext, useContext, type ReactNode } from 'react'
import type { Locale } from '../data/portfolio'

export const siteCopy = {
  en: {
    nav: { home: 'Home', about: 'About', services: 'Services', projects: 'Projects', clients: 'Clients & Partners', downloads: 'Downloads', contact: 'Contact', privacy: 'Privacy' },
    actions: { explore: 'Explore the project', allProjects: 'View all projects', enquire: 'Discuss a project', download: 'Download company profile', back: 'Back to projects', filter: 'Filter by discipline', all: 'All projects', menu: 'Open navigation', close: 'Close navigation', theme: 'Appearance', skip: 'Skip to content' },
    labels: { featured: 'Selected work', projects: 'Projects', about: 'About SUMMIT', services: 'Services', clients: 'Clients & Partners', downloads: 'Downloads', contact: 'Contact', privacy: 'Privacy', category: 'Discipline', location: 'Location', client: 'Client', scope: 'Scope', related: 'Related projects', page: 'Page' },
    pages: {
      projects: { eyebrow: 'A considered body of work', title: 'Built with purpose.\nMade to endure.', intro: 'A selection of restoration, construction, and finishing work recorded in the SUMMIT portfolio.', description: 'Explore selected SUMMIT projects across heritage restoration, contemporary construction, and residential finishing.' },
      about: { eyebrow: 'The company', title: 'Building with a sense of place.', body: 'SUMMIT Construction brings together construction, restoration, and renovation. Its work spans heritage settings and contemporary projects, with attention to material, execution, and lasting use.', description: 'Learn about SUMMIT Construction and its work in construction, restoration, and renovation.' },
      services: { eyebrow: 'What we do', title: 'Three disciplines. One considered approach.', body: 'SUMMIT Construction’s formal services are construction, restoration, and renovation. Its portfolio also includes residential and retail fit-out specializations.', description: 'Explore SUMMIT Construction services: construction, restoration, renovation, and fit-out specializations.' },
      clients: { eyebrow: 'Company profile', title: 'Clients & Partners', body: 'A presentation of organisation marks included in the client-supplied SUMMIT company profile. Individual client and partner classifications remain unassigned.', description: 'View the organisation marks included in the SUMMIT Construction company profile.' },
      downloads: { eyebrow: 'Company documents', title: 'Downloads', body: 'Company information for review and reference.', description: 'Download the SUMMIT Construction company profile.' },
      contact: { eyebrow: 'Start a conversation', title: 'Let’s build something that lasts.', body: 'Send SUMMIT Construction a project enquiry or use the direct email alternative.', description: 'Contact SUMMIT Construction about construction, heritage restoration, residential fit-out, or commercial fit-out.' },
      privacy: { eyebrow: 'Website information', title: 'Privacy', body: 'This website stores limited interface preferences locally. Enquiry delivery uses a configured external form provider only after submission.', description: 'Privacy information for the SUMMIT Construction website and enquiry form.' },
    },
    serviceDetails: [
      { slug: 'construction', title: 'Construction', desc: 'Construction delivery across administrative and residential settings, including marble installation, full finishing, and external finishing works.', scope: ['Marble installation', 'Full finishing', 'External finishes'] },
      { slug: 'restoration', title: 'Heritage Restoration', desc: 'Heritage work spanning marble restoration, structural repair, adaptive reuse, rehabilitation, and specialist dewatering systems.', scope: ['Heritage restoration', 'Structural repair', 'Rehabilitation'] },
      { slug: 'renovation', title: 'Residential Fit-Out', desc: 'Residential finishing and turnkey fit-out work represented in the SUMMIT portfolio.', scope: ['Residential fit-out', 'Finishing works', 'Turnkey delivery'] },
      { slug: 'fit-out', title: 'Commercial Fit-Out', desc: 'Commercial and retail fit-out work represented in the SUMMIT portfolio, including finishing and coordinated MEP scope.', scope: ['Commercial fit-out', 'Retail fit-out', 'Coordinated MEP scope'] },
    ],
    home: { language: 'العربية', skip: 'Skip to content' },
  },
  ar: {
    nav: { home: 'الرئيسية', about: 'من نحن', services: 'خدماتنا', projects: 'المشروعات', clients: 'العملاء والشركاء', downloads: 'التنزيلات', contact: 'تواصل معنا', privacy: 'الخصوصية' },
    actions: { explore: 'استكشف المشروع', allProjects: 'عرض جميع المشروعات', enquire: 'ناقش مشروعك', download: 'تنزيل ملف الشركة', back: 'العودة إلى المشروعات', filter: 'التصفية حسب التخصص', all: 'كل المشروعات', menu: 'فتح القائمة', close: 'إغلاق القائمة', theme: 'المظهر', skip: 'انتقل إلى المحتوى' },
    labels: { featured: 'أعمال مختارة', projects: 'المشروعات', about: 'عن سوميت', services: 'الخدمات', clients: 'العملاء والشركاء', downloads: 'التنزيلات', contact: 'تواصل', privacy: 'الخصوصية', category: 'التخصص', location: 'الموقع', client: 'العميل', scope: 'نطاق العمل', related: 'مشروعات ذات صلة', page: 'صفحة' },
    pages: {
      projects: { eyebrow: 'سجل من الأعمال المدروسة', title: 'أُنجزت بهدف.\nوصُممت لتدوم.', intro: 'مجموعة من أعمال الترميم والإنشاء والتشطيبات الواردة في سجل مشروعات سوميت.', description: 'استكشف مشروعات سوميت المختارة في ترميم التراث والإنشاءات والتشطيبات السكنية.' },
      about: { eyebrow: 'الشركة', title: 'نبني مع مراعاة المكان.', body: 'تجمع شركة سوميت للإنشاءات بين الإنشاء والترميم والتجديد. وتمتد أعمالها بين المواقع التراثية والمشروعات المعاصرة مع الاهتمام بالخامات والتنفيذ والاستدامة.', description: 'تعرف على شركة سوميت للإنشاءات وأعمالها في الإنشاء والترميم والتجديد.' },
      services: { eyebrow: 'مجالات عملنا', title: 'ثلاثة تخصصات. ونهج مدروس.', body: 'تتمثل خدمات سوميت للإنشاءات في الإنشاء والترميم والتجديد. كما تشمل محفظة أعمالها تخصصات التشطيب السكني والتجاري.', description: 'تعرف على خدمات سوميت للإنشاءات في الإنشاء والترميم والتجديد والتشطيبات.' },
      clients: { eyebrow: 'الملف التعريفي', title: 'العملاء والشركاء', body: 'عرض لعلامات المؤسسات الواردة في الملف التعريفي لشركة سوميت والمقدم من العميل. ولم تُصنف كل علامة بشكل منفصل كعميل أو شريك.', description: 'شاهد علامات المؤسسات الواردة في الملف التعريفي لشركة سوميت للإنشاءات.' },
      downloads: { eyebrow: 'وثائق الشركة', title: 'التنزيلات', body: 'معلومات الشركة للمراجعة والاطلاع.', description: 'تنزيل الملف التعريفي لشركة سوميت للإنشاءات.' },
      contact: { eyebrow: 'لنبدأ حوارًا', title: 'لنبنِ شيئًا يدوم.', body: 'أرسل استفسار مشروع إلى سوميت للإنشاءات أو استخدم البريد الإلكتروني المباشر كخيار بديل.', description: 'تواصل مع سوميت للإنشاءات بشأن الإنشاء أو ترميم التراث أو التشطيبات السكنية أو التجارية.' },
      privacy: { eyebrow: 'معلومات الموقع', title: 'الخصوصية', body: 'يحفظ هذا الموقع قدرًا محدودًا من تفضيلات الواجهة محليًا. ويستخدم إرسال الاستفسارات مزود نماذج خارجيًا بعد إتمام الإرسال فقط.', description: 'معلومات الخصوصية لموقع سوميت للإنشاءات ونموذج الاستفسار.' },
    },
    serviceDetails: [
      { slug: 'construction', title: 'الإنشاءات', desc: 'تنفيذ أعمال الإنشاء في البيئات الإدارية والسكنية، بما يشمل تركيب الرخام والتشطيبات الكاملة والتشطيبات الخارجية.', scope: ['تركيب الرخام', 'التشطيبات الكاملة', 'التشطيبات الخارجية'] },
      { slug: 'restoration', title: 'ترميم التراث', desc: 'أعمال تراثية تشمل ترميم الرخام والإصلاح الإنشائي وإعادة الاستخدام والتأهيل وأنظمة خفض المياه المتخصصة.', scope: ['ترميم التراث', 'الإصلاح الإنشائي', 'التأهيل'] },
      { slug: 'renovation', title: 'التشطيبات السكنية', desc: 'أعمال التشطيب السكني والتسليم المتكامل الممثلة في محفظة أعمال سوميت.', scope: ['التشطيب السكني', 'أعمال التشطيب', 'التسليم المتكامل'] },
      { slug: 'fit-out', title: 'التشطيبات التجارية', desc: 'أعمال التشطيب التجاري ومتاجر التجزئة الممثلة في محفظة أعمال سوميت، بما يشمل التشطيبات وتنسيق الأعمال الكهروميكانيكية.', scope: ['التشطيب التجاري', 'تشطيب متاجر التجزئة', 'تنسيق الأعمال الكهروميكانيكية'] },
    ],
    home: { language: 'English', skip: 'انتقل إلى المحتوى' },
  },
} as const

export type SiteCopy = typeof siteCopy.en
const LocaleContext = createContext<{ locale: Locale; path: string }>({ locale: 'en', path: '/en/' })
export const LocaleProvider = ({ locale, path, children }: { locale: Locale; path: string; children: ReactNode }) => <LocaleContext.Provider value={{ locale, path }}>{children}</LocaleContext.Provider>
export const useLocale = () => useContext(LocaleContext).locale
export const useCurrentPath = () => useContext(LocaleContext).path
export const useCopy = () => { const locale = useLocale(); return siteCopy[locale] }

export const homeCopy = {
  en: {
    skip: 'Skip to content',
    hero: [
      { category: 'Heritage Restoration', headline: 'We Build the Future with the Spirit of Heritage.', lines: ['We Build the Future', 'with the Spirit', 'of Heritage.'], cta: 'Discover our story', alt: 'Restored marble hall at Mohamed Ali Palace' },
      { category: 'Construction', headline: 'Monumental Ideas. Precisely Built.', lines: ['Monumental Ideas.', 'Precisely Built.'], cta: 'Explore our services', alt: 'SUMMIT workers installing overhead services at the New Capital Downtown Mall site' },
      { category: 'Residential Fit-Out', headline: 'Spaces Designed Around the Way You Live.', lines: ['Spaces Designed', 'Around the Way', 'You Live.'], cta: 'View selected work', alt: 'Residential villas photographed at Oriana CFC' },
      { category: 'Retail Fit-Out', headline: 'Interiors Where Material Becomes Atmosphere.', lines: ['Interiors Where', 'Material Becomes', 'Atmosphere.'], cta: 'Start a conversation', alt: 'Interior ceiling installation in progress at Marvel' },
    ],
    about: { eyebrow: '01 · About', title: ['We Build the Future', 'with the Spirit', 'of Heritage.'], established: 'Established', origin: 'Egypt', founders: 'Ahmed Elesawy & Mohamed Haron', strapline: 'Egyptian in origin. Future-facing in form.', body: 'SUMMIT Construction is an Egyptian construction company established in 2018 by Ahmed Elesawy and Mohamed Haron. Its formal services are construction, restoration, and renovation.' },
    services: { eyebrow: '02 · Services', title: 'Three disciplines. One considered approach.', description: 'SUMMIT Construction’s formal services are construction, restoration, and renovation. Its portfolio also includes residential and retail fit-out specializations.', formal: 'Formal service', specialization: 'Portfolio specializations', cards: [
      { name: 'Construction', description: 'Construction delivery across administrative and residential settings, including marble installation, full finishing, and external finishing works.', scope: 'Marble installation · Full finishing · External finishes' },
      { name: 'Restoration', description: 'Heritage work spanning marble restoration, structural repair, adaptive reuse, rehabilitation, and specialist dewatering systems.', scope: 'Heritage restoration · Structural repair · Rehabilitation' },
      { name: 'Renovation', description: 'Renovation and finishing work shaped for heritage, residential, and commercial environments, with coordinated architectural and MEP scopes.', scope: 'Residential fit-out · Retail fit-out · Finishing works' },
    ] },
    featured: { eyebrow: '03 · Selected projects', title: 'Three expressions of one exacting practice.', description: 'A focused preview of SUMMIT Construction’s work across heritage restoration, construction, and residential fit-out.', explore: 'Explore the work', note: 'Three projects, seen through their architecture, materials, and interior details.', all: 'View all projects' },
    story: { eyebrow: 'Architectural perspective', title: ['Geometry gives a place its', 'presence.'], body: 'Projects are shaped through proportion, material, and light — from the language of heritage to the precision of contemporary construction.', caption: 'SUMMIT project photography' },
    material: { title: ['The quiet power of', 'detail.'], body: 'Heritage, structure, and the finishing touch. Three perspectives that meet in the spaces we build.', label: 'A study in materials', caption: 'Light / texture / form' },
    contact: { eyebrow: 'Contact SUMMIT', title: ['Let’s build something', 'that lasts.'], body: 'Construction, restoration, or renovation — bring the next chapter of your project into focus with SUMMIT Construction.', cta: 'Start a conversation' },
  },
  ar: {
    skip: 'انتقل إلى المحتوى',
    hero: [
      { category: 'ترميم التراث', headline: 'نبني المستقبل بروح التراث.', lines: ['نبني المستقبل', 'بروح', 'التراث.'], cta: 'اكتشف حكايتنا', alt: 'قاعة رخامية مرممة في قصر محمد علي' },
      { category: 'الإنشاءات', headline: 'أفكار راسخة. تنفيذ دقيق.', lines: ['أفكار راسخة.', 'تنفيذ دقيق.'], cta: 'استكشف خدماتنا', alt: 'أعمال تركيب الخدمات العلوية في موقع مول داون تاون بالعاصمة الجديدة' },
      { category: 'التشطيبات السكنية', headline: 'مساحات تتشكل حول أسلوب حياتك.', lines: ['مساحات تتشكل', 'حول أسلوب', 'حياتك.'], cta: 'شاهد أعمالنا', alt: 'فلل سكنية في أوريانا سي إف سي' },
      { category: 'التشطيبات التجارية', headline: 'حيث تتحول الخامات إلى أجواء.', lines: ['حيث تتحول', 'الخامات إلى', 'أجواء.'], cta: 'ابدأ حوارًا', alt: 'تركيب سقف داخلي قيد التنفيذ في مارفل' },
    ],
    about: { eyebrow: '01 · من نحن', title: ['نبني المستقبل', 'بروح', 'التراث.'], established: 'تأسست', origin: 'مصر', founders: 'أحمد العيسوي ومحمد هارون', strapline: 'جذور مصرية. ورؤية للمستقبل.', body: 'سوميت للإنشاءات شركة مصرية تأسست عام 2018 على يد أحمد العيسوي ومحمد هارون. وتشمل خدماتها الإنشاء والترميم والتجديد.' },
    services: { eyebrow: '02 · خدماتنا', title: 'ثلاثة تخصصات. ونهج مدروس.', description: 'تشمل خدمات سوميت للإنشاءات الإنشاء والترميم والتجديد. كما تضم محفظة أعمالها تخصصات التشطيب السكني والتجاري.', formal: 'خدمة أساسية', specialization: 'تخصصات ضمن محفظة الأعمال', cards: [
      { name: 'الإنشاءات', description: 'تنفيذ أعمال الإنشاء في البيئات الإدارية والسكنية، بما يشمل تركيب الرخام والتشطيبات الكاملة والخارجية.', scope: 'تركيب الرخام · التشطيبات الكاملة · التشطيبات الخارجية' },
      { name: 'الترميم', description: 'أعمال تراثية تشمل ترميم الرخام والإصلاح الإنشائي وإعادة الاستخدام والتأهيل وأنظمة خفض المياه المتخصصة.', scope: 'ترميم التراث · الإصلاح الإنشائي · التأهيل' },
      { name: 'التجديد', description: 'أعمال التجديد والتشطيب في البيئات التراثية والسكنية والتجارية مع تنسيق النطاقات المعمارية والكهروميكانيكية.', scope: 'التشطيب السكني · التشطيب التجاري · أعمال التشطيب' },
    ] },
    featured: { eyebrow: '03 · مشروعات مختارة', title: 'ثلاثة تعبيرات عن ممارسة دقيقة.', description: 'لمحة عن أعمال سوميت للإنشاءات في ترميم التراث والإنشاءات والتشطيبات السكنية.', explore: 'استكشف الأعمال', note: 'ثلاثة مشروعات من خلال عمارتها وخاماتها وتفاصيلها الداخلية.', all: 'عرض جميع المشروعات' },
    story: { eyebrow: 'رؤية معمارية', title: ['الهندسة تمنح المكان', 'حضوره.'], body: 'تتشكل المشروعات عبر التناسب والخامات والضوء، من لغة التراث إلى دقة الإنشاء المعاصر.', caption: 'صور من مشروعات سوميت' },
    material: { title: ['قوة التفاصيل', 'الهادئة.'], body: 'التراث والإنشاء واللمسة النهائية؛ ثلاثة أبعاد تلتقي في المساحات التي ننفذها.', label: 'دراسة في الخامات', caption: 'ضوء / ملمس / تكوين' },
    contact: { eyebrow: 'تواصل مع سوميت', title: ['لنبنِ شيئًا', 'يدوم.'], body: 'في الإنشاء أو الترميم أو التجديد، ابدأ الفصل التالي من مشروعك مع سوميت للإنشاءات.', cta: 'ابدأ حوارًا' },
  },
} as const

export const useHomeCopy = () => { const locale = useLocale(); return homeCopy[locale] }

