import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const inboxRoot = path.join(root, 'project-inbox')
const outputRoot = path.join(root, 'public', 'assets', 'projects', 'portfolio')
const categorySourceRoot = path.join(root, 'public', 'assets', 'projects', 'categories')
const categoryOutputRoot = path.join(categorySourceRoot, 'optimized')
const generatedDataPath = path.join(root, 'src', 'data', 'project-media.generated.ts')
const validExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif', '.heic', '.heif'])

const projectDefinitions = [
  ['heritage-restoration', 'mohamed-ali-palace', 'Mohamed Ali Palace'],
  ['heritage-restoration', 'beit-al-razzaz', 'Beit Al Razzaz'],
  ['heritage-restoration', 'safi-al-din-gowhar', 'Safi Al Din Gowhar'],
  ['heritage-restoration', 'st-andrews-church', 'St Andrews Church'],
  ['construction', 'new-capital-administrations-district', 'New Capital Administrations District'],
  ['construction', 'stream-3', 'Stream 3'],
  ['construction', 'oriana-cairo-festival-city', 'Oriana Cairo Festival City'],
  ['construction', 'alto', 'Alto'],
  ['residential-fit-out', 'lakeview-residence', 'Lakeview Residence'],
  ['residential-fit-out', 'marvel', 'Marvel'],
  ['retail-fit-out', 'bcbg', 'BCBG'],
  ['retail-fit-out', 'bsb', 'BSB'],
  ['retail-fit-out', 'desigual', 'Desigual'],
  ['retail-fit-out', 'marina-rinaldi', 'Marina Rinaldi'],
  ['retail-fit-out', 'sky-offices', 'Sky Offices'],
  ['retail-fit-out', 'voda', 'Voda'],
].map(([category, slug, title]) => ({ category, slug, title }))

const categoryDefinitions = [
  ['heritage-restoration', 'Heritage Restoration.png'],
  ['construction', 'Construction.png'],
  ['residential-fit-out', 'Residental-Fit-Out.png'],
  ['retail-fit-out', 'Retail-Fit-Out.png'],
].map(([slug, source]) => ({ slug, source }))

async function resetGeneratedDirectory(targetDirectory, allowedRoot) {
  const target = path.resolve(targetDirectory)
  const boundary = `${path.resolve(allowedRoot)}${path.sep}`
  if (!target.startsWith(boundary)) throw new Error(`Refusing to clear generated output outside ${allowedRoot}: ${target}`)
  await rm(target, { recursive: true, force: true })
  await mkdir(target, { recursive: true })
}

async function responsiveWebp(sourcePath, targetDirectory, stem, requestedWidths) {
  const metadata = await sharp(sourcePath).metadata()
  if (!metadata.width || !metadata.height) throw new Error(`Missing dimensions: ${sourcePath}`)
  const widths = [...new Set(requestedWidths.map((width) => Math.min(width, metadata.width)))].sort((a, b) => a - b)
  const variants = []

  for (const width of widths) {
    const targetPath = path.join(targetDirectory, `${stem}-${width}.webp`)
    const info = await sharp(sourcePath)
      .rotate()
      .resize({ width, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 5, smartSubsample: true })
      .toFile(targetPath)
    variants.push({ width: info.width, height: info.height, targetPath })
  }

  return variants
}

async function prepareProjects() {
  const generated = {}
  const manifest = { projects: {}, issues: [] }

  for (const project of projectDefinitions) {
    const sourceDirectory = path.join(inboxRoot, project.category, project.slug)
    const targetDirectory = path.join(outputRoot, project.slug)
    const entries = await readdir(sourceDirectory, { withFileTypes: true })
    const imageFilenames = entries
      .filter((entry) => entry.isFile() && validExtensions.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => entry.name)
    const numberedCandidates = imageFilenames
      .map((filename) => {
        const match = /^([1-9]\d*)\.[^.]+$/i.exec(filename)
        return match ? { filename, number: Number.parseInt(match[1], 10) } : null
      })
      .filter(Boolean)
    const numberedFiles = numberedCandidates
      .filter(({ filename, number }) => filename === `${number}.png`)
      .sort((a, b) => a.number - b.number)
    const unnumberedFiles = imageFilenames
      .filter((filename) => !numberedFiles.some((image) => image.filename === filename))
      .sort((a, b) => a.localeCompare(b, 'en'))
    const numberCounts = new Map()
    for (const image of numberedCandidates) numberCounts.set(image.number, (numberCounts.get(image.number) ?? 0) + 1)
    const duplicateNumbers = [...numberCounts].filter(([, count]) => count > 1).map(([number]) => number)
    const highestNumber = numberedFiles.at(-1)?.number ?? 0
    const canonicalNumbers = new Set(numberedFiles.map((image) => image.number))
    const missingNumbers = Array.from({ length: highestNumber }, (_, index) => index + 1).filter((number) => !canonicalNumbers.has(number))

    if (!numberedFiles.length) throw new Error(`No numbered PNG photographs found for ${project.slug}; expected 1.png, 2.png, ...`)
    if (!canonicalNumbers.has(1)) throw new Error(`Missing cover photograph for ${project.slug}: 1.png`)
    if (duplicateNumbers.length) throw new Error(`Duplicate photograph numbers for ${project.slug}: ${duplicateNumbers.join(', ')}`)
    if (missingNumbers.length) throw new Error(`Missing photograph numbers for ${project.slug}: ${missingNumbers.join(', ')}`)

    const projectIssues = unnumberedFiles.map((filename) => `Unnumbered image excluded from the ordered gallery: ${filename}`)
    for (const issue of projectIssues) {
      const message = `${project.slug}: ${issue}`
      manifest.issues.push(message)
      console.warn(`WARNING: ${message}`)
    }
    await resetGeneratedDirectory(targetDirectory, outputRoot)
    const projectImages = []
    const manifestImages = []

    for (const { filename, number } of numberedFiles) {
      const sourcePath = path.join(sourceDirectory, filename)
      const stem = String(number).padStart(2, '0')
      const variants = await responsiveWebp(sourcePath, targetDirectory, stem, [720, 1600])
      const publicVariants = variants.map((variant) => ({
        ...variant,
        src: `/assets/projects/portfolio/${project.slug}/${path.basename(variant.targetPath)}`,
      }))
      const largest = publicVariants.at(-1)
      const sourceMetadata = await sharp(sourcePath).metadata()
      projectImages.push({
        src: largest.src,
        srcSet: publicVariants.map((variant) => `${variant.src} ${variant.width}w`).join(', '),
        alt: `${project.title} — project photograph ${number}`,
        label: filename,
        fit: sourceMetadata.width / sourceMetadata.height < 0.82 ? 'contain' : 'cover',
        position: 'center',
        width: largest.width,
        height: largest.height,
      })
      manifestImages.push({
        number,
        filename,
        source: path.relative(root, sourcePath).replaceAll('\\', '/'),
        sourceWidth: sourceMetadata.width,
        sourceHeight: sourceMetadata.height,
        variants: publicVariants.map(({ src, width, height }) => ({ src, width, height })),
      })
    }

    generated[project.slug] = projectImages
    manifest.projects[project.slug] = { category: project.category, cover: '1.png', count: projectImages.length, issues: projectIssues, images: manifestImages }
  }

  await mkdir(outputRoot, { recursive: true })
  await writeFile(path.join(outputRoot, 'media-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  const generatedSource = `// Generated by scripts/prepare-project-portfolio-media.mjs.\n// Do not edit image assignments by hand; update the inbox and rerun the generator.\nimport type { ProjectImage } from './projects'\n\nexport const projectMedia = ${JSON.stringify(generated, null, 2)} as const satisfies Record<string, readonly ProjectImage[]>\n`
  await writeFile(generatedDataPath, generatedSource, 'utf8')
  return manifest
}

async function prepareCategories() {
  await resetGeneratedDirectory(categoryOutputRoot, categorySourceRoot)
  const categories = {}
  for (const category of categoryDefinitions) {
    const sourcePath = path.join(categorySourceRoot, category.source)
    const variants = await responsiveWebp(sourcePath, categoryOutputRoot, category.slug, [720, 1400])
    categories[category.slug] = variants.map((variant) => ({
      src: `/assets/projects/categories/optimized/${path.basename(variant.targetPath)}`,
      width: variant.width,
      height: variant.height,
    }))
  }
  await writeFile(path.join(categoryOutputRoot, 'media-manifest.json'), `${JSON.stringify({ categories }, null, 2)}\n`, 'utf8')
  return categories
}

const projectManifest = await prepareProjects()
const projectsOnly = process.argv.includes('--projects-only')
const categoryManifest = projectsOnly ? null : await prepareCategories()
const photoCount = Object.values(projectManifest.projects).reduce((total, project) => total + project.count, 0)
console.log(JSON.stringify({ projects: Object.keys(projectManifest.projects).length, photos: photoCount, categories: categoryManifest ? Object.keys(categoryManifest).length : 'unchanged', issues: projectManifest.issues }, null, 2))
