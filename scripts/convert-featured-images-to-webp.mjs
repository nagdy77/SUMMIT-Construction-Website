import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const QUALITY = 88
const workspace = process.cwd()
const mappingPath = path.join(workspace, 'references', 'project-image-mapping.json')
const conversionReportPath = path.join(workspace, 'references', 'featured-project-conversion.json')
const backupManifestPath = path.resolve(process.argv[2] ?? '')

if (!process.argv[2]) throw new Error('Provide the absolute backup manifest path.')

function hash(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function isWebp(buffer) {
  return buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP'
}

const mapping = JSON.parse(await readFile(mappingPath, 'utf8'))
const backupManifest = JSON.parse(await readFile(backupManifestPath, 'utf8'))

if (mapping.assets.length !== 9 || backupManifest.files.length !== 9) {
  throw new Error('Expected nine mapping records and nine backup records.')
}

const backupByRelativePath = new Map(
  backupManifest.files.map((file) => [file.relativePath, file]),
)
const conversions = []

for (const asset of mapping.assets) {
  const outputPath = path.join(workspace, ...asset.output.split('/'))
  const relativePath = path.posix.relative(mapping.outputRoot, asset.output)
  const backupRecord = backupByRelativePath.get(relativePath)

  if (!backupRecord) throw new Error(`Backup record missing for ${relativePath}.`)

  const inputBuffer = await readFile(outputPath)
  const inputMetadata = await sharp(inputBuffer, { failOn: 'error' }).metadata()

  if (hash(inputBuffer) !== backupRecord.sha256) {
    throw new Error(`Working input no longer matches its verified backup: ${relativePath}`)
  }
  if (inputMetadata.width !== backupRecord.width || inputMetadata.height !== backupRecord.height) {
    throw new Error(`Working dimensions no longer match the verified backup: ${relativePath}`)
  }

  const outputBuffer = await sharp(inputBuffer, { failOn: 'error' })
    .keepIccProfile()
    .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
    .toBuffer()
  const outputMetadata = await sharp(outputBuffer, { failOn: 'error' }).metadata()

  if (!isWebp(outputBuffer) || outputMetadata.format !== 'webp') {
    throw new Error(`Encoder did not produce genuine WebP data: ${relativePath}`)
  }
  if (outputMetadata.width !== inputMetadata.width || outputMetadata.height !== inputMetadata.height) {
    throw new Error(`Dimensions changed during conversion: ${relativePath}`)
  }

  conversions.push({
    asset,
    outputPath,
    relativePath,
    input: {
      format: inputMetadata.format,
      width: inputMetadata.width,
      height: inputMetadata.height,
      bytes: inputBuffer.length,
      sha256: hash(inputBuffer),
    },
    output: {
      format: outputMetadata.format,
      width: outputMetadata.width,
      height: outputMetadata.height,
      quality: QUALITY,
      bytes: outputBuffer.length,
      sha256: hash(outputBuffer),
      signature: 'RIFF....WEBP',
    },
    outputBuffer,
  })
}

for (const conversion of conversions) {
  await writeFile(conversion.outputPath, conversion.outputBuffer)
}

for (const conversion of conversions) {
  const savedBuffer = await readFile(conversion.outputPath)
  const savedMetadata = await sharp(savedBuffer, { failOn: 'error' }).metadata()

  if (!isWebp(savedBuffer) || savedMetadata.format !== 'webp') {
    throw new Error(`Saved file is not genuine WebP: ${conversion.relativePath}`)
  }
  if (savedMetadata.width !== conversion.input.width || savedMetadata.height !== conversion.input.height) {
    throw new Error(`Saved dimensions changed: ${conversion.relativePath}`)
  }
  if (hash(savedBuffer) !== conversion.output.sha256) {
    throw new Error(`Saved checksum mismatch: ${conversion.relativePath}`)
  }
}

mapping.generatedAt = new Date().toISOString()
mapping.backup = {
  root: backupManifest.backupRoot,
  manifest: backupManifestPath,
  verifiedBeforeConversion: true,
}
mapping.policy = {
  format: 'webp',
  quality: QUALITY,
  resize: 'none',
  crop: 'none',
  dimensions: 'preserved from enhanced input',
  colourProfile: 'embedded ICC profile preserved when present',
}

for (const conversion of conversions) {
  conversion.asset.enhancedInput = {
    backupRelativePath: conversion.relativePath,
    ...conversion.input,
  }
  conversion.asset.optimized = conversion.output
}

const conversionReport = {
  generatedAt: mapping.generatedAt,
  quality: QUALITY,
  backup: mapping.backup,
  totals: {
    files: conversions.length,
    inputBytes: conversions.reduce((sum, conversion) => sum + conversion.input.bytes, 0),
    outputBytes: conversions.reduce((sum, conversion) => sum + conversion.output.bytes, 0),
  },
  files: conversions.map(({ relativePath, input, output }) => ({ relativePath, input, output })),
}

await writeFile(mappingPath, `${JSON.stringify(mapping, null, 2)}\n`)
await writeFile(conversionReportPath, `${JSON.stringify(conversionReport, null, 2)}\n`)

for (const conversion of conversions) {
  console.log(`${conversion.relativePath} | ${conversion.input.width}x${conversion.input.height} | ${Math.round(conversion.input.bytes / 1024)} KiB -> ${Math.round(conversion.output.bytes / 1024)} KiB`)
}
console.log(`Converted and verified ${conversions.length} files at WebP quality ${QUALITY}.`)
