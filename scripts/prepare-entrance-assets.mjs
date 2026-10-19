import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const generatedDirectory = path.join(root, 'public', 'assets', 'generated')
const brandDirectory = path.join(root, 'public', 'assets', 'brand')
const heroWidths = [960, 1440]
const mobileCropWidth = 640
const mobileFocus = [0.58, 0.62, 0.67, 0.58]

await mkdir(generatedDirectory, { recursive: true })

const heroFiles = (await readdir(generatedDirectory))
  .filter((file) => /^hero-\d{2}-.+\.png$/i.test(file))
  .sort()

if (heroFiles.length !== 4) {
  throw new Error(`Expected four hero PNG sources, found ${heroFiles.length}.`)
}

for (const [index, file] of heroFiles.entries()) {
  const source = path.join(generatedDirectory, file)
  const metadata = await sharp(source).metadata()
  const stem = path.parse(file).name

  for (const width of heroWidths.filter((candidate) => candidate < (metadata.width ?? 0))) {
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 86, effort: 6, smartSubsample: true })
      .toFile(path.join(generatedDirectory, `${stem}-${width}.webp`))
  }

  await sharp(source)
    .webp({ quality: 86, effort: 6, smartSubsample: true })
    .toFile(path.join(generatedDirectory, `${stem}.webp`))

  const left = Math.round(((metadata.width ?? mobileCropWidth) - mobileCropWidth) * mobileFocus[index])
  await sharp(source)
    .extract({ left, top: 0, width: mobileCropWidth, height: metadata.height })
    .webp({ quality: 86, effort: 6, smartSubsample: true })
    .toFile(path.join(generatedDirectory, `${stem}-mobile.webp`))
}

await sharp(path.join(brandDirectory, 'summit-logo-gold.png'))
  .resize({ height: 560, withoutEnlargement: true })
  .webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true })
  .toFile(path.join(brandDirectory, 'summit-logo-gold-intro.webp'))

await sharp(path.join(brandDirectory, 'summit-logo-dark.png'))
  .resize({ height: 240, withoutEnlargement: true })
  .webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true })
  .toFile(path.join(brandDirectory, 'summit-logo-dark-ui.webp'))

const outputs = [
  ...(await readdir(generatedDirectory)).filter((file) => /^hero-\d{2}-.+\.webp$/i.test(file)).map((file) => path.join(generatedDirectory, file)),
  path.join(brandDirectory, 'summit-logo-gold-intro.webp'),
  path.join(brandDirectory, 'summit-logo-dark-ui.webp'),
]

for (const output of outputs.sort()) {
  const [metadata, fileStats] = await Promise.all([sharp(output).metadata(), stat(output)])
  if (metadata.format !== 'webp') throw new Error(`${output} did not encode as WebP.`)
  console.log(`${path.relative(root, output)} | ${metadata.width}x${metadata.height} | ${fileStats.size} bytes`)
}
