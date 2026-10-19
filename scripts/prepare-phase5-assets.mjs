import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const generatedDirectory = path.join(root, 'public', 'assets', 'generated')
const manifestPath = path.join(root, 'references', 'phase-5-image-manifest.json')
const encoding = { quality: 86, effort: 6, smartSubsample: true }
const widths = [640, 960, 1440]
const stems = [
  'about-architectural-vision',
  'service-construction',
  'service-heritage',
  'service-residential',
  'parallax-02-materials',
]

const relativePath = (file) => path.relative(root, file).split(path.sep).join('/')
const digest = (buffer) => createHash('sha256').update(buffer).digest('hex')

async function verifyWebP(file, expectedWidth, expectedHeight) {
  const data = await readFile(file)
  const signature = data.toString('ascii', 0, 4) === 'RIFF'
    && data.toString('ascii', 8, 12) === 'WEBP'
  if (!signature) throw new Error(`${relativePath(file)} has an invalid WebP signature.`)
  const metadata = await sharp(data).metadata()
  // Decode all pixels as well as the header; corrupt payloads must fail here.
  await sharp(data).raw().toBuffer()
  if (metadata.format !== 'webp' || metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
    throw new Error(`${relativePath(file)} failed format or dimension verification.`)
  }
  return {
    path: relativePath(file),
    publicPath: `/${relativePath(file).replace(/^public\//, '')}`,
    bytes: data.length,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    signature: 'RIFF/WEBP',
    decoded: true,
    sha256: digest(data),
  }
}

await mkdir(generatedDirectory, { recursive: true })
const assets = []

for (const stem of stems) {
  const sourceFile = path.join(generatedDirectory, `${stem}.png`)
  const sourceBuffer = await readFile(sourceFile)
  const metadata = await sharp(sourceBuffer).metadata()
  const { width, height, format } = metadata
  if (!width || !height || format !== 'png') throw new Error(`Expected a valid PNG source: ${stem}`)
  const sourceHash = digest(sourceBuffer)
  const outputs = []

  for (const targetWidth of widths.filter((candidate) => candidate < width)) {
    const outputFile = path.join(generatedDirectory, `${stem}-${targetWidth}.webp`)
    const output = await sharp(sourceBuffer)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp(encoding)
      .toBuffer({ resolveWithObject: true })
    await writeFile(outputFile, output.data)
    outputs.push({
      variant: `${targetWidth}w`,
      ...await verifyWebP(outputFile, output.info.width, output.info.height),
      crop: null,
    })
  }

  const fullFile = path.join(generatedDirectory, `${stem}.webp`)
  await sharp(sourceBuffer).webp(encoding).toFile(fullFile)
  outputs.push({ variant: 'full', ...await verifyWebP(fullFile, width, height), crop: null })

  if (stem === 'parallax-02-materials') {
    // Visually reviewed: the 70% horizontal framing retains the lit marble plane
    // and fine metallic edge, with the original full-height perspective intact.
    const cropWidth = Math.min(640, width)
    const crop = { left: Math.round((width - cropWidth) * 0.7), top: 0, width: cropWidth, height }
    const mobileFile = path.join(generatedDirectory, `${stem}-mobile.webp`)
    await sharp(sourceBuffer).extract(crop).webp(encoding).toFile(mobileFile)
    outputs.push({
      variant: 'mobile-portrait',
      ...await verifyWebP(mobileFile, crop.width, crop.height),
      crop,
      horizontalObjectPosition: '70%',
    })
  }

  if (digest(await readFile(sourceFile)) !== sourceHash) {
    throw new Error(`Source changed unexpectedly: ${relativePath(sourceFile)}`)
  }
  assets.push({
    source: {
      path: relativePath(sourceFile),
      bytes: sourceBuffer.length,
      width,
      height,
      format,
      sha256: sourceHash,
      unchangedAfterProcessing: true,
    },
    outputs,
  })
}

const manifest = {
  generatedAt: new Date().toISOString(),
  tool: 'Sharp',
  encoding,
  policy: {
    originalPNGsPreserved: true,
    originalProjectMediaUntouched: true,
    upscaling: false,
    aspectRatioPreserved: 'All responsive/full variants; one explicitly recorded materials mobile crop.',
    verification: 'RIFF/WEBP signature, Sharp format metadata, full pixel decoding, dimensions, bytes, SHA-256.',
  },
  assets,
}
await mkdir(path.dirname(manifestPath), { recursive: true })
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

for (const asset of assets) {
  console.log(`${asset.source.path}: ${asset.source.width}x${asset.source.height}, ${asset.source.bytes} bytes; PNG unchanged`)
  for (const output of asset.outputs) console.log(`  ${path.basename(output.path)} | ${output.width}x${output.height} | ${output.bytes} bytes | WebP verified`)
}
console.log(`Wrote ${relativePath(manifestPath)} with ${assets.reduce((total, asset) => total + asset.outputs.length, 0)} verified WebP derivatives.`)
