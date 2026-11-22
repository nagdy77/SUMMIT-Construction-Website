import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const beitRoot = path.join(root, 'public', 'assets', 'projects', 'portfolio', 'beit-al-razzaz')
const outputRoot = path.join(root, 'references', 'qa', 'beit-new-after')
const newNames = [
  'IMG_7829.JPG.jpeg',
  'IMG_7840.JPG.jpeg',
  'IMG_7862.JPG.jpeg',
  'IMG_7880.JPG.jpeg',
  'IMG_7881.JPG.jpeg',
]
const comparisonGroups = [
  ['Phase 1 / Pair 1', 'phase-1-northern/comparisons/01-before-large.webp', 'phase-1-northern/comparisons/01-after-large.webp'],
  ['Phase 1 / Pair 2', 'phase-1-northern/comparisons/02-before-large.webp', 'phase-1-northern/comparisons/02-after-large.webp'],
  ['Phase 1 / Pair 3', 'phase-1-northern/comparisons/03-before-large.webp', 'phase-1-northern/comparisons/03-after-large.webp'],
  ['Phase 1 / Pair 4', 'phase-1-northern/comparisons/04-before-large.webp', 'phase-1-northern/comparisons/04-after-large.webp'],
  ['Phase 2 / Pair 1', 'phase-2-western-wing/comparisons/01-before-large.webp', 'phase-2-western-wing/comparisons/01-after-large.webp'],
  ['Phase 2 / Pair 2', 'phase-2-western-wing/comparisons/02-before-large.webp', 'phase-2-western-wing/comparisons/02-after-large.webp'],
  ['Phase 2 / Pair 3', 'phase-2-western-wing/comparisons/03-before-large.webp', 'phase-2-western-wing/comparisons/03-after-large.webp'],
  ['Carpentry / Pair 1', 'carpentry-workshop/11-large.webp', 'carpentry-workshop/01-large.webp'],
]

const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const label = (text, width, height = 34) => Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#202221"/><text x="10" y="23" fill="#f3f1ec" font-family="Arial,sans-serif" font-size="15">${escapeXml(text)}</text></svg>`)
const thumb = (file, width, height) => sharp(file).rotate().resize({ width, height, fit: 'contain', background: '#111312' }).jpeg({ quality: 80, chromaSubsampling: '4:4:4' }).toBuffer()

await mkdir(outputRoot, { recursive: true })

const newCellWidth = 320
const newImageHeight = 255
const newComposites = []
const records = []
for (const [index, name] of newNames.entries()) {
  const file = path.join(beitRoot, name)
  const [metadata, fileStat, buffer] = await Promise.all([sharp(file).metadata(), stat(file), readFile(file)])
  records.push({
    name,
    bytes: fileStat.size,
    width: metadata.autoOrient?.width ?? metadata.width,
    height: metadata.autoOrient?.height ?? metadata.height,
    orientation: metadata.orientation ?? null,
    sha256: createHash('sha256').update(buffer).digest('hex').toUpperCase(),
  })
  newComposites.push({ input: await thumb(file, newCellWidth - 8, newImageHeight - 8), left: index * newCellWidth + 4, top: 4 })
  newComposites.push({ input: label(`${index + 1}. ${name}`, newCellWidth), left: index * newCellWidth, top: newImageHeight })
}
await sharp({ create: { width: newCellWidth * newNames.length, height: newImageHeight + 34, channels: 3, background: '#111312' } })
  .composite(newComposites)
  .jpeg({ quality: 84, chromaSubsampling: '4:4:4' })
  .toFile(path.join(outputRoot, 'new-photos.jpg'))

const pairCellWidth = 330
const pairImageHeight = 220
const pairRowHeight = pairImageHeight + 34
const pairComposites = []
for (const [row, [group, beforePath, afterPath]] of comparisonGroups.entries()) {
  for (const [column, [side, relativePath]] of [['BEFORE', beforePath], ['AFTER', afterPath]].entries()) {
    const left = column * pairCellWidth
    const top = row * pairRowHeight
    pairComposites.push({ input: await thumb(path.join(beitRoot, relativePath), pairCellWidth - 8, pairImageHeight - 8), left: left + 4, top: top + 4 })
    pairComposites.push({ input: label(`${group} / ${side}`, pairCellWidth), left, top: top + pairImageHeight })
  }
}
await sharp({ create: { width: pairCellWidth * 2, height: pairRowHeight * comparisonGroups.length, channels: 3, background: '#111312' } })
  .composite(pairComposites)
  .jpeg({ quality: 84, chromaSubsampling: '4:4:4' })
  .toFile(path.join(outputRoot, 'verified-comparisons.jpg'))

const candidateGroups = [
  ['Confirmed roof pair', path.join(root, 'client-media-archive', 'BEIT AL RAZZAZ', 'Phase 1', 'WhatsApp Image 2025-12-30 21.jpeg'), path.join(root, 'public', 'assets', 'projects', 'portfolio', 'Qaitbay’s Seat Main Hall', 'Golden-Hour Rooftop Glass Pavilion.png')],
  ['Roof angle B', path.join(root, 'client-media-archive', 'BEIT AL RAZZAZ', 'Phase 1', 'WhatsApp Image 2025-12-30 24.jpeg'), path.join(beitRoot, 'IMG_7862.JPG.jpeg')],
  ['Roof frontal', path.join(root, 'client-media-archive', 'BEIT AL RAZZAZ', 'Phase 1', 'WhatsApp Image 2025-12-30 21.jpeg'), path.join(beitRoot, 'IMG_7880.JPG.jpeg')],
]
const candidateCellWidth = 700
const candidateImageHeight = 430
const candidateRowHeight = candidateImageHeight + 34
const candidateComposites = []
for (const [row, [group, beforeFile, afterFile]] of candidateGroups.entries()) {
  for (const [column, [side, file]] of [['BEFORE CANDIDATE', beforeFile], ['NEW PHOTO', afterFile]].entries()) {
    const left = column * candidateCellWidth
    const top = row * candidateRowHeight
    candidateComposites.push({ input: await thumb(file, candidateCellWidth - 8, candidateImageHeight - 8), left: left + 4, top: top + 4 })
    candidateComposites.push({ input: label(`${group} / ${side}`, candidateCellWidth), left, top: top + candidateImageHeight })
  }
}
await sharp({ create: { width: candidateCellWidth * 2, height: candidateRowHeight * candidateGroups.length, channels: 3, background: '#111312' } })
  .composite(candidateComposites)
  .jpeg({ quality: 84, chromaSubsampling: '4:4:4' })
  .toFile(path.join(outputRoot, 'roof-candidate-pairs.jpg'))

await writeFile(path.join(outputRoot, 'audit.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), records }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ discovered: records.length, records }, null, 2))
