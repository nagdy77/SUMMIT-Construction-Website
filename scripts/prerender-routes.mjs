import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputRoot = path.join(root, 'dist')
const defaultSiteUrl = 'https://nagdy77.github.io/SUMMIT-Construction-Website'
const siteUrl = (process.env.SITE_URL?.trim() || defaultSiteUrl).replace(/\/$/, '')
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim()
const server = await createServer({ configFile: path.join(root, 'vite.config.ts'), root, appType: 'custom', server: { middlewareMode: true } })

try {
  const { renderRoute } = await server.ssrLoadModule('/src/entry-server.tsx')
  const { staticRoutePaths, indexableRoutePaths } = await server.ssrLoadModule('/src/lib/static-routes.ts')
  const { siteCopy } = await server.ssrLoadModule('/src/content/site.tsx')
  const { publishedProjects } = await server.ssrLoadModule('/src/data/portfolio.ts')
  const template = await readFile(path.join(outputRoot, 'index.html'), 'utf8')
  const indexable = new Set(indexableRoutePaths)

  const serviceImages = {
    construction: '/assets/projects/portfolio/new-capital-administrations-district/02-1564.webp',
    restoration: '/assets/projects/portfolio/mohamed-ali-palace/03-1565.webp',
    renovation: '/assets/projects/portfolio/lakeview-residence/01-1570.webp',
    'fit-out': '/assets/projects/portfolio/desigual/01-1600.webp',
  }
  const pageImages = {
    about: '/assets/projects/portfolio/beit-al-razzaz/northern-side/03-1570.webp',
    services: serviceImages.construction,
    projects: serviceImages.restoration,
    contact: '/assets/projects/portfolio/oriana-cairo-festival-city/04-1573.webp',
    clients: '/assets/projects/featured/real-media/story-wide-wide-1916.webp',
  }
  const defaultImage = '/assets/projects/portfolio/mohamed-ali-palace/03-1565.webp'

  const pageSeo = {
    en: {
      home: {
        title: 'Construction, Restoration & Fit-Out in Egypt | SUMMIT',
        description: 'SUMMIT Construction provides construction, heritage restoration, residential fit-out and retail fit-out services in Egypt.',
      },
      about: {
        title: 'About SUMMIT Construction | Egyptian Construction Company',
        description: 'Learn about SUMMIT Construction, an Egyptian company established in 2018 and working across construction, restoration and fit-out services.',
      },
      services: {
        title: 'Construction, Restoration & Fit-Out Services | SUMMIT',
        description: 'Explore SUMMIT services in Egypt across construction, heritage restoration, residential fit-out and retail fit-out.',
      },
      projects: {
        title: 'Construction & Restoration Projects in Egypt | SUMMIT',
        description: 'Explore selected SUMMIT projects in Egypt across construction, heritage restoration, residential fit-out and retail fit-out.',
      },
      clients: {
        title: 'Clients & Partners | SUMMIT Construction',
        description: 'View SUMMIT Construction clients and partners, presented according to their confirmed classification.',
      },
      contact: {
        title: 'Contact SUMMIT Construction | Request a Quote',
        description: 'Contact SUMMIT Construction on WhatsApp to discuss your project requirements and request a quotation.',
      },
      privacy: {
        title: 'Privacy Policy | SUMMIT Construction',
        description: 'Read the SUMMIT Construction website privacy policy covering enquiries, local preferences, analytics and third-party services.',
      },
    },
    ar: {
      home: {
        title: 'سوميت للإنشاءات | مقاولات وترميم وتشطيبات في مصر',
        description: 'تقدم سوميت للإنشاءات خدمات المقاولات وترميم المباني التراثية والتشطيبات السكنية والتجارية في مصر.',
      },
      about: {
        title: 'عن سوميت | شركة إنشاءات وترميم مصرية',
        description: 'تعرف على سوميت للإنشاءات، شركة مصرية تأسست عام 2018 وتعمل في الإنشاء والترميم والتشطيبات السكنية والتجارية.',
      },
      services: {
        title: 'خدمات الإنشاء والترميم والتشطيبات | سوميت',
        description: 'تعرف على خدمات سوميت في مصر في الإنشاءات وترميم المباني التراثية والتشطيبات السكنية والتجارية.',
      },
      projects: {
        title: 'مشروعات الإنشاء والترميم والتشطيبات | سوميت',
        description: 'استكشف مشروعات سوميت المختارة في مصر في الإنشاء والترميم والتشطيبات السكنية والتجارية.',
      },
      clients: {
        title: 'عملاء وشركاء سوميت للإنشاءات',
        description: 'شاهد عملاء وشركاء سوميت للإنشاءات وفق تصنيفهم المؤكد.',
      },
      contact: {
        title: 'تواصل مع سوميت للإنشاءات | اطلب عرض سعر',
        description: 'تواصل مع سوميت للإنشاءات عبر واتساب لمناقشة متطلبات مشروعك وطلب عرض سعر.',
      },
      privacy: {
        title: 'سياسة الخصوصية | سوميت للإنشاءات',
        description: 'اقرأ سياسة خصوصية موقع سوميت للإنشاءات المتعلقة بالاستفسارات والتفضيلات المحلية والتحليلات وخدمات الجهات الخارجية.',
      },
    },
  }

  const serviceSeo = {
    en: {
      construction: {
        title: 'Construction Services in Egypt | SUMMIT Construction',
        description: 'SUMMIT delivers construction, marble installation and full internal and external finishing for administrative and residential projects in Egypt.',
      },
      restoration: {
        title: 'Heritage Restoration in Egypt | SUMMIT Construction',
        description: 'SUMMIT provides heritage restoration in Egypt, including marble restoration, structural repair, adaptive reuse and rehabilitation.',
      },
      renovation: {
        title: 'Residential Fit-Out in Egypt | SUMMIT Construction',
        description: 'SUMMIT delivers residential finishing and turnkey fit-out services in Egypt, with coordinated execution and attention to detail.',
      },
      'fit-out': {
        title: 'Retail Fit-Out in Egypt | SUMMIT Construction',
        description: 'SUMMIT delivers retail fit-out in Egypt, including finishing works and coordinated MEP scope for stores and commercial interiors.',
      },
    },
    ar: {
      construction: {
        title: 'خدمات الإنشاءات في مصر | سوميت للإنشاءات',
        description: 'تنفذ سوميت أعمال الإنشاء وتركيب الرخام والتشطيبات الداخلية والخارجية للمشروعات الإدارية والسكنية في مصر.',
      },
      restoration: {
        title: 'ترميم المباني التراثية في مصر | سوميت للإنشاءات',
        description: 'تقدم سوميت خدمات ترميم المباني التراثية في مصر، بما يشمل ترميم الرخام والإصلاح الإنشائي وإعادة الاستخدام والتأهيل.',
      },
      renovation: {
        title: 'التشطيبات السكنية في مصر | سوميت للإنشاءات',
        description: 'تنفذ سوميت أعمال التشطيبات السكنية والتسليم المتكامل في مصر مع تنسيق مراحل التنفيذ والعناية بالتفاصيل.',
      },
      'fit-out': {
        title: 'التشطيبات التجارية في مصر | سوميت للإنشاءات',
        description: 'تنفذ سوميت أعمال التشطيبات التجارية في مصر، بما يشمل تشطيب المتاجر وتنسيق الأعمال الكهروميكانيكية.',
      },
    },
  }

  const absolute = (route) => `${siteUrl}${route.startsWith('/') ? route : `/${route}`}`
  const assetUrl = (asset) => `${siteUrl}${asset}`
  const localeRoute = (route, locale) => {
    const segments = route.split('/').filter(Boolean)
    return `/${locale}/${segments.slice(1).join('/')}${segments.length > 1 ? '/' : ''}`
  }
  const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  const safeJson = (value) => JSON.stringify(value).replaceAll('<', '\\u003c')

  function routeDetails(route) {
    const segments = route.split('/').filter(Boolean)
    const locale = segments[0] === 'ar' ? 'ar' : 'en'
    const tail = segments.slice(1)
    const copy = siteCopy[locale]
    const defaultSeo = pageSeo[locale].home
    let title = defaultSeo.title
    let description = defaultSeo.description
    let image = defaultImage
    let imageAlt = locale === 'en' ? 'SUMMIT Construction project photography' : 'صورة من مشروعات سوميت للإنشاءات'
    let currentLabel = copy.nav.home
    let sectionLabel

    if (tail[0] === 'projects' && tail[1]) {
      const project = publishedProjects.find((item) => item.slug === tail[1])
      if (project) {
        title = project.seo.title[locale]
        description = project.seo.description[locale]
        currentLabel = project.title[locale]
        sectionLabel = copy.nav.projects
        if (project.cover) { image = project.cover.src; imageAlt = project.cover.alt[locale] }
      }
    } else if (tail[0] === 'services' && tail[1]) {
      const service = copy.serviceDetails.find((item) => item.slug === tail[1])
      if (service) {
        title = serviceSeo[locale][tail[1]]?.title ?? `${service.title} | ${locale === 'en' ? 'SUMMIT Construction' : 'سوميت للإنشاءات'}`
        description = serviceSeo[locale][tail[1]]?.description ?? service.desc
        currentLabel = service.title
        sectionLabel = copy.nav.services
        image = serviceImages[tail[1]] || defaultImage
        imageAlt = `${service.title} — SUMMIT Construction`
      }
    } else if (tail[0]) {
      const content = copy.pages[tail[0]]
      if (content) {
        title = pageSeo[locale][tail[0]]?.title ?? `${content.title.replace('\n', ' ')} | ${locale === 'en' ? 'SUMMIT Construction' : 'سوميت للإنشاءات'}`
        description = pageSeo[locale][tail[0]]?.description ?? content.description
        currentLabel = copy.nav[tail[0]] || content.title.replace('\n', ' ')
        image = pageImages[tail[0]] || defaultImage
      }
    }

    return { locale, tail, copy, title, description, image, imageAlt, currentLabel, sectionLabel }
  }

  function structuredData(route, details) {
    const { locale, tail, copy, title, description, currentLabel, sectionLabel } = details
    const organizationId = `${siteUrl}/#organization`
    const graph = [{
      '@type': 'Organization', '@id': organizationId, name: 'SUMMIT Construction',
      url: absolute('/en/'),
      logo: { '@type': 'ImageObject', url: assetUrl('/assets/brand/summit-logo-gold-480.webp') },
      email: 'Projects@Summit-constructions.com', telephone: '+20 100 966 6337',
      areaServed: { '@type': 'Country', name: 'Egypt' },
      contactPoint: {
        '@type': 'ContactPoint', contactType: 'customer service',
        telephone: '+20 100 966 6337', email: 'Projects@Summit-constructions.com',
        areaServed: 'EG', availableLanguage: ['English', 'Arabic'],
      },
    }]
    if (tail[0] === 'services' && tail[1]) graph.push({
      '@type': 'Service', '@id': `${absolute(route)}#service`, name: currentLabel, description,
      url: absolute(route), serviceType: currentLabel,
      areaServed: { '@type': 'Country', name: 'Egypt' }, provider: { '@id': organizationId },
    })
    if (tail.length) {
      const items = [{ '@type': 'ListItem', position: 1, name: copy.nav.home, item: absolute(`/${locale}/`) }]
      if (sectionLabel) items.push({ '@type': 'ListItem', position: 2, name: sectionLabel, item: absolute(`/${locale}/${tail[0]}/`) })
      items.push({ '@type': 'ListItem', position: items.length + 1, name: currentLabel, item: absolute(route) })
      graph.push({ '@type': 'BreadcrumbList', '@id': `${absolute(route)}#breadcrumb`, itemListElement: items })
    }
    return { '@context': 'https://schema.org', '@graph': graph, name: title }
  }

  function seoTags(route, details) {
    const { locale, title, description, image, imageAlt } = details
    const enRoute = localeRoute(route, 'en')
    const arRoute = localeRoute(route, 'ar')
    const canonical = absolute(route)
    const robots = indexable.has(route) ? 'index,follow,max-image-preview:large' : 'noindex,follow'
    const pairedAlternates = indexable.has(enRoute) && indexable.has(arRoute)
      ? [
        `<link rel="alternate" hreflang="en" href="${escapeHtml(absolute(enRoute))}" />`,
        `<link rel="alternate" hreflang="ar" href="${escapeHtml(absolute(arRoute))}" />`,
        `<link rel="alternate" hreflang="x-default" href="${escapeHtml(absolute(enRoute))}" />`,
      ]
      : []
    return [
      `<meta name="robots" content="${robots}" />`,
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
      ...pairedAlternates,
      '<meta property="og:site_name" content="SUMMIT Construction" />',
      `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
      `<meta property="og:locale" content="${locale === 'ar' ? 'ar_EG' : 'en_US'}" />`,
      `<meta property="og:locale:alternate" content="${locale === 'ar' ? 'en_US' : 'ar_EG'}" />`,
      `<meta property="og:image" content="${escapeHtml(assetUrl(image))}" />`,
      `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
      '<meta name="twitter:card" content="summary_large_image" />',
      `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
      `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
      `<meta name="twitter:image" content="${escapeHtml(assetUrl(image))}" />`,
      `<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`,
      googleVerification ? `<meta name="google-site-verification" content="${escapeHtml(googleVerification)}" />` : '',
      `<script type="application/ld+json">${safeJson(structuredData(route, details))}</script>`,
    ].filter(Boolean).join('\n    ')
  }

  async function writeRoute(route, filePath) {
    const markup = renderRoute(route)
    const details = routeDetails(route)
    const { locale, title, description } = details
    const routeTemplate = details.tail.length ? template.replace(/\s*<link\s+rel="preload"\s+as="image"[\s\S]*?fetchpriority="high"\s*\/>/g, '') : template
    const html = routeTemplate
      .replace('<html lang="en" dir="ltr" data-theme="dark">', `<html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}" data-theme="dark">`)
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(description)}$2`)
      .replace(/(<meta property="og:title" content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(title)}$2`)
      .replace(/(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(description)}$2`)
      .replace('</head>', `    ${seoTags(route, details)}\n  </head>`)
      .replace(/<div id="root">[\s\S]*?<\/div>\s*<\/body>/, `<div id="root" data-prerendered="true">${markup}</div>\n  </body>`)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, html)
  }

  for (const route of staticRoutePaths) {
    const filePath = path.join(outputRoot, route.replace(/^\//, ''), 'index.html')
    await writeRoute(route, filePath)
  }
  await writeRoute('/en/', path.join(outputRoot, 'index.html'))

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${indexableRoutePaths.map((route) => {
    const enRoute = localeRoute(route, 'en')
    const arRoute = localeRoute(route, 'ar')
    const alternates = indexable.has(enRoute) && indexable.has(arRoute)
      ? `\n    <xhtml:link rel="alternate" hreflang="en" href="${escapeHtml(absolute(enRoute))}" />\n    <xhtml:link rel="alternate" hreflang="ar" href="${escapeHtml(absolute(arRoute))}" />\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(absolute(enRoute))}" />`
      : ''
    return `  <url><loc>${escapeHtml(absolute(route))}</loc>${alternates}\n  </url>`
  }).join('\n')}\n</urlset>\n`
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
  await Promise.all([
    writeFile(path.join(outputRoot, 'sitemap.xml'), sitemap),
    writeFile(path.join(outputRoot, 'robots.txt'), robots),
  ])
  console.log(`Pre-rendered ${staticRoutePaths.length + 1} static HTML entry points and ${indexableRoutePaths.length} sitemap URLs.`)
} finally {
  await server.close()
}
