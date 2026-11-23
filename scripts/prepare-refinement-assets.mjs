import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve('public', 'assets', 'projects')
const outputDirectory = path.join(root, 'featured', 'real-media')
const selections = [
  ['portfolio/mohamed-ali-palace/01-1202.webp', 'hero-restoration-mobile'],
  ['portfolio/new-capital-administrations-district/01-1312.webp', 'hero-construction-mobile'],
  ['portfolio/lakeview-residence/03-1206.webp', 'hero-residential-mobile'],
  ['portfolio/desigual/02-1188.webp', 'hero-retail-mobile'],
]

await mkdir(outputDirectory, { recursive: true })

for (const [source, outputStem] of selections) {
  for (const width of [480, 640]) {
    await sharp(path.join(root, source))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: width === 480 ? 68 : 70, effort: 6, smartSubsample: true })
      .toFile(path.join(outputDirectory, `${outputStem}-${width}.webp`))
  }
}

console.log(`Prepared ${selections.length * 2} responsive mobile hero derivatives in ${outputDirectory}.`)
