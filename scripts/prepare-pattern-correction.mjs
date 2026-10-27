import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const [
  referencePath = 'references/pattern-correction/client-approved-pattern.png',
  outputPath = 'public/assets/patterns/summit-reference-pattern.png',
  maskPath = 'public/assets/patterns/summit-reference-pattern-mask.png',
] = process.argv.slice(2)

await mkdir(path.dirname(outputPath), { recursive: true })
await copyFile(referencePath, outputPath)

const { data, info } = await sharp(outputPath)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const mask = Buffer.alloc(info.width * info.height * 4)

for (let source = 0, target = 0; source < data.length; source += 3, target += 4) {
  // The supplied PNG uses #707073 as its field and #67676a–#6f6f72 for
  // antialiased linework. Preserve those exact coverage steps as alpha.
  const alpha = Math.round(Math.min(1, Math.max(0, (112 - data[source]) / 9)) * 255)
  mask[target] = 255
  mask[target + 1] = 255
  mask[target + 2] = 255
  mask[target + 3] = alpha
}

await mkdir(path.dirname(maskPath), { recursive: true })
await sharp(mask, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
  .toFile(maskPath)

const metadata = await sharp(outputPath).metadata()
console.log(JSON.stringify({
  reference: path.resolve(referencePath),
  output: path.resolve(outputPath),
  mask: path.resolve(maskPath),
  width: metadata.width,
  height: metadata.height,
  format: metadata.format,
}, null, 2))
