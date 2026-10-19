import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const workspace = process.cwd()
const sourceRoot = path.join(workspace, 'public', 'assets', 'projects')
const generatedAssetsRoot = path.join(sourceRoot, 'featured')
const reportRoot = path.join(workspace, 'references')
const sheetsRoot = path.join(reportRoot, 'contact-sheets')
const rasterExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tif', '.tiff'])
const priorityFolders = new Set(['M.ALI PALACE', 'MINISTRIES DISTRICT', 'Lakeview'])

const toPosix = (value) => value.split(path.sep).join('/')
const relativeSource = (value) => toPosix(path.relative(sourceRoot, value))
const topFolder = (relativePath) => relativePath.split('/')[0]

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory() && absolute === generatedAssetsRoot) return []
    return entry.isDirectory() ? walk(absolute) : [absolute]
  }))
  return nested.flat()
}

async function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(filePath)
      .on('error', reject)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
  })
}

function imageMetrics(data, width, height) {
  let sum = 0
  let sumSquares = 0
  let laplacianSum = 0
  let laplacianSquares = 0
  let laplacianCount = 0

  for (const value of data) {
    sum += value
    sumSquares += value * value
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x
      const laplacian = (4 * data[index])
        - data[index - 1]
        - data[index + 1]
        - data[index - width]
        - data[index + width]
      laplacianSum += laplacian
      laplacianSquares += laplacian * laplacian
      laplacianCount += 1
    }
  }

  const pixelCount = data.length
  const luminance = sum / pixelCount
  const contrast = Math.sqrt(Math.max(0, (sumSquares / pixelCount) - (luminance * luminance)))
  const laplacianMean = laplacianSum / laplacianCount
  const sharpness = Math.sqrt(Math.max(0, (laplacianSquares / laplacianCount) - (laplacianMean * laplacianMean)))

  return {
    luminance: Number(luminance.toFixed(2)),
    contrast: Number(contrast.toFixed(2)),
    sharpness: Number(sharpness.toFixed(2)),
  }
}

function differenceHash(data) {
  let bits = ''
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      bits += data[(y * 9) + x] > data[(y * 9) + x + 1] ? '1' : '0'
    }
  }

  return BigInt(`0b${bits}`).toString(16).padStart(16, '0')
}

async function inspectRaster(filePath, bytes) {
  const image = sharp(filePath, { failOn: 'error' })
  const metadata = await image.metadata()
  const oriented = metadata.autoOrient ?? { width: metadata.width, height: metadata.height }
  const width = oriented.width ?? metadata.width ?? 0
  const height = oriented.height ?? metadata.height ?? 0

  const sample = await sharp(filePath, { failOn: 'error' })
    .rotate()
    .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const hashSample = await sharp(filePath, { failOn: 'error' })
    .rotate()
    .resize(9, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer()

  const metrics = imageMetrics(sample.data, sample.info.width, sample.info.height)
  const megapixels = (width * height) / 1_000_000
  const orientation = width > height * 1.08 ? 'landscape' : height > width * 1.08 ? 'portrait' : 'square'
  const flags = []

  if (Math.min(width, height) < 900) flags.push('low-resolution')
  if (metrics.sharpness < 7) flags.push('soft-or-low-detail')
  if (metrics.luminance < 25) flags.push('very-dark')
  if (metrics.luminance > 235) flags.push('very-bright')
  if (bytes < 80 * 1024) flags.push('very-small-file')

  return {
    width,
    height,
    megapixels: Number(megapixels.toFixed(2)),
    orientation,
    format: metadata.format,
    colourSpace: metadata.space,
    hasAlpha: Boolean(metadata.hasAlpha),
    exifOrientation: metadata.orientation ?? null,
    ...metrics,
    differenceHash: differenceHash(hashSample),
    flags,
  }
}

const escapeXml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

async function makeContactSheets(folder, records) {
  const cellsPerPage = 20
  const columns = 4
  const cellWidth = 320
  const imageHeight = 205
  const labelHeight = 55
  const rows = Math.ceil(Math.min(cellsPerPage, records.length) / columns)
  const pageWidth = columns * cellWidth
  const outputRecords = []

  const sorted = [...records].sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { numeric: true }))
  for (let offset = 0; offset < sorted.length; offset += cellsPerPage) {
    const page = sorted.slice(offset, offset + cellsPerPage)
    const pageRows = Math.ceil(page.length / columns)
    const pageHeight = pageRows * (imageHeight + labelHeight)
    const composites = []

    for (let index = 0; index < page.length; index += 1) {
      const record = page[index]
      const x = (index % columns) * cellWidth
      const y = Math.floor(index / columns) * (imageHeight + labelHeight)
      const thumbnail = await sharp(record.absolutePath, { failOn: 'none' })
        .rotate()
        .resize({ width: cellWidth - 8, height: imageHeight - 8, fit: 'contain', background: '#1d1d1d' })
        .jpeg({ quality: 72 })
        .toBuffer()
      const shortName = path.basename(record.relativePath).slice(0, 38)
      const label = Buffer.from(`
        <svg width="${cellWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#262626"/>
          <text x="8" y="21" fill="#f3f1ec" font-family="Arial, sans-serif" font-size="15">${escapeXml(`${offset + index + 1}. ${shortName}`)}</text>
          <text x="8" y="43" fill="#d5b452" font-family="Arial, sans-serif" font-size="13">${record.width}×${record.height} · ${record.orientation} · sharp ${record.sharpness}</text>
        </svg>
      `)

      composites.push({ input: thumbnail, left: x + 4, top: y + 4 })
      composites.push({ input: label, left: x, top: y + imageHeight })
      outputRecords.push({
        number: offset + index + 1,
        page: Math.floor(offset / cellsPerPage) + 1,
        relativePath: record.relativePath,
      })
    }

    const slug = folder.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '')
    const pageNumber = String(Math.floor(offset / cellsPerPage) + 1).padStart(2, '0')
    const outputPath = path.join(sheetsRoot, `${slug}-${pageNumber}.jpg`)
    await sharp({ create: { width: pageWidth, height: pageHeight, channels: 3, background: '#181818' } })
      .composite(composites)
      .jpeg({ quality: 84, chromaSubsampling: '4:4:4' })
      .toFile(outputPath)
  }

  return outputRecords
}

await mkdir(sheetsRoot, { recursive: true })

const absoluteFiles = await walk(sourceRoot)
const fileRecords = []
const imageRecords = []

for (const absolutePath of absoluteFiles) {
  const fileStat = await stat(absolutePath)
  const relativePath = relativeSource(absolutePath)
  const extension = path.extname(absolutePath).toLowerCase()
  const base = {
    absolutePath,
    relativePath,
    folder: topFolder(relativePath),
    extension: extension || '[none]',
    bytes: fileStat.size,
  }
  fileRecords.push(base)

  if (!rasterExtensions.has(extension) || fileStat.size === 0) continue

  try {
    const inspection = await inspectRaster(absolutePath, fileStat.size)
    imageRecords.push({ ...base, ...inspection, usable: true })
  } catch (error) {
    imageRecords.push({
      ...base,
      usable: false,
      decodeError: error instanceof Error ? error.message : String(error),
      flags: ['decode-error'],
    })
  }
}

const sameSizeGroups = Map.groupBy(fileRecords, (record) => record.bytes)
const exactDuplicateGroups = []
for (const [bytes, records] of sameSizeGroups) {
  if (records.length < 2 || bytes === 0) continue
  const hashed = await Promise.all(records.map(async (record) => ({ ...record, sha256: await sha256(record.absolutePath) })))
  const byHash = Map.groupBy(hashed, (record) => record.sha256)
  for (const [hash, duplicates] of byHash) {
    if (duplicates.length > 1) {
      exactDuplicateGroups.push({
        sha256: hash,
        bytes,
        files: duplicates.map((record) => record.relativePath),
      })
    }
  }
}

const visualHashGroups = [...Map.groupBy(
  imageRecords.filter((record) => record.usable),
  (record) => record.differenceHash,
).entries()]
  .filter(([, records]) => records.length > 1)
  .map(([differenceHashValue, records]) => ({
    differenceHash: differenceHashValue,
    files: records.map((record) => record.relativePath),
  }))

const sheets = {}
for (const folder of priorityFolders) {
  const records = imageRecords.filter((record) => record.folder === folder && record.usable)
  sheets[folder] = await makeContactSheets(folder, records)
}

const folderSummaries = [...Map.groupBy(fileRecords, (record) => record.folder).entries()]
  .map(([folder, records]) => {
    const images = imageRecords.filter((record) => record.folder === folder)
    const extensions = Object.fromEntries(
      [...Map.groupBy(records, (record) => record.extension).entries()]
        .map(([extension, extensionRecords]) => [extension, extensionRecords.length])
        .sort(([a], [b]) => a.localeCompare(b)),
    )
    return {
      folder,
      fileCount: records.length,
      bytes: records.reduce((sum, record) => sum + record.bytes, 0),
      extensions,
      decodedImages: images.filter((record) => record.usable).length,
      decodeFailures: images.filter((record) => !record.usable).length,
      orientationCounts: Object.fromEntries(
        [...Map.groupBy(images.filter((record) => record.usable), (record) => record.orientation).entries()]
          .map(([orientation, orientationRecords]) => [orientation, orientationRecords.length]),
      ),
    }
  })
  .sort((a, b) => a.folder.localeCompare(b.folder))

const report = {
  generatedAt: new Date().toISOString(),
  sourceRoot: toPosix(path.relative(workspace, sourceRoot)),
  summary: {
    fileCount: fileRecords.length,
    bytes: fileRecords.reduce((sum, record) => sum + record.bytes, 0),
    rasterCount: imageRecords.length,
    usableRasterCount: imageRecords.filter((record) => record.usable).length,
    decodeFailureCount: imageRecords.filter((record) => !record.usable).length,
    zeroByteCount: fileRecords.filter((record) => record.bytes === 0).length,
    exactDuplicateGroupCount: exactDuplicateGroups.length,
    visualHashGroupCount: visualHashGroups.length,
  },
  folders: folderSummaries,
  exactDuplicateGroups,
  potentialVisualDuplicateGroups: visualHashGroups,
  suspiciousFiles: [
    ...fileRecords.filter((record) => record.bytes === 0).map((record) => ({
      relativePath: record.relativePath,
      reason: 'zero-byte-file',
    })),
    ...imageRecords.flatMap((record) => record.flags.map((reason) => ({ relativePath: record.relativePath, reason }))),
    ...fileRecords.filter((record) => ['.mp4', '.nef'].includes(record.extension)).map((record) => ({
      relativePath: record.relativePath,
      reason: record.extension === '.mp4' ? 'video-not-a-web-photo' : 'camera-raw-not-a-web-photo',
    })),
  ],
  images: imageRecords.map(({ absolutePath, ...record }) => record),
  contactSheetIndex: sheets,
}

await writeFile(path.join(reportRoot, 'project-image-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report.summary, null, 2))
console.log(`Wrote ${path.relative(workspace, path.join(reportRoot, 'project-image-audit.json'))}`)
console.log(`Wrote contact sheets to ${path.relative(workspace, sheetsRoot)}`)
