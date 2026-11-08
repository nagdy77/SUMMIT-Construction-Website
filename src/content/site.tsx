import { createContext, useContext, type ReactNode } from 'react'
import type { Locale } from '../data/portfolio'

export const siteCopy = {
  en: {
    nav: { home: 'Home', about: 'About', services: 'Services', projects: 'Projects', clients: 'Clients & Partners', contact: 'Contact', privacy: 'Privacy Policy' },
    actions: { explore: 'Explore the project', allProjects: 'View all projects', enquire: 'Discuss a project', back: 'Back to projects', filter: 'Filter by discipline', all: 'All projects', menu: 'Open navigation', close: 'Close navigation', theme: 'Appearance', skip: 'Skip to content' },
    labels: { featured: 'Selected work', projects: 'Projects', about: 'About SUMMIT', services: 'Services', clients: 'Clients & Partners', contact: 'Contact', privacy: 'Privacy', category: 'Discipline', location: 'Location', client: 'Client', scope: 'Scope', related: 'Related projects', page: 'Page' },
    pages: {
      projects: { eyebrow: 'A considered body of work', title: 'Built with purpose.\nMade to endure.', intro: 'A selection of restoration, residential fit-out, retail fit-out, and construction work recorded in the SUMMIT portfolio.', description: 'Explore selected SUMMIT projects across restoration, residential fit-out, retail fit-out, and construction.' },
      about: { eyebrow: 'The company', title: 'Building with a sense of place.', body: 'SUMMIT Construction works across restoration, residential fit-out, retail fit-out, and construction. Its work spans heritage settings and contemporary projects, with attention to material, execution, and lasting use.', description: 'Learn about SUMMIT Construction and its work in restoration, residential fit-out, retail fit-out, and construction.' },
      services: { eyebrow: 'What we do', title: 'Four services. One considered approach.', body: 'SUMMIT Construction works across restoration, residential fit-out, retail fit-out, and construction.', description: 'Explore SUMMIT Construction services: restoration, residential fit-out, retail fit-out, and construction.' },
      clients: { eyebrow: 'Company profile', title: 'Clients & Partners', body: 'A presentation of organisation marks included in the client-supplied SUMMIT company profile. Individual client and partner classifications remain unassigned.', description: 'View the organisation marks included in the SUMMIT Construction company profile.' },
      contact: { eyebrow: 'Start a conversation', title: 'Let’s build something that lasts.', body: 'Send SUMMIT Construction a project enquiry or use the direct email alternative.', description: 'Contact SUMMIT Construction about restoration, residential fit-out, retail fit-out, or construction.' },
      privacy: { eyebrow: 'Privacy at SUMMIT', title: 'Privacy Policy', body: 'How the SUMMIT Construction website handles information when you browse or contact us.', description: 'Read the SUMMIT Construction website privacy policy covering enquiries, local preferences, analytics, and third-party services.' },
    },
    serviceDetails: [
      { slug: 'restoration', title: 'Restoration', desc: 'Heritage work spanning marble restoration, structural repair, adaptive reuse, rehabilitation, and specialist dewatering systems.', scope: ['Heritage restoration', 'Structural repair', 'Rehabilitation'] },
      { slug: 'renovation', title: 'Residential Fit-Out', desc: 'Residential finishing and turnkey fit-out work represented in the SUMMIT portfolio.', scope: ['Residential fit-out', 'Finishing works', 'Turnkey delivery'] },
      { slug: 'fit-out', title: 'Retail Fit-Out', desc: 'Retail fit-out work represented in the SUMMIT portfolio, including finishing and coordinated MEP scope.', scope: ['Retail fit-out', 'Finishing works', 'Coordinated MEP scope'] },
      { slug: 'construction', title: 'Construction', desc: 'Construction delivery across administrative and residential settings, including marble installation, full finishing, and external finishing works.', scope: ['Marble installation', 'Full finishing', 'External finishes'] },
    ],
    home: { language: 'العربية', skip: 'Skip to content' },
  },
  ar: {
    nav: { home: 'الرئيسية', about: 'من نحن', services: 'خدماتنا', projects: 'المشروعات', clients: 'العملاء والشركاء', contact: 'تواصل معنا', privacy: 'سياسة الخصوصية' },
    actions: { explore: 'استكشف المشروع', allProjects: 'عرض جميع المشروعات', enquire: 'ناقش مشروعك', back: 'العودة إلى المشروعات', filter: 'التصفية حسب التخصص', all: 'كل المشروعات', menu: 'فتح القائمة', close: 'إغلاق القائمة', theme: 'المظهر', skip: 'انتقل إلى المحتوى' },
    labels: { featured: 'أعمال مختارة', projects: 'المشروعات', about: 'عن سوميت', services: 'الخدمات', clients: 'العملاء والشركاء', contact: 'تواصل', privacy: 'الخصوصية', category: 'التخصص', location: 'الموقع', client: 'العميل', scope: 'نطاق العمل', related: 'مشروعات ذات صلة', page: 'صفحة' },
    pages: {
      projects: { eyebrow: 'سجل من الأعمال المدروسة', title: 'أُنجزت بهدف.\nوصُممت لتدوم.', intro: 'مجموعة من أعمال الترميم والتشطيبات السكنية والتجارية والإنشاءات الواردة في سجل مشروعات سوميت.', description: 'استكشف مشروعات سوميت المختارة في الترميم والتشطيبات السكنية والتجارية والإنشاءات.' },
      about: { eyebrow: 'الشركة', title: 'نبني مع مراعاة المكان.', body: 'تعمل شركة سوميت للإنشاءات في الترميم والتشطيبات السكنية والتشطيبات التجارية والإنشاءات. وتمتد أعمالها بين المواقع التراثية والمشروعات المعاصرة مع الاهتمام بالخامات والتنفيذ والاستدامة.', description: 'تعرف على شركة سوميت للإنشاءات وأعمالها في الترميم والتشطيبات السكنية والتجارية والإنشاءات.' },
      services: { eyebrow: 'مجالات عملنا', title: 'أربع خدمات. ونهج مدروس.', body: 'تعمل سوميت للإنشاءات في الترميم والتشطيبات السكنية والتشطيبات التجارية والإنشاءات.', description: 'تعرف على خدمات سوميت للإنشاءات في الترميم والتشطيبات السكنية والتشطيبات التجارية والإنشاءات.' },
      clients: { eyebrow: 'الملف التعريفي', title: 'العملاء والشركاء', body: 'عرض لعلامات المؤسسات الواردة في الملف التعريفي لشركة سوميت والمقدم من العميل. ولم تُصنف كل علامة بشكل منفصل كعميل أو شريك.', description: 'شاهد علامات المؤسسات الواردة في الملف التعريفي لشركة سوميت للإنشاءات.' },
      contact: { eyebrow: 'لنبدأ حوارًا', title: 'لنبنِ شيئًا يدوم.', body: 'أرسل استفسار مشروع إلى سوميت للإنشاءات أو استخدم البريد الإلكتروني المباشر كخيار بديل.', description: 'تواصل مع سوميت للإنشاءات بشأن الترميم أو التشطيبات السكنية أو التجارية أو الإنشاءات.' },
      privacy: { eyebrow: 'الخصوصية لدى سوميت', title: 'سياسة الخصوصية', body: 'كيفية تعامل موقع سوميت للإنشاءات مع المعلومات عند التصفح أو التواصل معنا.', description: 'اقرأ سياسة خصوصية موقع سوميت للإنشاءات المتعلقة بالاستفسارات والتفضيلات المحلية والتحليلات وخدمات الجهات الخارجية.' },
    },
    serviceDetails: [
      { slug: 'restoration', title: 'الترميم', desc: 'أعمال تراثية تشمل ترميم الرخام والإصلاح الإنشائي وإعادة الاستخدام والتأهيل وأنظمة خفض المياه المتخصصة.', scope: ['ترميم التراث', 'الإصلاح الإنشائي', 'التأهيل'] },
      { slug: 'renovation', title: 'التشطيبات السكنية', desc: 'أعمال التشطيب السكني والتسليم المتكامل الممثلة في محفظة أعمال سوميت.', scope: ['التشطيب السكني', 'أعمال التشطيب', 'التسليم المتكامل'] },
      { slug: 'fit-out', title: 'التشطيبات التجارية', desc: 'أعمال التشطيب التجاري ومتاجر التجزئة الممثلة في محفظة أعمال سوميت، بما يشمل التشطيبات وتنسيق الأعمال الكهروميكانيكية.', scope: ['التشطيب التجاري', 'تشطيب متاجر التجزئة', 'تنسيق الأعمال الكهروميكانيكية'] },
      { slug: 'construction', title: 'الإنشاءات', desc: 'تنفيذ أعمال الإنشاء في البيئات الإدارية والسكنية، بما يشمل تركيب الرخام والتشطيبات الكاملة والتشطيبات الخارجية.', scope: ['تركيب الرخام', 'التشطيبات الكاملة', 'التشطيبات الخارجية'] },
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
      { category: 'Restoration', headline: 'We Build the Future with the Spirit of Heritage.', lines: ['We Build the Future', 'with the Spirit', 'of Heritage.'], cta: 'Discover our story', alt: 'Restored pool courtyard at Mohamed Ali Palace' },
      { category: 'Construction', headline: 'Monumental Ideas. Precisely Built.', lines: ['Monumental Ideas.', 'Precisely Built.'], cta: 'Explore our services', alt: 'Administrative building under construction in the New Capital Administrations District' },
      { category: 'Residential Fit-Out', headline: 'Spaces Designed Around the Way You Live.', lines: ['Spaces Designed', 'Around the Way', 'You Live.'], cta: 'View selected work', alt: 'Completed marble kitchen at Lakeview Residence' },
      { category: 'Retail Fit-Out', headline: 'Interiors Where Material Becomes Atmosphere.', lines: ['Interiors Where', 'Material Becomes', 'Atmosphere.'], cta: 'Start a conversation', alt: 'Completed Desigual retail fit-out' },
    ],
    about: { eyebrow: '01 · About', title: ['We Build the Future', 'with the Spirit', 'of Heritage.'], established: 'Established', origin: 'Egypt', founders: 'Ahmed Elesawy & Mohamed Haron', strapline: 'Egyptian in origin. Future-facing in form.', body: 'SUMMIT Construction is an Egyptian construction company established in 2018 by Ahmed Elesawy and Mohamed Haron. Its services span restoration, residential fit-out, retail fit-out, and construction.' },
    services: { eyebrow: '02 · Services', title: 'Four services. One considered approach.', description: 'SUMMIT Construction works across restoration, residential fit-out, retail fit-out, and construction.', formal: 'Service', specialization: 'Four connected services', cards: [
      { name: 'Restoration', description: 'Heritage work spanning marble restoration, structural repair, adaptive reuse, rehabilitation, and specialist dewatering systems.', scope: 'Heritage restoration · Structural repair · Rehabilitation' },
      { name: 'Residential Fit-Out', description: 'Residential finishing and turnkey fit-out work represented in the SUMMIT portfolio.', scope: 'Residential fit-out · Finishing works · Turnkey delivery' },
      { name: 'Retail Fit-Out', description: 'Retail fit-out work represented in the SUMMIT portfolio, including finishing and coordinated MEP scope.', scope: 'Retail fit-out · Finishing works · Coordinated MEP scope' },
      { name: 'Construction', description: 'Construction delivery across administrative and residential settings, including marble installation, full finishing, and external finishing works.', scope: 'Marble installation · Full finishing · External finishes' },
    ] },
    featured: { eyebrow: '03 · Selected projects', title: 'Four expressions of one exacting practice.', description: 'A focused preview of SUMMIT Construction’s work across restoration, construction, residential fit-out, and retail fit-out.', explore: 'Explore the work', note: 'Four projects, seen through their architecture, materials, and interior details.', all: 'View all projects' },
    story: { eyebrow: 'Architectural perspective', title: ['Geometry gives a place its', 'presence.'], body: 'Projects are shaped through proportion, material, and light — from the language of heritage to the precision of contemporary construction.', caption: 'SUMMIT project photography' },
    material: { title: ['The quiet power of', 'detail.'], body: 'Heritage, structure, and the finishing touch. Three perspectives that meet in the spaces we build.', label: 'A study in materials', caption: 'Light / texture / form' },
    contact: { eyebrow: 'Contact SUMMIT', title: ['Let’s build something', 'that lasts.'], body: 'For restoration, residential fit-out, retail fit-out, or construction, bring the next chapter of your project into focus with SUMMIT Construction.', cta: 'Start a conversation' },
  },
  ar: {
    skip: 'انتقل إلى المحتوى',
    hero: [
      { category: 'الترميم', headline: 'نبني المستقبل بروح التراث.', lines: ['نبني المستقبل', 'بروح', 'التراث.'], cta: 'اكتشف حكايتنا', alt: 'فناء حمام السباحة المرمم في قصر محمد علي' },
      { category: 'الإنشاءات', headline: 'أفكار راسخة. تنفيذ دقيق.', lines: ['أفكار راسخة.', 'تنفيذ دقيق.'], cta: 'استكشف خدماتنا', alt: 'مبنى إداري قيد الإنشاء في حي الوزارات بالعاصمة الإدارية الجديدة' },
      { category: 'التشطيبات السكنية', headline: 'مساحات تتشكل حول أسلوب حياتك.', lines: ['مساحات تتشكل', 'حول أسلوب', 'حياتك.'], cta: 'شاهد أعمالنا', alt: 'مطبخ رخامي مكتمل في ليك فيو ريزيدنس' },
      { category: 'التشطيبات التجارية', headline: 'حيث تتحول الخامات إلى أجواء.', lines: ['حيث تتحول', 'الخامات إلى', 'أجواء.'], cta: 'ابدأ حوارًا', alt: 'تشطيبات متجر ديسيجوال المكتملة' },
    ],
    about: { eyebrow: '01 · من نحن', title: ['نبني المستقبل', 'بروح', 'التراث.'], established: 'تأسست', origin: 'مصر', founders: 'أحمد العيسوي ومحمد هارون', strapline: 'جذور مصرية. ورؤية للمستقبل.', body: 'سوميت للإنشاءات شركة مصرية تأسست عام 2018 على يد أحمد العيسوي ومحمد هارون. وتشمل خدماتها الترميم والتشطيبات السكنية والتشطيبات التجارية والإنشاءات.' },
    services: { eyebrow: '02 · خدماتنا', title: 'أربع خدمات. ونهج مدروس.', description: 'تعمل سوميت للإنشاءات في الترميم والتشطيبات السكنية والتشطيبات التجارية والإنشاءات.', formal: 'خدمة', specialization: 'أربع خدمات مترابطة', cards: [
      { name: 'الترميم', description: 'أعمال تراثية تشمل ترميم الرخام والإصلاح الإنشائي وإعادة الاستخدام والتأهيل وأنظمة خفض المياه المتخصصة.', scope: 'ترميم التراث · الإصلاح الإنشائي · التأهيل' },
      { name: 'التشطيبات السكنية', description: 'أعمال التشطيب السكني والتسليم المتكامل الممثلة في محفظة أعمال سوميت.', scope: 'التشطيب السكني · أعمال التشطيب · التسليم المتكامل' },
      { name: 'التشطيبات التجارية', description: 'أعمال تشطيب متاجر التجزئة الممثلة في محفظة أعمال سوميت، بما يشمل التشطيبات وتنسيق الأعمال الكهروميكانيكية.', scope: 'التشطيب التجاري · أعمال التشطيب · تنسيق الأعمال الكهروميكانيكية' },
      { name: 'الإنشاءات', description: 'تنفيذ أعمال الإنشاء في البيئات الإدارية والسكنية، بما يشمل تركيب الرخام والتشطيبات الكاملة والخارجية.', scope: 'تركيب الرخام · التشطيبات الكاملة · التشطيبات الخارجية' },
    ] },
    featured: { eyebrow: '03 · مشروعات مختارة', title: 'أربعة تعبيرات عن ممارسة دقيقة.', description: 'لمحة عن أعمال سوميت للإنشاءات في الترميم والإنشاءات والتشطيبات السكنية والتجارية.', explore: 'استكشف الأعمال', note: 'أربعة مشروعات من خلال عمارتها وخاماتها وتفاصيلها الداخلية.', all: 'عرض جميع المشروعات' },
    story: { eyebrow: 'رؤية معمارية', title: ['الهندسة تمنح المكان', 'حضوره.'], body: 'تتشكل المشروعات عبر التناسب والخامات والضوء، من لغة التراث إلى دقة الإنشاء المعاصر.', caption: 'صور من مشروعات سوميت' },
    material: { title: ['قوة التفاصيل', 'الهادئة.'], body: 'التراث والإنشاء واللمسة النهائية؛ ثلاثة أبعاد تلتقي في المساحات التي ننفذها.', label: 'دراسة في الخامات', caption: 'ضوء / ملمس / تكوين' },
    contact: { eyebrow: 'تواصل مع سوميت', title: ['لنبنِ شيئًا', 'يدوم.'], body: 'في الترميم أو التشطيبات السكنية أو التجارية أو الإنشاءات، ابدأ الفصل التالي من مشروعك مع سوميت للإنشاءات.', cta: 'ابدأ حوارًا' },
  },
} as const

export const useHomeCopy = () => { const locale = useLocale(); return homeCopy[locale] }

