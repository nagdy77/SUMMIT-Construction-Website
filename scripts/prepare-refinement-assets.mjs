import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve('public', 'assets', 'projects')
const outputDirectory = path.join(root, 'featured', 'real-media')
const selections = [
  ['portfolio/mohamed-ali-palace/01-1202.webp', 'hero-restoration-mobile-640.webp'],
  ['portfolio/new-capital-administrations-district/01-1312.webp', 'hero-construction-mobile-640.webp'],
  ['portfolio/lakeview-residence/03-1206.webp', 'hero-residential-mobile-640.webp'],
  ['portfolio/desigual/02-1188.webp', 'hero-retail-mobile-640.webp'],
]

await mkdir(outputDirectory, { recursive: true })

for (const [source, output] of selections) {
  await sharp(path.join(root, source))
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 74, effort: 5, smartSubsample: true })
    .toFile(path.join(outputDirectory, output))
}

console.log(`Prepared ${selections.length} mobile hero derivatives in ${outputDirectory}.`)
