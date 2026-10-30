import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const source = path.resolve('public', 'assets', 'brand', 'summit-logo-dark.png')
const output = path.resolve('public', 'assets', 'brand', 'summit-mountain-symbol.webp')
const sha256 = async (file) => createHash('sha256').update(await readFile(file)).digest('hex').toUpperCase()

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const populatedRows = []
for (let y = 0; y < info.height; y += 1) {
  let hasVisiblePixel = false
  for (let x = 0; x < info.width; x += 1) {
    if (data[(y * info.width + x) * 4 + 3] > 8) {
      hasVisiblePixel = true
      break
    }
  }
  if (hasVisiblePixel) populatedRows.push(y)
}

const rowRanges = []
let rangeStart = populatedRows[0]
let previousRow = populatedRows[0]
for (const row of populatedRows.slice(1)) {
  if (row !== previousRow + 1) {
    rowRanges.push([rangeStart, previousRow])
    rangeStart = row
  }
  previousRow = row
}
rowRanges.push([rangeStart, previousRow])

const [mountainTop, mountainBottom] = rowRanges[0]
let mountainLeft = info.width
let mountainRight = -1
for (let y = mountainTop; y <= mountainBottom; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    if (data[(y * info.width + x) * 4 + 3] > 8) {
      mountainLeft = Math.min(mountainLeft, x)
      mountainRight = Math.max(mountainRight, x)
    }
  }
}

const crop = {
  left: mountainLeft,
  top: mountainTop,
  width: mountainRight - mountainLeft + 1,
  height: mountainBottom - mountainTop + 1,
}

await sharp(source)
  .extract(crop)
  .resize({ width: 480, withoutEnlargement: true, fit: 'inside', kernel: sharp.kernel.lanczos3 })
  .webp({ lossless: true, effort: 6 })
  .toFile(output)
const outputMetadata = await sharp(output).metadata()

console.log(JSON.stringify({
  source: path.relative(process.cwd(), source).split(path.sep).join('/'),
  sourceSha256: await sha256(source),
  output: path.relative(process.cwd(), output).split(path.sep).join('/'),
  outputSha256: await sha256(output),
  outputBytes: (await stat(output)).size,
  crop,
  outputDimensions: [outputMetadata.width, outputMetadata.height],
  treatment: 'Cropped from the first isolated alpha component of the official dark logo and uniformly downscaled for the web; no redraw, recolouring, or proportional geometry changes.',
}, null, 2))
