import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const dist = path.resolve('dist')
const siteUrl = (process.env.SITE_URL?.trim() || 'https://nagdy77.github.io/SUMMIT-Construction-Website').replace(/\/$/, '')
const approvedProjects = new Set(['mohamed-ali-palace', 'ministries-district', 'lakeview-residence'])

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

const routeFiles = [...await walk(path.join(dist, 'en')), ...await walk(path.join(dist, 'ar'))]
assert.equal(routeFiles.length, 46, 'exactly 46 localized static route files must exist')
const indexedTitles = new Set()
const indexedDescriptions = new Set()
let indexedCount = 0

for (const file of routeFiles) {
  const relative = path.relative(dist, path.dirname(file)).split(path.sep).join('/')
  const route = `/${relative}/`
  const html = await readFile(file, 'utf8')
  const locale = route.startsWith('/ar/') ? 'ar' : 'en'
  const alternateLocale = locale === 'ar' ? 'en' : 'ar'
  const alternateRoute = route.replace(`/${locale}/`, `/${alternateLocale}/`)
  const englishRoute = route.replace(/^\/ar\//, '/en/')
  const title = one(html, /<title>([^<]+)<\/title>/, 'a title', route)
  const description = one(html, /<meta\s+name="description"\s+content="([^"]+)"/, 'a description', route)
  const canonical = one(html, /<link rel="canonical" href="([^"]+)"/, 'a canonical URL', route)
  const robots = one(html, /<meta name="robots" content="([^"]+)"/, 'robots metadata', route)
  const enHref = one(html, /<link rel="alternate" hreflang="en" href="([^"]+)"/, 'English hreflang', route)
  const arHref = one(html, /<link rel="alternate" hreflang="ar" href="([^"]+)"/, 'Arabic hreflang', route)
  const defaultHref = one(html, /<link rel="alternate" hreflang="x-default" href="([^"]+)"/, 'x-default hreflang', route)
  const ogTitle = one(html, /<meta property="og:title" content="([^"]+)"/, 'Open Graph title', route)
  const ogDescription = one(html, /<meta\s+property="og:description"\s+content="([^"]+)"/, 'Open Graph description', route)
  const ogImage = one(html, /<meta property="og:image" content="([^"]+)"/, 'Open Graph image', route)
  const jsonText = one(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/, 'JSON-LD', route)
  const structured = JSON.parse(jsonText)
  const types = structured['@graph'].map((item) => item['@type'])
  const projectMatch = route.match(/^\/(?:en|ar)\/projects\/([^/]+)\/$/)
  const shouldIndex = !route.endsWith('/privacy/') && (!projectMatch || approvedProjects.has(projectMatch[1]))

  assert.equal(canonical, `${siteUrl}${route}`, `${route} canonical must be exact`)
  assert.equal(enHref, `${siteUrl}${locale === 'en' ? route : alternateRoute}`, `${route} English hreflang must be reciprocal`)
  assert.equal(arHref, `${siteUrl}${locale === 'ar' ? route : alternateRoute}`, `${route} Arabic hreflang must be reciprocal`)
  assert.equal(defaultHref, `${siteUrl}${englishRoute}`, `${route} x-default must use English`)
  assert.equal(ogTitle, title, `${route} Open Graph title must match the document title`)
  assert.equal(ogDescription, description, `${route} Open Graph description must match the meta description`)
  assert.ok(ogImage.startsWith(`${siteUrl}/assets/`), `${route} Open Graph image must be an absolute local asset URL`)
  assert.ok(types.includes('Organization'), `${route} requires Organization structured data`)
  if (!/^\/(en|ar)\/$/.test(route)) assert.ok(types.includes('BreadcrumbList'), `${route} requires Breadcrumb structured data`)
  if (/\/(en|ar)\/services\/[^/]+\/$/.test(route)) assert.ok(types.includes('Service'), `${route} requires Service structured data`)
  assert.ok(/<main\b[\s\S]*?<h1\b/.test(html), `${route} must contain a crawlable H1`)
  if (route !== `/${locale}/`) assert.ok(!/hero-heritage-mobile-720\.webp/.test(html), `${route} must not download the homepage-only mobile hero preload`)

  if (shouldIndex) {
    assert.match(robots, /^index,follow/, `${route} should be indexable`)
    assert.ok(!indexedTitles.has(title), `${route} title must be unique among indexable routes`)
    assert.ok(!indexedDescriptions.has(description), `${route} description must be unique among indexable routes`)
    indexedTitles.add(title)
    indexedDescriptions.add(description)
    indexedCount += 1
  } else assert.equal(robots, 'noindex,follow', `${route} must stay out of search indexing`)
}

assert.equal(indexedCount, 28, '28 approved localized URLs must be indexable')
const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8')
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
assert.equal(sitemapUrls.length, 28, 'sitemap must contain only 28 approved URLs')
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'sitemap URLs must be unique')
assert.ok(sitemapUrls.every((url) => url.startsWith(`${siteUrl}/`)), 'sitemap URLs must be absolute and canonical')
assert.ok(!sitemapUrls.some((url) => /privacy|mountain-view|new-capital-downtown-mall|wajha-office/.test(url)), 'privacy and provisional records must be excluded from the sitemap')
const robots = await readFile(path.join(dist, 'robots.txt'), 'utf8')
assert.match(robots, new RegExp(`Sitemap: ${siteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/sitemap\\.xml`))

console.log('Verified 46 localized static routes, 28 approved indexable URLs, unique metadata, canonical/hreflang pairs, sitemap, robots, Open Graph and Organization/Service/Breadcrumb JSON-LD.')
