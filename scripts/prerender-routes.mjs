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
    construction: '/assets/projects/featured/real-media/hero-construction-wide-1440.webp',
    restoration: '/assets/projects/featured/real-media/hero-heritage-wide-1440.webp',
    renovation: '/assets/projects/featured/real-media/hero-residential-wide-1440.webp',
    'fit-out': '/assets/projects/featured/real-media/hero-fitout-wide-1440.webp',
  }
  const pageImages = {
    about: '/assets/projects/featured/real-media/story-wide-wide-1440.webp',
    services: serviceImages.construction,
    projects: serviceImages.restoration,
    contact: '/assets/projects/featured/real-media/contact-work-wide-1440.webp',
  }
  const defaultImage = '/assets/projects/featured/real-media/hero-heritage-wide-1440.webp'

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
    const fallbackDescription = locale === 'en' ? 'SUMMIT Construction delivers construction, restoration, renovation, and fit-out work in Egypt.' : 'تقدم سوميت للإنشاءات أعمال الإنشاء والترميم والتجديد والتشطيبات في مصر.'
    let title = locale === 'en' ? 'SUMMIT Construction | Construction, Restoration & Fit-Out' : 'سوميت للإنشاءات | الإنشاء والترميم والتشطيبات'
    let description = fallbackDescription
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
        title = `${service.title} | SUMMIT Construction`
        description = service.desc
        currentLabel = service.title
        sectionLabel = copy.nav.services
        image = serviceImages[tail[1]] || defaultImage
        imageAlt = `${service.title} — SUMMIT Construction`
      }
    } else if (tail[0]) {
      const content = copy.pages[tail[0]]
      if (content) {
        title = `${content.title.replace('\n', ' ')} | SUMMIT Construction`
        description = content.description
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
      url: absolute('/en/'), logo: assetUrl('/assets/brand/summit-logo-gold-intro.webp'),
      email: 'Projects@Summit-constructions.com',
    }]
    if (tail[0] === 'services' && tail[1]) graph.push({
      '@type': 'Service', '@id': `${absolute(route)}#service`, name: currentLabel, description,
      url: absolute(route), provider: { '@id': organizationId },
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
    return [
      `<meta name="robots" content="${robots}" />`,
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
      `<link rel="alternate" hreflang="en" href="${escapeHtml(absolute(enRoute))}" />`,
      `<link rel="alternate" hreflang="ar" href="${escapeHtml(absolute(arRoute))}" />`,
      `<link rel="alternate" hreflang="x-default" href="${escapeHtml(absolute(enRoute))}" />`,
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

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexableRoutePaths.map((route) => `  <url><loc>${escapeHtml(absolute(route))}</loc></url>`).join('\n')}\n</urlset>\n`
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
  await Promise.all([
    writeFile(path.join(outputRoot, 'sitemap.xml'), sitemap),
    writeFile(path.join(outputRoot, 'robots.txt'), robots),
  ])
  console.log(`Pre-rendered ${staticRoutePaths.length + 1} static HTML entry points and ${indexableRoutePaths.length} sitemap URLs.`)
} finally {
  await server.close()
}
