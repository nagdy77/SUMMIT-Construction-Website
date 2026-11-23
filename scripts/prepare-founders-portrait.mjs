import { constants, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'

const inputArgument = process.argv[2]
if (!inputArgument) throw new Error('Provide the absolute path to the supplied founders PNG.')

const input = path.resolve(inputArgument)
const referenceDirectory = path.resolve('references', 'founders')
const publicDirectory = path.resolve('public', 'assets', 'about', 'founders')
const relativeToReferenceDirectory = path.relative(referenceDirectory, input)
const inputIsAlreadyPreserved = relativeToReferenceDirectory !== ''
  && !relativeToReferenceDirectory.startsWith(`..${path.sep}`)
  && !path.isAbsolute(relativeToReferenceDirectory)
const preservedOriginal = inputIsAlreadyPreserved
  ? input
  : path.join(referenceDirectory, 'founders-current-original.png')

const sha256 = async (file) => createHash('sha256').update(await readFile(file)).digest('hex').toUpperCase()
const inputMetadata = await sharp(input).metadata()
const inputRatio = inputMetadata.width && inputMetadata.height ? inputMetadata.width / inputMetadata.height : 0
if (!inputMetadata.width || !inputMetadata.height || inputMetadata.format !== 'png' || inputRatio < 1.2 || inputRatio > 1.7) {
  throw new Error(`Unexpected source media: ${inputMetadata.width}x${inputMetadata.height} ${inputMetadata.format}`)
}

await Promise.all([
  mkdir(referenceDirectory, { recursive: true }),
  mkdir(publicDirectory, { recursive: true }),
])

if (!inputIsAlreadyPreserved) {
  try {
    await copyFile(input, preservedOriginal, constants.COPYFILE_EXCL)
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
    if (await sha256(input) !== await sha256(preservedOriginal)) {
      throw new Error('The preserved source exists but does not match the supplied portrait.')
    }
  }
}

const targetWidths = [...new Set([480, 960, inputMetadata.width])].sort((a, b) => a - b)
const expectedDerivativeNames = new Set(targetWidths.map((width) => `founders-${width}.webp`))
const existingDerivatives = await readdir(publicDirectory, { withFileTypes: true })
await Promise.all(existingDerivatives
  .filter((entry) => entry.isFile() && /^founders-\d+\.webp$/i.test(entry.name) && !expectedDerivativeNames.has(entry.name))
  .map((entry) => rm(path.join(publicDirectory, entry.name), { force: true })))

const derivatives = []
for (const width of targetWidths) {
  const output = path.join(publicDirectory, `founders-${width}.webp`)
  await sharp(input)
    .resize({ width, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, effort: 6, smartSubsample: true })
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
}

await writeFile(path.join(referenceDirectory, 'founders-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(manifest, null, 2))
