import assert from 'node:assert/strict'
import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const dist = path.resolve('dist')
const siteUrl = (process.env.SITE_URL?.trim() || 'https://nagdy77.github.io/SUMMIT-Construction-Website').replace(/\/$/, '')
const site = new URL(siteUrl)
const siteBasePath = site.pathname.replace(/\/$/, '')

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(full))
    else if (entry.name === 'index.html') files.push(full)
  }
  return files
}

function one(html, expression, label, route) {
  const match = html.match(expression)
  assert.ok(match?.[1], `${route} requires ${label}`)
  return match[1]
}

function all(html, expression) {
  return [...html.matchAll(expression)]
}

function stripMarkup(value) {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|#39);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function routeForFile(file) {
  const relative = path.relative(dist, path.dirname(file)).split(path.sep).join('/')
  return `/${relative}/`
}

function localeRoute(route, locale) {
  return route.replace(/^\/(?:en|ar)\//, `/${locale}/`)
}

function localOutputPath(urlValue) {
  const url = new URL(urlValue, `${siteUrl}/`)
  if (url.origin !== site.origin) return null
  let pathname = decodeURIComponent(url.pathname)
  if (siteBasePath && pathname.startsWith(`${siteBasePath}/`)) pathname = pathname.slice(siteBasePath.length)
  if (pathname === siteBasePath) pathname = '/'
  return pathname
}

async function requireAsset(urlValue, label, route) {
  const localPath = localOutputPath(urlValue)
  assert.ok(localPath?.startsWith('/assets/'), `${route} ${label} must be a local production asset URL`)
  await access(path.join(dist, localPath.replace(/^\//, '')))
}

const routeFiles = [...await walk(path.join(dist, 'en')), ...await walk(path.join(dist, 'ar'))]
const routes = new Map(routeFiles.map((file) => [routeForFile(file), file]))
const routeResults = new Map()
const indexedTitles = new Set()
const indexedDescriptions = new Set()
let imageCount = 0
let decorativeImageCount = 0
let deferredImageCount = 0
let internalLinkCount = 0

assert.equal(routes.size, routeFiles.length, 'localized static route paths must be unique')
assert.equal([...routes.keys()].filter((route) => route.startsWith('/en/')).length, [...routes.keys()].filter((route) => route.startsWith('/ar/')).length, 'English and Arabic static route coverage must match')

for (const [route, file] of routes) {
  const html = await readFile(file, 'utf8')
  const locale = route.startsWith('/ar/') ? 'ar' : 'en'
  const alternateLocale = locale === 'ar' ? 'en' : 'ar'
  const alternateRoute = localeRoute(route, alternateLocale)
  const title = one(html, /<title>([^<]+)<\/title>/, 'a title', route)
  const description = one(html, /<meta\s+name="description"\s+content="([^"]+)"/, 'a description', route)
  const canonical = one(html, /<link rel="canonical" href="([^"]+)"/, 'a canonical URL', route)
  const robots = one(html, /<meta name="robots" content="([^"]+)"/, 'robots metadata', route)
  const ogTitle = one(html, /<meta property="og:title" content="([^"]+)"/, 'Open Graph title', route)
  const ogDescription = one(html, /<meta\s+property="og:description"\s+content="([^"]+)"/, 'Open Graph description', route)
  const ogUrl = one(html, /<meta property="og:url" content="([^"]+)"/, 'Open Graph URL', route)
  const ogImage = one(html, /<meta property="og:image" content="([^"]+)"/, 'Open Graph image', route)
  const ogImageAlt = one(html, /<meta property="og:image:alt" content="([^"]+)"/, 'Open Graph image alt text', route)
  const twitterTitle = one(html, /<meta name="twitter:title" content="([^"]+)"/, 'Twitter title', route)
  const twitterDescription = one(html, /<meta name="twitter:description" content="([^"]+)"/, 'Twitter description', route)
  const twitterImage = one(html, /<meta name="twitter:image" content="([^"]+)"/, 'Twitter image', route)
  const twitterImageAlt = one(html, /<meta name="twitter:image:alt" content="([^"]+)"/, 'Twitter image alt text', route)
  const jsonText = one(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/, 'JSON-LD', route)
  const structured = JSON.parse(jsonText)
  const graph = structured['@graph']
  const types = graph.flatMap((item) => Array.isArray(item['@type']) ? item['@type'] : [item['@type']])
  const shouldIndex = robots.startsWith('index,follow')

  assert.match(html, new RegExp(`<html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`), `${route} requires correct language and direction`)
  assert.equal(canonical, `${siteUrl}${route}`, `${route} canonical must be exact`)
  assert.equal(ogTitle, title, `${route} Open Graph title must match the document title`)
  assert.equal(ogDescription, description, `${route} Open Graph description must match the meta description`)
  assert.equal(ogUrl, canonical, `${route} Open Graph URL must match the canonical`)
  assert.equal(twitterTitle, title, `${route} Twitter title must match the document title`)
  assert.equal(twitterDescription, description, `${route} Twitter description must match the meta description`)
  assert.equal(twitterImage, ogImage, `${route} social images must match`)
  assert.equal(twitterImageAlt, ogImageAlt, `${route} social image alt text must match`)
  assert.ok(ogImageAlt.trim().length >= 8, `${route} requires meaningful social image alt text`)
  await requireAsset(ogImage, 'Open Graph image', route)

  assert.equal(structured['@context'], 'https://schema.org', `${route} JSON-LD requires the Schema.org context`)
  assert.ok(Array.isArray(graph), `${route} JSON-LD requires a graph`)
  assert.ok(types.includes('Organization'), `${route} requires Organization structured data`)
  const organization = graph.find((item) => item['@type'] === 'Organization')
  assert.equal(organization.name, 'SUMMIT Construction', `${route} requires the verified organization name`)
  assert.equal(organization.telephone, '+20 100 966 6337', `${route} requires the verified organization telephone`)
  assert.equal(organization.email, 'Projects@Summit-constructions.com', `${route} requires the verified organization email`)
  assert.equal(organization.areaServed?.name, 'Egypt', `${route} requires the verified service area`)
  if (!/^\/(?:en|ar)\/$/.test(route)) {
    assert.ok(types.includes('BreadcrumbList'), `${route} requires Breadcrumb structured data`)
    const breadcrumb = graph.find((item) => item['@type'] === 'BreadcrumbList')
    assert.ok(Array.isArray(breadcrumb.itemListElement) && breadcrumb.itemListElement.length >= 2, `${route} requires complete breadcrumb items`)
    assert.deepEqual(breadcrumb.itemListElement.map((item) => item.position), breadcrumb.itemListElement.map((_, index) => index + 1), `${route} breadcrumb positions must be sequential`)
    assert.equal(breadcrumb.itemListElement.at(-1)?.item, canonical, `${route} breadcrumb must end at its canonical URL`)
  }
  if (/^\/(?:en|ar)\/services\/[^/]+\/$/.test(route)) {
    assert.ok(types.includes('Service'), `${route} requires Service structured data`)
    const service = graph.find((item) => item['@type'] === 'Service')
    assert.equal(service.provider?.['@id'], `${siteUrl}/#organization`, `${route} Service provider must reference SUMMIT`)
    assert.equal(service.areaServed?.name, 'Egypt', `${route} Service area must be Egypt`)
  }

  const headings = all(html, /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi).map((match) => ({ level: Number(match[1]), text: stripMarkup(match[2]) }))
  assert.equal(headings.filter((heading) => heading.level === 1).length, 1, `${route} must contain exactly one H1`)
  assert.ok(headings[0]?.level === 1, `${route} heading hierarchy must begin with H1`)
  for (let index = 1; index < headings.length; index += 1) assert.ok(headings[index].level <= headings[index - 1].level + 1, `${route} heading hierarchy skips from H${headings[index - 1].level} to H${headings[index].level}`)
  assert.ok(headings.every((heading) => heading.text.length > 0), `${route} headings must contain meaningful text`)
  const main = one(html, /<main\b[^>]*>([\s\S]*?)<\/main>/, 'crawlable main content', route)
  assert.ok(stripMarkup(main).length >= 120, `${route} requires meaningful prerendered content`)
  assert.match(html, /<div id="root" data-prerendered="true">/, `${route} must expose prerendered HTML before JavaScript`)

  const images = all(html, /<img\b[^>]*>/gi).map((match) => match[0])
  for (const image of images) {
    const altMatch = image.match(/\salt="([^"]*)"/i)
    const srcMatch = image.match(/\s(?:src|data-src|data-image-src)="([^"]+)"/i)
    assert.ok(altMatch, `${route} contains an image without an alt attribute`)
    if (altMatch[1] === '') decorativeImageCount += 1
    else assert.doesNotMatch(altMatch[1], /(?:^|\b)(?:IMG|DSC|E3)[-_]?\d|\.(?:jpe?g|png|webp)$/i, `${route} exposes a technical filename as image alt text`)
    if (srcMatch) await requireAsset(srcMatch[1], 'image', route)
    else deferredImageCount += 1
    imageCount += 1
  }

  const ids = all(html, /\sid="([^"]+)"/g).map((match) => match[1])
  assert.equal(new Set(ids).size, ids.length, `${route} must not contain duplicate IDs`)
  const links = all(html, /<a\b[^>]*\shref="([^"]+)"[^>]*>/gi)
  for (const [, href] of links) {
    if (/^(?:https?:|mailto:|tel:|javascript:)/i.test(href)) continue
    if (href.startsWith('#')) {
      assert.ok(ids.includes(href.slice(1)), `${route} contains a broken fragment link: ${href}`)
      continue
    }
    const url = new URL(href, `${siteUrl}${route}`)
    const localPath = localOutputPath(url.href)
    assert.ok(localPath, `${route} contains an invalid internal link: ${href}`)
    const routePath = localPath.endsWith('/') ? localPath : `${localPath}/`
    assert.ok(routes.has(routePath), `${route} contains a broken internal route: ${href}`)
    if (url.hash && routePath === route) assert.ok(ids.includes(url.hash.slice(1)), `${route} contains a broken fragment link: ${href}`)
    internalLinkCount += 1
  }

  if (shouldIndex) {
    assert.ok(title.length >= 25 && title.length <= 70, `${route} indexable title length must remain useful`)
    assert.ok(description.length >= 50 && description.length <= 180, `${route} indexable description length must remain useful`)
    assert.ok(!indexedTitles.has(title), `${route} title must be unique among indexable routes`)
    assert.ok(!indexedDescriptions.has(description), `${route} description must be unique among indexable routes`)
    assert.doesNotMatch(description, /awaiting client|will be added once confirmed/i, `${route} must not index placeholder project copy`)
    indexedTitles.add(title)
    indexedDescriptions.add(description)
  } else assert.equal(robots, 'noindex,follow', `${route} must use the approved noindex directive`)

  routeResults.set(route, { canonical, shouldIndex, alternateRoute, html })
}

for (const [route, result] of routeResults) {
  const alternates = all(result.html, /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g).map((match) => ({ language: match[1], href: match[2] }))
  const counterpart = routeResults.get(result.alternateRoute)
  const isPaired = result.shouldIndex && counterpart?.shouldIndex
  if (!isPaired) {
    assert.equal(alternates.length, 0, `${route} must not advertise a noindex or unavailable language alternate`)
    continue
  }
  const enRoute = localeRoute(route, 'en')
  const arRoute = localeRoute(route, 'ar')
  assert.deepEqual(alternates, [
    { language: 'en', href: `${siteUrl}${enRoute}` },
    { language: 'ar', href: `${siteUrl}${arRoute}` },
    { language: 'x-default', href: `${siteUrl}${enRoute}` },
  ], `${route} requires reciprocal English, Arabic and x-default hreflang links`)
}

const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8')
assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/)
assert.match(sitemap, /<urlset[^>]+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/)
assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/)
const sitemapUrls = all(sitemap, /<loc>([^<]+)<\/loc>/g).map((match) => match[1].replaceAll('&amp;', '&'))
const indexedCanonicals = [...routeResults.values()].filter((result) => result.shouldIndex).map((result) => result.canonical).sort()
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'sitemap URLs must be unique')
assert.deepEqual([...sitemapUrls].sort(), indexedCanonicals, 'sitemap coverage must exactly match indexable canonical pages')
const sitemapEntries = all(sitemap, /<url>([\s\S]*?)<\/url>/g).map((match) => match[1])
assert.equal(sitemapEntries.length, sitemapUrls.length, 'each sitemap URL requires one complete URL entry')
for (const entry of sitemapEntries) {
  const canonical = one(entry, /<loc>([^<]+)<\/loc>/, 'a canonical location', 'sitemap')
  const route = localOutputPath(canonical)
  const result = routeResults.get(route)
  assert.ok(result?.shouldIndex, `sitemap contains a non-indexable or unknown URL: ${canonical}`)
  const alternates = all(entry, /<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)" \/>/g)
    .map((match) => ({ language: match[1], href: match[2].replaceAll('&amp;', '&') }))
  const counterpart = routeResults.get(result.alternateRoute)
  const expected = counterpart?.shouldIndex
    ? [
      { language: 'en', href: `${siteUrl}${localeRoute(route, 'en')}` },
      { language: 'ar', href: `${siteUrl}${localeRoute(route, 'ar')}` },
      { language: 'x-default', href: `${siteUrl}${localeRoute(route, 'en')}` },
    ]
    : []
  assert.deepEqual(alternates, expected, `sitemap hreflang set is inconsistent for ${route}`)
}

const robots = await readFile(path.join(dist, 'robots.txt'), 'utf8')
assert.match(robots, /^User-agent: \*$/m)
assert.match(robots, /^Allow: \/$/m)
assert.match(robots, new RegExp(`^Sitemap: ${siteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\/sitemap\\.xml$`, 'm'))

const rootHtml = await readFile(path.join(dist, 'index.html'), 'utf8')
assert.match(rootHtml, /<html lang="en" dir="ltr"/)
assert.match(rootHtml, /<div id="root" data-prerendered="true">/)
assert.equal(one(rootHtml, /<link rel="canonical" href="([^"]+)"/, 'a canonical URL', '/'), `${siteUrl}/en/`, 'site root must canonicalize to the English homepage')

const indexableCount = indexedCanonicals.length
const englishIndexableCount = [...routeResults.entries()].filter(([route, result]) => route.startsWith('/en/') && result.shouldIndex).length
const arabicIndexableCount = indexableCount - englishIndexableCount
console.log(`SEO audit passed: ${routes.size} localized HTML pages, ${indexableCount} indexable URLs (${englishIndexableCount} EN / ${arabicIndexableCount} AR), ${sitemapUrls.length} sitemap URLs, ${imageCount} image instances with alt attributes (${decorativeImageCount} decorative / ${deferredImageCount} client-deferred), and ${internalLinkCount} valid internal links.`)
