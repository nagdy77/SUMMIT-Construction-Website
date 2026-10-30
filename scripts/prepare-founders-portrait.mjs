import { constants, copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'

const inputArgument = process.argv[2]
if (!inputArgument) throw new Error('Provide the absolute path to the supplied founders PNG.')

const input = path.resolve(inputArgument)
const referenceDirectory = path.resolve('references', 'founders')
const publicDirectory = path.resolve('public', 'assets', 'about', 'founders')
const preservedOriginal = path.join(referenceDirectory, 'founders-monochrome-original.png')

const sha256 = async (file) => createHash('sha256').update(await readFile(file)).digest('hex').toUpperCase()
const inputMetadata = await sharp(input).metadata()
if (inputMetadata.width !== 1536 || inputMetadata.height !== 1024 || inputMetadata.format !== 'png') {
  throw new Error(`Unexpected source media: ${inputMetadata.width}x${inputMetadata.height} ${inputMetadata.format}`)
}

await Promise.all([
  mkdir(referenceDirectory, { recursive: true }),
  mkdir(publicDirectory, { recursive: true }),
])

try {
  await copyFile(input, preservedOriginal, constants.COPYFILE_EXCL)
} catch (error) {
  if (error?.code !== 'EEXIST') throw error
  if (await sha256(input) !== await sha256(preservedOriginal)) {
    throw new Error('The preserved original exists but does not match the supplied portrait.')
  }
}

const derivatives = []
for (const width of [960, 1536]) {
  const output = path.join(publicDirectory, `founders-monochrome-${width}.webp`)
  await sharp(input)
    .resize({ width, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90, effort: 6, smartSubsample: true })
    .toFile(output)
  const metadata = await sharp(output).metadata()
  derivatives.push({
    path: path.relative(process.cwd(), output).split(path.sep).join('/'),
    width: metadata.width,
    height: metadata.height,
    bytes: (await stat(output)).size,
    sha256: await sha256(output),
  })
}

const manifest = {
  source: {
    path: path.relative(process.cwd(), preservedOriginal).split(path.sep).join('/'),
    width: inputMetadata.width,
    height: inputMetadata.height,
    bytes: (await stat(preservedOriginal)).size,
    sha256: await sha256(preservedOriginal),
    treatment: 'Byte-identical preserved client-supplied PNG; no image edits.',
  },
  derivatives,
  approval: {
    portrait: 'Pending founder approval as an AI-composited portrait.',
    arabicQuotes: 'Pending client approval.',
  },
}

await writeFile(path.join(referenceDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(manifest, null, 2))
