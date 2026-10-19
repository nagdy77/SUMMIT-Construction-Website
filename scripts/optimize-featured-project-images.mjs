import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const workspace = process.cwd()
const sourceRoot = path.join(workspace, 'public', 'assets', 'projects')
const outputRoot = path.join(sourceRoot, 'featured')
const manifestPath = path.join(workspace, 'references', 'project-image-mapping.json')

const selections = [
  {
    project: 'Mohamed Ali Palace',
    source: 'M.ALI PALACE/DSC06095.jpg',
    output: 'mohamed-ali-palace/mohamed-ali-palace-restored-marble-hall.webp',
    rationale: 'High resolution wide interior showing the restored marble floor and decorated hall.',
  },
  {
    project: 'Mohamed Ali Palace',
    source: 'M.ALI PALACE/DSC06118.jpg',
    output: 'mohamed-ali-palace/mohamed-ali-palace-stone-entrance.webp',
    rationale: 'High resolution exterior view with a centered entrance and strong architectural depth.',
  },
  {
    project: 'Mohamed Ali Palace',
    source: 'M.ALI PALACE/DSC06158.jpg',
    output: 'mohamed-ali-palace/mohamed-ali-palace-ornate-interior.webp',
    rationale: 'High resolution interior with distinctive historic ceiling, windows, and marble finishes.',
  },
  {
    project: 'Ministries District',
    source: 'MINISTRIES DISTRICT/1573550963_663_5892049_7394-1100x732.jpg',
    output: 'ministries-district/ministries-district-main-facade.webp',
    rationale: 'The clearest broad facade view available in the named project folder.',
  },
  {
    project: 'Ministries District',
    source: 'MINISTRIES DISTRICT/IMG-20190122-WA0022.jpg',
    output: 'ministries-district/ministries-district-facade-scaffolding.webp',
    rationale: 'A closer scaffolded facade view that shows a distinct construction stage.',
  },
  {
    project: 'Ministries District',
    source: 'MINISTRIES DISTRICT/FB_IMG_1581370217284.jpg',
    output: 'ministries-district/ministries-district-construction-overview.webp',
    rationale: 'A wider construction view that adds context and visual variety.',
  },
  {
    project: 'Lakeview',
    source: 'Lakeview/IMG-20250103-WA0009.jpg',
    output: 'lakeview/lakeview-marble-kitchen-detail.webp',
    rationale: 'The strongest landscape detail image, with clear marble and joinery finishes.',
  },
  {
    project: 'Lakeview',
    source: 'Lakeview/IMG-20230820-WA0031.jpg',
    output: 'lakeview/lakeview-bathroom-fitout.webp',
    rationale: 'A portrait bathroom view that broadens room and orientation coverage.',
  },
  {
    project: 'Lakeview',
    source: 'Lakeview/IMG-20230820-WA0046.jpg',
    output: 'lakeview/lakeview-interior-joinery.webp',
    rationale: 'An unwatermarked portrait interior showing the dark joinery and completed wall finishes.',
  },
]

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function encodeWithinTarget(pipeline) {
  const qualities = [100, 98, 96, 92, 88, 84, 80, 76, 72, 68, 64, 60]
  const candidates = []

  for (const quality of qualities) {
    const buffer = await pipeline.clone().webp({ quality, effort: 5, smartSubsample: true }).toBuffer()
    candidates.push({ quality, buffer })
  }

  const inRange = candidates.filter(({ buffer }) => buffer.length >= 150 * 1024 && buffer.length <= 350 * 1024)
  if (inRange.length > 0) return inRange[0]

  const belowMaximum = candidates.filter(({ buffer }) => buffer.length <= 350 * 1024)
  if (belowMaximum.length > 0) return belowMaximum[0]

  return candidates.at(-1)
}

const manifest = {
  generatedAt: new Date().toISOString(),
  outputRoot: 'public/assets/projects/featured',
  policy: {
    maximumLongEdge: 1600,
    enlargement: false,
    targetBytes: [153600, 358400],
    format: 'webp',
    metadata: 'stripped',
  },
  assets: [],
}

for (const selection of selections) {
  const sourcePath = path.join(sourceRoot, ...selection.source.split('/'))
  const outputPath = path.join(outputRoot, ...selection.output.split('/'))
  await mkdir(path.dirname(outputPath), { recursive: true })

  const originalMetadata = await sharp(sourcePath, { failOn: 'error' }).metadata()
  const pipeline = sharp(sourcePath, { failOn: 'error' })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .toColourspace('srgb')

  const encoded = await encodeWithinTarget(pipeline)
  await writeFile(outputPath, encoded.buffer)
  const outputMetadata = await sharp(encoded.buffer).metadata()

  manifest.assets.push({
    project: selection.project,
    source: `public/assets/projects/${selection.source}`,
    output: `public/assets/projects/featured/${selection.output}`,
    rationale: selection.rationale,
    original: {
      width: originalMetadata.autoOrient?.width ?? originalMetadata.width,
      height: originalMetadata.autoOrient?.height ?? originalMetadata.height,
      format: originalMetadata.format,
    },
    optimized: {
      width: outputMetadata.width,
      height: outputMetadata.height,
      format: outputMetadata.format,
      quality: encoded.quality,
      bytes: encoded.buffer.length,
      sha256: sha256(encoded.buffer),
    },
  })
}

await mkdir(path.dirname(manifestPath), { recursive: true })
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(JSON.stringify(manifest.assets, null, 2))
