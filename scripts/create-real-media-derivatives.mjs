import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const publicRoot = path.resolve('public')
const outputRoot = path.join(publicRoot, 'assets/projects/featured/real-media')

const selections = [
  {
    id: 'hero-heritage',
    project: 'M.ALI PALACE',
    source: 'assets/projects/M.ALI PALACE/DSC06093.jpg',
    crops: { wide: { ratio: 1916 / 821, widths: [960, 1440, 1916] }, mobile: { ratio: 2 / 3, widths: [720] } },
  },
  {
    id: 'hero-construction',
    project: 'New Capital down town mall',
    source: 'assets/projects/New Capital down town mall/IMG_20250628_133031.jpg',
    crops: { wide: { ratio: 1916 / 821, widths: [960, 1440, 1916] }, mobile: { ratio: 2 / 3, widths: [720] } },
  },
  {
    id: 'hero-residential',
    project: 'ORIANA - CFC',
    source: 'assets/projects/ORIANA - CFC/IMG20200123104212.jpg',
    crops: { wide: { ratio: 1916 / 821, widths: [960, 1440, 1916] }, mobile: { ratio: 2 / 3, widths: [720] } },
  },
  {
    id: 'hero-fitout',
    project: 'Marvel',
    source: 'assets/projects/Marvel/IMG20211205125400.jpg',
    crops: { wide: { ratio: 1916 / 821, widths: [960, 1440, 1916] }, mobile: { ratio: 2 / 3, widths: [720] } },
  },
  {
    id: 'about-workmanship',
    project: 'Wajha Office',
    source: 'assets/projects/Wajha Office/IMG_20251207_002557.jpg',
    crops: { portrait: { ratio: 4 / 5, widths: [640, 960, 1122] } },
  },
  {
    id: 'service-construction',
    project: 'New Capital down town mall',
    source: 'assets/projects/New Capital down town mall/IMG_20250730_141201.jpg',
    crops: { portrait: { ratio: 0.64, widths: [640, 960, 1122] } },
  },
  {
    id: 'service-restoration',
    project: 'M.ALI PALACE',
    source: 'assets/projects/M.ALI PALACE/IMG20210706142551.jpg',
    crops: { portrait: { ratio: 0.64, widths: [640, 960, 1122] } },
  },
  {
    id: 'service-renovation',
    project: 'Lakeview',
    source: 'assets/projects/Lakeview/IMG-20230820-WA0027.jpg',
    crops: { portrait: { ratio: 0.64, widths: [480, 640, 847] } },
  },
  {
    id: 'story-wide',
    project: 'BEIT AL RAZZAZ',
    source: 'assets/projects/BEIT AL RAZZAZ/Phase 2/IMG_20250908_110032.jpg',
    crops: { wide: { ratio: 1916 / 821, widths: [960, 1440, 1916] }, mobile: { ratio: 2 / 3, widths: [720] } },
  },
  {
    id: 'story-portrait',
    project: 'BEIT AL RAZZAZ',
    source: 'assets/projects/BEIT AL RAZZAZ/Phase 2/DSC_6757.JPG',
    crops: { portrait: { ratio: 4 / 5, widths: [640, 960, 1122] } },
  },
  {
    id: 'material-study',
    project: 'M.ALI PALACE',
    source: 'assets/projects/M.ALI PALACE/DSC06158.jpg',
    crops: { wide: { ratio: 1916 / 821, widths: [640, 960, 1440, 1916] }, mobile: { ratio: 4 / 5, widths: [720] } },
  },
  {
    id: 'contact-work',
    project: 'BEIT AL RAZZAZ',
    source: 'assets/projects/BEIT AL RAZZAZ/Phase 1/DSC_7041.JPG',
    crops: { wide: { ratio: 1914 / 822, widths: [960, 1440, 1914] }, mobile: { ratio: 2 / 3, widths: [720] } },
  },
]

await mkdir(outputRoot, { recursive: true })
const outputs = []

for (const selection of selections) {
  const sourcePath = path.join(publicRoot, selection.source.replace(/^assets\//, 'assets/'))
  const sourceMeta = await sharp(sourcePath).metadata()
  const sourceStat = await stat(sourcePath)

  for (const [variant, crop] of Object.entries(selection.crops)) {
    for (const width of crop.widths) {
      const height = Math.round(width / crop.ratio)
      const fileName = `${selection.id}-${variant}-${width}.webp`
      const destination = path.join(outputRoot, fileName)
      await sharp(sourcePath)
        .rotate()
        .resize(width, height, { fit: 'cover', position: sharp.strategy.attention, withoutEnlargement: true })
        .webp({ quality: 83, effort: 5, smartSubsample: true })
        .toFile(destination)
      const result = await sharp(destination).metadata()
      const resultStat = await stat(destination)
      outputs.push({ file: `assets/projects/featured/real-media/${fileName}`, width: result.width, height: result.height, bytes: resultStat.size })
    }
  }

  selection.sourceSizeBytes = sourceStat.size
  selection.sourceDimensions = { width: sourceMeta.width, height: sourceMeta.height }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  policy: 'Derivative-only WebP outputs. Original client-supplied media remains untouched.',
  encoder: { format: 'WebP', quality: 83, effort: 5, resize: 'cover with attention focal crop; no upscaling' },
  selections,
  outputs,
}
await writeFile(path.join(outputRoot, 'asset-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Wrote ${outputs.length} WebP derivatives for ${selections.length} source photographs.`)
console.log(`Manifest: ${path.relative(process.cwd(), path.join(outputRoot, 'asset-manifest.json'))}`)
