import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const portfolioRoot = path.join(repositoryRoot, 'public', 'assets', 'projects', 'portfolio')
const beitRoot = path.join(portfolioRoot, 'beit-al-razzaz')
const documentationRoot = path.join(repositoryRoot, 'client-media-archive', 'BEIT AL RAZZAZ', 'restoration-documentation')

const beitEntries = await readdir(beitRoot, { withFileTypes: true })
const rawContainer = beitEntries
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('بيت الرزاز-'))
  .sort((a, b) => b.name.localeCompare(a.name, 'ar'))[0]
if (!rawContainer) throw new Error('The newly supplied Beit Al-Razzaz media folder was not found.')

const suppliedRoot = path.join(beitRoot, rawContainer.name, 'بيت الرزاز')
const westernRoot = path.join(suppliedRoot, 'الجناح الغربي')
const beforeAfterRoot = path.join(westernRoot, 'before & After')
const northernSourceRoot = path.join(suppliedRoot, 'الكتلة الشمالية', 'بعد')
const qaitbaySourceRoot = path.join(suppliedRoot, 'مقعد قايتباي القاعة الرئيسية')
const carpentrySourceRoot = path.join(suppliedRoot, 'ورشة لنجارة')

const portfolioEntries = await readdir(portfolioRoot, { withFileTypes: true })
const qaitbayExistingRoot = path.join(portfolioRoot, portfolioEntries.find((entry) => entry.isDirectory() && entry.name.startsWith('Qaitbay'))?.name ?? '')
const carpentryExistingRoot = path.join(portfolioRoot, portfolioEntries.find((entry) => entry.isDirectory() && entry.name === 'Carpentry Workshop')?.name ?? '')

async function optimizedCopies(source, outputDirectory, stem) {
  await mkdir(outputDirectory, { recursive: true })
  await Promise.all([
    sharp(source).rotate().resize({ width: 720, withoutEnlargement: true }).webp({ quality: 75, effort: 6, smartSubsample: true }).toFile(path.join(outputDirectory, `${stem}-small.webp`)),
    sharp(source).rotate().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 80, effort: 6, smartSubsample: true }).toFile(path.join(outputDirectory, `${stem}-large.webp`)),
  ])
}

async function optimizedDocumentationCopies(source, outputDirectory, stem) {
  await mkdir(outputDirectory, { recursive: true })
  await Promise.all([
    sharp(source).rotate().resize({ width: 720, withoutEnlargement: true }).webp({ quality: 74, effort: 6, smartSubsample: true }).toFile(path.join(outputDirectory, `${stem}-small.webp`)),
    sharp(source).rotate().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 79, effort: 6, smartSubsample: true }).toFile(path.join(outputDirectory, `${stem}-large.webp`)),
  ])
}

async function optimizedArchiveCopies(source, outputDirectory, stem) {
  await mkdir(outputDirectory, { recursive: true })
  await Promise.all([
    sharp(source).rotate().resize({ width: 720, withoutEnlargement: true }).webp({ quality: 70, effort: 6, smartSubsample: true }).toFile(path.join(outputDirectory, `${stem}-small.webp`)),
    sharp(source).rotate().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 72, effort: 6, smartSubsample: true }).toFile(path.join(outputDirectory, `${stem}-large.webp`)),
  ])
}

const documentationGroup = (code, ...parts) => path.join(documentationRoot, `${code}-20261111`, code, ...parts)

const northernComparisonOutput = path.join(beitRoot, 'phase-1-northern', 'comparisons')
const northernComparisons = [
  [documentationGroup('E3-00-27-01', '1', 'E3-1-27-01 (7).jpg'), '01-before'],
  [documentationGroup('E3-00-27-01', '1', 'DSC_6653.jpg'), '01-after'],
  [documentationGroup('E3-00-27-01', '2', '2..jpg'), '02-before'],
  [documentationGroup('E3-00-27-01', '2', '2.jpg'), '02-after'],
  [documentationGroup('E3-00-27-01', '3', 'E3-1-27-01 (6).jpg'), '03-before'],
  [documentationGroup('E3-00-27-01', '3', '3.jpg'), '03-after'],
]
for (const [source, outputStem] of northernComparisons) {
  await optimizedDocumentationCopies(source, northernComparisonOutput, outputStem)
}

const westernComparisonOutput = path.join(beitRoot, 'phase-2-western-wing', 'comparisons')
await optimizedDocumentationCopies(documentationGroup('E3-01-37-05', 'DSC_3207.jpg'), westernComparisonOutput, '01-before')
await optimizedDocumentationCopies(documentationGroup('E3-01-37-05', 'DSC_6699.JPG'), westernComparisonOutput, '01-after')
await optimizedCopies(path.join(beforeAfterRoot, '1', 'E3-1-37-07 (29).jpg.jpeg'), westernComparisonOutput, '02-before')
await optimizedCopies(path.join(beforeAfterRoot, '1', 'DSC_6741.JPG.jpeg'), westernComparisonOutput, '02-after')
await optimizedCopies(path.join(beforeAfterRoot, '2', 'DSC_1467.JPG.jpeg'), westernComparisonOutput, '03-before')
await optimizedCopies(path.join(beforeAfterRoot, '2', 'DSC_6627.JPG.jpeg'), westernComparisonOutput, '03-after')

const generalOutput = path.join(beitRoot, 'phase-2-western-wing', 'gallery')
const existingGeneral = [
  documentationGroup('E3-01-37-03', '1..jpg'),
  documentationGroup('E3-01-37-03', '1.jpg'),
  documentationGroup('E3-01-37-07', '1', '2025.01.27 - E3-1-15-02 (7).jpg'),
  documentationGroup('E3-01-37-07', '1', 'DSC_6738.jpg'),
  documentationGroup('E3-01-37-07', '2', '2..jpg'),
  documentationGroup('E3-01-37-07', '2', '2.jpg'),
  documentationGroup('E3-01-37-07', '3', '3...jpg'),
  documentationGroup('E3-01-37-07', '3', '3.jpg'),
  documentationGroup('E3-01-37-09', '1', '09..jpg'),
  documentationGroup('E3-01-37-09', '1', '09.jpg'),
  documentationGroup('E3-01-37-09', '2', '09...2.jpg'),
  documentationGroup('E3-01-37-09', '2', '09..2.jpg'),
]
for (let index = 0; index < existingGeneral.length; index += 1) {
  await optimizedDocumentationCopies(existingGeneral[index], generalOutput, String(index + 1).padStart(2, '0'))
}
const additionalGeneral = [
  path.join(beforeAfterRoot, '3', 'DSC_6623.JPG.jpeg'),
  path.join(westernRoot, 'IMG_0631.JPG'),
  path.join(westernRoot, 'IMG_0636.JPG'),
  path.join(westernRoot, 'IMG_7382.JPG'),
]
for (let index = 0; index < additionalGeneral.length; index += 1) {
  await optimizedCopies(additionalGeneral[index], generalOutput, String(existingGeneral.length + index + 1).padStart(2, '0'))
}

const northernOutput = path.join(beitRoot, 'northern-side')
const northernAdditions = [
  path.join(northernSourceRoot, '1', 'DSC_0528.JPG'),
  path.join(northernSourceRoot, '1', 'DSC_0718.JPG'),
  path.join(northernSourceRoot, '2', 'DSC_0532.JPG'),
  path.join(northernSourceRoot, '2', 'DSC_2358.JPG'),
  path.join(northernSourceRoot, 'DSC_0406.JPG'),
  path.join(northernSourceRoot, 'DSC_0417.JPG'),
  path.join(northernSourceRoot, 'DSC_0536.JPG'),
]
for (let index = 0; index < northernAdditions.length; index += 1) {
  await optimizedCopies(northernAdditions[index], northernOutput, String(index + 6).padStart(2, '0'))
}

const archiveOutput = path.join(beitRoot, 'archive-views')
for (const [index, filename] of ['1.jpg', '1970-1972.jpg', '5.jpg'].entries()) {
  await optimizedArchiveCopies(path.join(suppliedRoot, filename), archiveOutput, String(index + 1).padStart(2, '0'))
}

const qaitbayOutput = path.join(beitRoot, 'qaitbay-main-hall')
const qaitbayExisting = [
  'Restoring an Ornate Historic Ceiling.png',
  'Meticulous Mural Restoration in Warm Light.png',
  'Ornate Wall Restoration Test Grid.png',
  'Ceiling Restoration Conservators at Work.png',
  'Golden-Hour Rooftop Glass Pavilion.png',
  'Symmetrical Warm Wood Atrium Skylight.png',
]
const qaitbayNew = [
  'DSC_5768.JPG', 'DSC_5887.JPG', 'DSC_9053.JPG', 'IMG_2001.JPG', 'IMG_6629.JPG', 'IMG_7150.JPG',
  'IMG_7195.JPG', 'IMG_7233.JPG', 'IMG_7267.JPG', 'IMG_8374.JPG', 'IMG_8941.JPG',
]
for (let index = 0; index < qaitbayExisting.length; index += 1) {
  await optimizedCopies(path.join(qaitbayExistingRoot, qaitbayExisting[index]), qaitbayOutput, String(index + 1).padStart(2, '0'))
}
for (let index = 0; index < qaitbayNew.length; index += 1) {
  await optimizedCopies(path.join(qaitbaySourceRoot, qaitbayNew[index]), qaitbayOutput, String(qaitbayExisting.length + index + 1).padStart(2, '0'))
}

const carpentryOutput = path.join(beitRoot, 'carpentry-workshop')
const carpentryExisting = [
  'Warm Stone Restoration Interior.png',
  'Gothic Stone Room in Warm Light.png',
  'Rustic Timber and Stone Ceiling.png',
  'Cinematic Stone Hall with Arched Windows.png',
  'Historic Stone Corridor with Timber Door.png',
  'Rustic Walnut Beam Ceiling.png',
]
const carpentryNew = [
  path.join(carpentrySourceRoot, 'ceiling', 'DSCF3583.JPG'),
  path.join(carpentrySourceRoot, 'ceiling', 'DSCF3585.JPG'),
  path.join(carpentrySourceRoot, 'IMG_6971.JPG'),
  path.join(carpentrySourceRoot, 'IMG_6983.JPG'),
  path.join(carpentrySourceRoot, 'perspective 1', 'Before.JPG'),
]
for (let index = 0; index < carpentryExisting.length; index += 1) {
  await optimizedCopies(path.join(carpentryExistingRoot, carpentryExisting[index]), carpentryOutput, String(index + 1).padStart(2, '0'))
}
for (let index = 0; index < carpentryNew.length; index += 1) {
  await optimizedCopies(carpentryNew[index], carpentryOutput, String(carpentryExisting.length + index + 1).padStart(2, '0'))
}

console.log(JSON.stringify({
  northernComparisons: 3,
  westernWingComparisons: 3,
  westernWingPhotos: 16,
  northernSideAdditions: northernAdditions.length,
  archiveViews: 3,
  qaitbayMainHallPhotos: qaitbayExisting.length + qaitbayNew.length,
  carpentryPhotos: carpentryExisting.length + carpentryNew.length,
}, null, 2))
