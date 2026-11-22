import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const beitRoot = path.join(root, 'public', 'assets', 'projects', 'portfolio', 'beit-al-razzaz')
const outputRoot = path.join(root, 'references', 'qa', 'beit-full-audit')

const westernSources = [
  'E3-01-37-03 / 1..jpg', 'E3-01-37-03 / 1.jpg',
  'E3-01-37-07 / 1 / 2025.01.27 - E3-1-15-02 (7).jpg', 'E3-01-37-07 / 1 / DSC_6738.jpg',
  'E3-01-37-07 / 2 / 2..jpg', 'E3-01-37-07 / 2 / 2.jpg',
  'E3-01-37-07 / 3 / 3...jpg', 'E3-01-37-07 / 3 / 3.jpg',
  'E3-01-37-09 / 1 / 09..jpg', 'E3-01-37-09 / 1 / 09.jpg',
  'E3-01-37-09 / 2 / 09...2.jpg', 'E3-01-37-09 / 2 / 09..2.jpg',
  'western wing / before & After / 3 / DSC_6623.JPG.jpeg',
  'western wing / IMG_0631.JPG', 'western wing / IMG_0636.JPG', 'western wing / IMG_7382.JPG',
]

const northernSources = [
  'legacy optimized / source mapping unavailable / 01',
  'legacy optimized / source mapping unavailable / 02',
  'legacy optimized / source mapping unavailable / 03',
  'legacy optimized / source mapping unavailable / 04',
  'legacy optimized / source mapping unavailable / 05',
  'northern side / after / 1 / DSC_0528.JPG',
  'northern side / after / 1 / DSC_0718.JPG',
  'northern side / after / 2 / DSC_0532.JPG',
  'northern side / after / 2 / DSC_2358.JPG',
  'northern side / after / DSC_0406.JPG',
  'northern side / after / DSC_0417.JPG',
  'northern side / after / DSC_0536.JPG',
  'IMG_7862.JPG.jpeg',
  'IMG_7880.JPG.jpeg',
]

const carpentrySources = [
  'Carpentry Workshop / Warm Stone Restoration Interior.png',
  'Carpentry Workshop / Gothic Stone Room in Warm Light.png',
  'Carpentry Workshop / Rustic Timber and Stone Ceiling.png',
  'Carpentry Workshop / Cinematic Stone Hall with Arched Windows.png',
  'Carpentry Workshop / Historic Stone Corridor with Timber Door.png',
  'Carpentry Workshop / Rustic Walnut Beam Ceiling.png',
  'Carpentry Workshop / ceiling / DSCF3583.JPG',
  'Carpentry Workshop / ceiling / DSCF3585.JPG',
  'Carpentry Workshop / IMG_6971.JPG',
  'Carpentry Workshop / IMG_6983.JPG',
  'Carpentry Workshop / perspective 1 / Before.JPG',
]

const qaitbaySources = [
  'Qaitbay Main Hall / Restoring an Ornate Historic Ceiling.png',
  'Qaitbay Main Hall / Meticulous Mural Restoration in Warm Light.png',
  'Qaitbay Main Hall / Ornate Wall Restoration Test Grid.png',
  'Qaitbay Main Hall / Ceiling Restoration Conservators at Work.png',
  'Qaitbay Main Hall / Golden-Hour Rooftop Glass Pavilion.png',
  'Qaitbay Main Hall / Symmetrical Warm Wood Atrium Skylight.png',
  'Qaitbay Main Hall / DSC_5768.JPG', 'Qaitbay Main Hall / DSC_5887.JPG',
  'Qaitbay Main Hall / DSC_9053.JPG', 'Qaitbay Main Hall / IMG_2001.JPG',
  'Qaitbay Main Hall / IMG_6629.JPG', 'Qaitbay Main Hall / IMG_7150.JPG',
  'Qaitbay Main Hall / IMG_7195.JPG', 'Qaitbay Main Hall / IMG_7233.JPG',
  'Qaitbay Main Hall / IMG_7267.JPG', 'Qaitbay Main Hall / IMG_8374.JPG',
  'Qaitbay Main Hall / IMG_8941.JPG',
]

const archiveSources = ['1.jpg', '1970-1972.jpg', '5.jpg']

const comparisonSources = [
  ['Northern 01', 'E3-00-27-01 / 1 / E3-1-27-01 (7).jpg', 'E3-00-27-01 / 1 / DSC_6653.jpg'],
  ['Northern 02', 'E3-00-27-01 / 2 / 2..jpg', 'E3-00-27-01 / 2 / 2.jpg'],
  ['Northern 03', 'E3-00-27-01 / 3 / E3-1-27-01 (6).jpg', 'E3-00-27-01 / 3 / 3.jpg'],
  ['Northern 04', 'Phase 1 / WhatsApp Image 2025-12-30 21.jpeg', 'Qaitbay Main Hall / Golden-Hour Rooftop Glass Pavilion.png'],
  ['Western 01', 'E3-01-37-05 / DSC_3207.jpg', 'E3-01-37-05 / DSC_6699.JPG'],
  ['Western 02', 'western wing / before & After / 1 / E3-1-37-07 (29).jpg.jpeg', 'western wing / before & After / 1 / DSC_6741.JPG.jpeg'],
  ['Western 03', 'western wing / before & After / 2 / DSC_1467.JPG.jpeg', 'western wing / before & After / 2 / DSC_6627.JPG.jpeg'],
  ['Carpentry 01', 'Carpentry Workshop / perspective 1 / Before.JPG', 'Carpentry Workshop / Warm Stone Restoration Interior.png'],
]

await mkdir(outputRoot, { recursive: true })

const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const splitLabel = (value, max = 48) => {
  const words = value.split(' ')
  const lines = ['']
  for (const word of words) {
    const current = lines.at(-1)
    if (current && `${current} ${word}`.length > max && lines.length < 2) lines.push(word)
    else lines[lines.length - 1] = current ? `${current} ${word}` : word
  }
  return lines
}
const labelSvg = (title, source, width) => {
  const [first, second = ''] = splitLabel(source)
  return Buffer.from(`<svg width="${width}" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#202221"/><text x="10" y="17" fill="#d5b452" font-family="Arial,sans-serif" font-size="12" font-weight="700">${escapeXml(title)}</text><text x="10" y="36" fill="#f3f1ec" font-family="Arial,sans-serif" font-size="11">${escapeXml(first)}</text><text x="10" y="53" fill="#f3f1ec" font-family="Arial,sans-serif" font-size="11">${escapeXml(second)}</text></svg>`)
}
const thumb = (file, width, height) => sharp(file).rotate().resize({ width, height, fit: 'contain', background: '#111312' }).jpeg({ quality: 84, chromaSubsampling: '4:4:4' }).toBuffer()

async function optimizedFile(folder, index) {
  const stem = String(index).padStart(2, '0')
  const directory = path.join(beitRoot, folder)
  const entries = await readdir(directory)
  const candidates = entries.filter((name) => name.startsWith(`${stem}-`) && name.endsWith('.webp'))
  const preferred = candidates.find((name) => name.includes('-large'))
    ?? candidates.filter((name) => !name.includes('-small') && !name.includes('-720')).sort((a, b) => b.localeCompare(a))[0]
    ?? candidates[0]
  if (!preferred) throw new Error(`No optimized image found for ${folder}/${stem}`)
  return path.join(directory, preferred)
}

async function gallerySheet(name, folder, sources) {
  const columns = 4
  const cellWidth = 360
  const imageHeight = 248
  const cellHeight = imageHeight + 64
  const rows = Math.ceil(sources.length / columns)
  const composites = []
  const records = []
  for (const [offset, source] of sources.entries()) {
    const index = offset + 1
    const file = await optimizedFile(folder, index)
    const column = offset % columns
    const row = Math.floor(offset / columns)
    const left = column * cellWidth
    const top = row * cellHeight
    const metadata = await sharp(file).metadata()
    records.push({ section: name, index, source, optimized: path.relative(root, file), width: metadata.width, height: metadata.height })
    composites.push({ input: await thumb(file, cellWidth - 8, imageHeight - 8), left: left + 4, top: top + 4 })
    composites.push({ input: labelSvg(`${name} / ${String(index).padStart(2, '0')}`, source, cellWidth), left, top: top + imageHeight })
  }
  await sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 3, background: '#111312' } })
    .composite(composites)
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toFile(path.join(outputRoot, `${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}.jpg`))
  return records
}

async function comparisonSheet() {
  const cellWidth = 560
  const imageHeight = 360
  const cellHeight = imageHeight + 64
  const composites = []
  const records = []
  for (const [row, [name, beforeSource, afterSource]] of comparisonSources.entries()) {
    const section = name.startsWith('Northern') ? 'phase-1-northern/comparisons' : name.startsWith('Western') ? 'phase-2-western-wing/comparisons' : 'carpentry-workshop'
    const stem = name.split(' ')[1]
    const paths = name.startsWith('Carpentry')
      ? [await optimizedFile(section, 11), await optimizedFile(section, 1)]
      : [path.join(beitRoot, section, `${stem}-before-large.webp`), path.join(beitRoot, section, `${stem}-after-large.webp`)]
    for (const [column, [stage, source, file]] of [['BEFORE', beforeSource, paths[0]], ['AFTER', afterSource, paths[1]]].entries()) {
      const left = column * cellWidth
      const top = row * cellHeight
      composites.push({ input: await thumb(file, cellWidth - 8, imageHeight - 8), left: left + 4, top: top + 4 })
      composites.push({ input: labelSvg(`${name} / ${stage}`, source, cellWidth), left, top: top + imageHeight })
      records.push({ comparison: name, stage, source, optimized: path.relative(root, file) })
    }
  }
  await sharp({ create: { width: cellWidth * 2, height: cellHeight * comparisonSources.length, channels: 3, background: '#111312' } })
    .composite(composites)
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toFile(path.join(outputRoot, 'existing-comparisons.jpg'))
  return records
}

const records = [
  ...await gallerySheet('Northern Gallery', 'northern-side', northernSources),
  ...await gallerySheet('Western Gallery', 'phase-2-western-wing/gallery', westernSources),
  ...await gallerySheet('Carpentry Gallery', 'carpentry-workshop', carpentrySources),
  ...await gallerySheet('Qaitbay Gallery', 'qaitbay-main-hall', qaitbaySources),
  ...await gallerySheet('Archive Gallery', 'archive-views', archiveSources),
]
const comparisons = await comparisonSheet()
await writeFile(path.join(outputRoot, 'media-map.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), records, comparisons }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ galleries: records.length, comparisons: comparisons.length / 2, outputRoot }, null, 2))
