import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const generated = path.join(root, 'public', 'assets', 'generated')
const responsiveWidths = [960, 1440]

await mkdir(generated, { recursive: true })

const sources = [
  { stem: 'parallax-01-geometry', mobileWidth: 640, focus: 0.58 },
  { stem: 'parallax-03-legacy', mobileWidth: 640 },
  { stem: 'contact-monumental', mobileWidth: 640, focus: 0.58 },
]

for (const { stem, mobileWidth, focus = 0.5 } of sources) {
  const source = path.join(generated, `${stem}.png`)
  const metadata = await sharp(source).metadata()
  const sourceWidth = metadata.width ?? 0
  const sourceHeight = metadata.height ?? 0

  for (const width of responsiveWidths.filter((candidate) => candidate < sourceWidth)) {
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 86, effort: 6, smartSubsample: true })
      .toFile(path.join(generated, `${stem}-${width}.webp`))
  }

  await sharp(source)
    .webp({ quality: 86, effort: 6, smartSubsample: true })
    .toFile(path.join(generated, `${stem}.webp`))

  if (sourceWidth > mobileWidth) {
    const left = Math.round((sourceWidth - mobileWidth) * focus)
    const cropHeight = Math.min(sourceHeight, stem === 'parallax-03-legacy' ? sourceHeight : 821)
    await sharp(source)
      .extract({ left, top: 0, width: mobileWidth, height: cropHeight })
      .webp({ quality: 86, effort: 6, smartSubsample: true })
      .toFile(path.join(generated, `${stem}-mobile.webp`))
  } else {
    await sharp(source)
      .resize({ width: mobileWidth, withoutEnlargement: true })
      .webp({ quality: 86, effort: 6, smartSubsample: true })
      .toFile(path.join(generated, `${stem}-mobile.webp`))
  }
}

const outputs = (await readdir(generated))
  .filter((file) => /^(parallax-01-geometry|parallax-03-legacy|contact-monumental).*\.webp$/i.test(file))
  .sort()

for (const file of outputs) {
  const output = path.join(generated, file)
  const [metadata, fileStats] = await Promise.all([sharp(output).metadata(), stat(output)])
  if (metadata.format !== 'webp') throw new Error(`${file} did not encode as WebP.`)
  console.log(`${file} | ${metadata.width}x${metadata.height} | ${fileStats.size} bytes`)
}
