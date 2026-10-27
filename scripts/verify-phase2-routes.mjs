import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const dist = path.resolve('dist')
const previewBase = process.argv[2]?.replace(/\/$/, '') ?? null
const locales = ['en', 'ar']
const pages = ['about', 'services', 'projects', 'clients', 'contact', 'privacy']
const services = ['construction', 'restoration', 'renovation', 'fit-out']
const projects = [
  'mohamed-ali-palace', 'ministries-district', 'lakeview-residence', 'beit-al-razzaz', 'marvel', 'oriana-cfc',
  'stream-3', 'safi-al-din-gawhar', 'mountain-view', 'new-capital-downtown-mall', 'wajha-office',
]
const routes = locales.flatMap((locale) => [
  `/${locale}/`, ...pages.map((page) => `/${locale}/${page}/`),
  ...services.map((slug) => `/${locale}/services/${slug}/`),
  ...projects.map((slug) => `/${locale}/projects/${slug}/`),
])

for (const route of routes) {
  const html = await readFile(path.join(dist, route.slice(1), 'index.html'), 'utf8')
  assert.match(html, /data-prerendered="true"/, `${route} must contain server-rendered HTML`)
  assert.match(html, /<h1[\s>]/, `${route} must have a crawlable primary heading`)
  assert.match(html, new RegExp(`<html lang="${route.startsWith('/ar/') ? 'ar' : 'en'}" dir="${route.startsWith('/ar/') ? 'rtl' : 'ltr'}"`), `${route} must set locale and direction`)
  assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/s, `${route} must have a description`)
  assert.ok(!html.includes('<div class="summit-boot-shell"'), `${route} must not require JavaScript to reveal its content`)
  const languageLink = html.match(/class="language-switch"[^>]*href="([^"]+)"/)
  assert.ok(languageLink, `${route} must expose language switching`)
  const alternateRoute = route.startsWith('/en/') ? route.replace('/en/', '/ar/') : route.replace('/ar/', '/en/')
  assert.ok(languageLink[1].endsWith(alternateRoute), `${route} language switch must preserve the page path`)
  if (previewBase) {
    const response = await fetch(`${previewBase}${route}`)
    const served = await response.text()
    assert.equal(response.status, 200, `${route} must resolve directly from the preview server`)
    assert.match(served, /data-prerendered="true"/, `${route} direct response must contain static content`)
  }
}

for (const route of ['/en/projects/', '/ar/projects/']) {
  const html = await readFile(path.join(dist, route.slice(1), 'index.html'), 'utf8')
  for (const slug of projects) assert.match(html, new RegExp(`/projects/${slug}/`), `${route} links to ${slug}`)
}

for (const slug of projects) {
  for (const locale of locales) {
    const html = await readFile(path.join(dist, locale, 'projects', slug, 'index.html'), 'utf8')
    const count = (html.match(/<figure/g) ?? []).length
    assert.ok(count <= 5, `/${locale}/projects/${slug}/ keeps no more than five project photos`)
  }
}

await assert.rejects(access(path.join(dist, 'assets/downloads/summit-company-profile.pdf')), 'the company profile PDF must not be publicly served')
await access(path.resolve('SUMMIT Profile new 2025 final (1).pdf'))
console.log(`Verified ${routes.length} localized static routes${previewBase ? ' over HTTP' : ''}, all 11 public-working projects, gallery limits, public PDF removal, and preservation of the internal profile source.`)

