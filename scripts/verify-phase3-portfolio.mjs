import assert from 'node:assert/strict'
import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const publicProjects = path.join(root, 'public/assets/projects')
const workingRoot = path.join(root, 'references/public-working-portfolio')
const dist = path.join(root, 'dist')
const audit = JSON.parse(await readFile(path.join(root, 'references/real-media-transition/contact-sheets/index.json'), 'utf8'))
const selection = JSON.parse(await readFile(path.join(workingRoot, 'selection-map.json'), 'utf8'))
const projectSlugs = [
  'mohamed-ali-palace', 'ministries-district', 'lakeview-residence', 'beit-al-razzaz', 'marvel', 'oriana-cfc',
  'stream-3', 'safi-al-din-gawhar', 'mountain-view', 'new-capital-downtown-mall', 'wajha-office',
]
const photoExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tif', '.tiff'])
const videoExtensions = new Set(['.mp4', '.mov', '.m4v', '.avi', '.mkv', '.3gp', '.webm'])

async function countMedia(folder) {
  let photos = 0
  let videos = 0
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const target = path.join(folder, entry.name)
    if (entry.isDirectory()) {
      const nested = await countMedia(target)
      photos += nested.photos
      videos += nested.videos
    } else {
      const extension = path.extname(entry.name).toLowerCase()
      if (photoExtensions.has(extension)) photos++
      if (videoExtensions.has(extension)) videos++
    }
  }
  return { photos, videos }
}

const sourceFolders = (await readdir(publicProjects, { withFileTypes: true })).filter((entry) => entry.isDirectory() && entry.name !== 'featured')
assert.equal(sourceFolders.length, 11, 'all 11 client project media folders remain registered')
assert.equal(audit.folders.reduce((count, folder) => count + folder.photos, 0), 368, 'audit records all 368 source photographs')
const sourceCounts = await Promise.all(sourceFolders.map((entry) => countMedia(path.join(publicProjects, entry.name))))
assert.equal(sourceCounts.reduce((count, current) => count + current.photos, 0), 368, 'all 368 original photographs remain preserved')
assert.equal(sourceCounts.reduce((count, current) => count + current.videos, 0), 47, 'all 47 original videos remain preserved')

for (const [slug, project] of Object.entries(selection.projects)) {
  assert.ok(project.candidates.length <= 5, `${slug} keeps five or fewer selected photographs`)
  for (const candidate of project.candidates) {
    const original = path.join(root, candidate.source)
    await access(original)
    for (const variant of candidate.variants) {
      await access(path.join(root, 'public', variant.src.replace(/^\//, '')))
    }
  }
}

await access(path.join(dist, 'assets/projects/featured/phase3-curated'))
await access(path.join(dist, 'assets/patterns/summit-quotation-grid.svg'))
for (const locale of ['en', 'ar']) {
  const listing = await readFile(path.join(dist, locale, 'projects/index.html'), 'utf8')
  for (const slug of projectSlugs) {
    assert.ok(listing.includes(`/projects/${slug}/`), `${slug} appears on the ${locale} working portfolio`)
    await access(path.join(dist, locale, 'projects', slug, 'index.html'))
  }
}
console.log(`Verified 11 public-working projects, 368 preserved photographs, 47 preserved videos, ${Object.values(selection.projects).reduce((sum, project) => sum + project.candidates.length, 0)} authentic photo selections, bilingual static routes, and the repeating SVG surface pattern.`)
