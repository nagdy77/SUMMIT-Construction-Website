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
].map(([category, slug, title]) => ({ category, slug, title })).concat([
  {
    category: 'heritage-restoration',
    slug: 'beit-al-razzaz',
    title: 'Beit Al Razzaz',
    sourceFolder: 'beit-al-razzaz/northern-side',
    publicAssetFolder: 'beit-al-razzaz/northern-side',
    prebuiltVariants: true,
    ignoreUnconfiguredFiles: true,
    files: [1203, 1562, 1570, 1563, 1586].map((width, index) => {
      const stem = String(index + 1).padStart(2, '0')
      return { filename: `${stem}-${width}.webp`, variants: [`${stem}-720.webp`, `${stem}-${width}.webp`] }
    }),
  },
  {
    category: 'construction', slug: 'down-town-1', title: 'Down Town 1', sourceFolder: 'DownTown 1',
    files: [
      { filename: 'Sunlit Concrete Atrium Under Construction.png', alt: 'Sunlit concrete atrium under construction at Down Town 1', altAr: 'فناء خرساني مضاء طبيعيًا قيد الإنشاء في داون تاون 1' },
      { filename: 'Precision Above_ Summit Construction Crew.png', alt: 'SUMMIT crew members working beneath building services at Down Town 1', altAr: 'فريق سوميت يعمل أسفل تمديدات المبنى في داون تاون 1' },
      { filename: 'Warm Construction Corridor with Scaffolding.png', alt: 'Interior construction corridor with scaffolding at Down Town 1', altAr: 'ممر إنشاءات داخلي به سقالات في داون تاون 1' },
      { filename: 'Sunlit Scaffold Interior in Renovation.png', alt: 'Sunlit interior scaffolding at the Down Town 1 project', altAr: 'سقالات داخلية مضاءة طبيعيًا في مشروع داون تاون 1' },
    ],
  },
  {
    category: 'construction',
    slug: 'soma-bay',
    title: 'Soma Bay',
    sourceFolder: 'Somabay/Somabay',
    ignoreUnconfiguredFiles: true,
    files: [
      { filename: '1000390018.jpg.jpeg', alt: 'Soma Bay construction site with reinforced concrete work in progress', altAr: 'موقع إنشاءات سوما باي وأعمال الخرسانة المسلحة قيد التنفيذ' },
      { filename: '1000389458.jpg.jpeg', alt: 'Wide view of reinforced concrete works at Soma Bay', altAr: 'منظر واسع لأعمال الخرسانة المسلحة في سوما باي' },
      { filename: '1000389460.jpg.jpeg', alt: 'Reinforcement and formwork across the Soma Bay construction site', altAr: 'أعمال التسليح والشدات في موقع إنشاءات سوما باي' },
      { filename: '1000390017.jpg.jpeg', alt: 'Construction team working among reinforced concrete elements at Soma Bay', altAr: 'فريق الإنشاءات يعمل بين عناصر الخرسانة المسلحة في سوما باي' },
      { filename: '1000390019.jpg.jpeg', alt: 'Construction activity and reinforcement work at Soma Bay', altAr: 'أنشطة الإنشاء وأعمال التسليح في سوما باي' },
      { filename: '1000390029.jpg.jpeg', alt: 'Reinforcement installation in progress at Soma Bay', altAr: 'تركيب حديد التسليح قيد التنفيذ في سوما باي' },
      { filename: '1000125144.jpg.jpeg', alt: 'Building services installation in a Soma Bay interior corridor', altAr: 'تركيب خدمات المبنى في ممر داخلي بمشروع سوما باي' },
      { filename: '1000125157.jpg.jpeg', alt: 'Site team inspecting overhead building services at Soma Bay', altAr: 'فريق الموقع يعاين خدمات المبنى العلوية في سوما باي' },
      { filename: '1000125166.jpg.jpeg', alt: 'Installation work along a Soma Bay interior passage', altAr: 'أعمال تركيب داخل ممر في مشروع سوما باي' },
      { filename: '1000139570.jpg.jpeg', alt: 'Overhead service routes during construction at Soma Bay', altAr: 'مسارات الخدمات العلوية أثناء الإنشاء في سوما باي' },
      { filename: '1000139606.jpg.jpeg', alt: 'Interior construction corridor and external scaffolding at Soma Bay', altAr: 'ممر إنشاءات داخلي وسقالات خارجية في سوما باي' },
      { filename: 'WhatsApp Image 2026-11-11 at 4.05.52 PM (2).jpeg', alt: 'Interior wall installation work at Soma Bay', altAr: 'أعمال تركيب الجدران الداخلية في سوما باي' },
    ],
  },
])

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
    const quality = width <= 900 ? 76 : 80
    const info = await sharp(sourcePath)
      .rotate()
      .resize({ width, fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 6, smartSubsample: true })
      .toFile(targetPath)
    variants.push({ width: info.width, height: info.height, targetPath })
  }

  return variants
}

async function existingResponsiveWebp(sourceDirectory, filenames) {
  return Promise.all(filenames.map(async (filename) => {
    const targetPath = path.join(sourceDirectory, filename)
    const metadata = await sharp(targetPath).metadata()
    if (!metadata.width || !metadata.height) throw new Error(`Missing dimensions: ${targetPath}`)
    return { width: metadata.width, height: metadata.height, targetPath }
  }))
}

async function prepareProjects() {
  const generated = {}
  const manifest = { projects: {}, issues: [] }

  for (const project of projectDefinitions) {
    const sourceDirectory = project.sourceFolder
      ? path.join(outputRoot, project.sourceFolder)
      : path.join(inboxRoot, project.category, project.slug)
    const targetDirectory = path.join(outputRoot, project.slug)
    const entries = await readdir(sourceDirectory, { withFileTypes: true })
    const imageFilenames = entries
      .filter((entry) => entry.isFile() && validExtensions.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => entry.name)
    let numberedFiles
    let unnumberedFiles
    if (project.files) {
      const supplied = new Set(imageFilenames)
      const missingFiles = project.files.filter(({ filename }) => !supplied.has(filename)).map(({ filename }) => filename)
      if (missingFiles.length) throw new Error(`Missing configured photographs for ${project.slug}: ${missingFiles.join(', ')}`)
      numberedFiles = project.files.map((image, index) => ({ ...image, number: index + 1 }))
      unnumberedFiles = project.ignoreUnconfiguredFiles
        ? []
        : imageFilenames.filter((filename) => !project.files.some((image) => image.filename === filename)).sort((a, b) => a.localeCompare(b, 'en'))
    } else {
      const numberedCandidates = imageFilenames
        .map((filename) => {
          const match = /^([1-9]\d*)\.[^.]+$/i.exec(filename)
          return match ? { filename, number: Number.parseInt(match[1], 10) } : null
        })
        .filter(Boolean)
      numberedFiles = numberedCandidates
        .filter(({ filename, number }) => filename === `${number}.png`)
        .sort((a, b) => a.number - b.number)
      unnumberedFiles = imageFilenames
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
    }

    const projectIssues = unnumberedFiles.map((filename) => `Unnumbered image excluded from the ordered gallery: ${filename}`)
    for (const issue of projectIssues) {
      const message = `${project.slug}: ${issue}`
      manifest.issues.push(message)
      console.warn(`WARNING: ${message}`)
    }
    // Beit Al-Razzaz owns additional curated sub-galleries. Preserve those
    // generated derivatives while refreshing its numbered base gallery.
    if (project.prebuiltVariants) await mkdir(targetDirectory, { recursive: true })
    else await resetGeneratedDirectory(targetDirectory, outputRoot)
    const projectImages = []
    const manifestImages = []

    for (const { filename, number, alt, altAr, variants: configuredVariants } of numberedFiles) {
      const sourcePath = path.join(sourceDirectory, filename)
      const stem = String(number).padStart(2, '0')
      const variants = project.prebuiltVariants
        ? await existingResponsiveWebp(sourceDirectory, configuredVariants)
        : await responsiveWebp(sourcePath, targetDirectory, stem, [720, 1600])
      const publicAssetFolder = project.publicAssetFolder ?? project.slug
      const publicVariants = variants.map((variant) => ({
        ...variant,
        src: `/assets/projects/portfolio/${publicAssetFolder}/${path.basename(variant.targetPath)}`,
      }))
      const largest = publicVariants.at(-1)
      const sourceMetadata = await sharp(sourcePath).metadata()
      projectImages.push({
        src: largest.src,
        srcSet: publicVariants.map((variant) => `${variant.src} ${variant.width}w`).join(', '),
        alt: alt ?? `${project.title} — project photograph ${number}`,
        ...(altAr ? { altAr } : {}),
        label: `${project.title} — photograph ${number}`,
        fit: sourceMetadata.width / sourceMetadata.height < 0.82 ? 'contain' : 'cover',
        position: 'center',
        width: largest.width,
        height: largest.height,
      })
      manifestImages.push({
        number,
        sourceWidth: sourceMetadata.width,
        sourceHeight: sourceMetadata.height,
        variants: publicVariants.map(({ src, width, height }) => ({ src, width, height })),
      })
    }

    generated[project.slug] = projectImages
    manifest.projects[project.slug] = { category: project.category, cover: manifestImages[0]?.variants.at(-1)?.src ?? null, count: projectImages.length, issues: projectIssues, images: manifestImages }
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
