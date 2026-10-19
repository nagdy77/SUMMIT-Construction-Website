import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const workspace = process.cwd()
const manifestPath = path.join(workspace, 'references', 'project-image-mapping.json')
const projectsDataPath = path.join(workspace, 'src', 'data', 'projects.ts')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const projectsData = await readFile(projectsDataPath, 'utf8')
const outputRoot = path.join(workspace, ...manifest.outputRoot.split('/'))

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  }))
  return nested.flat()
}

function isWebp(buffer) {
  return buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP'
}

const errors = []
const outputFiles = await walk(outputRoot)

if (outputFiles.length !== manifest.assets.length) {
  errors.push(`Expected ${manifest.assets.length} output files; found ${outputFiles.length}.`)
}

for (const asset of manifest.assets) {
  const outputPath = path.join(workspace, ...asset.output.split('/'))
  const outputBuffer = await readFile(outputPath)
  const outputMetadata = await sharp(outputBuffer, { failOn: 'error' }).metadata()
  const outputHash = createHash('sha256').update(outputBuffer).digest('hex')
  const publicPath = asset.output.replace(/^public/, '')

  if (path.extname(outputPath).toLowerCase() !== '.webp') errors.push(`${asset.output}: filename is not .webp.`)
  if (!isWebp(outputBuffer)) errors.push(`${asset.output}: RIFF/WEBP signature is missing.`)
  if (outputMetadata.format !== 'webp') errors.push(`${asset.output}: Sharp did not decode WebP data.`)
  if (outputMetadata.width !== asset.optimized.width || outputMetadata.height !== asset.optimized.height) {
    errors.push(`${asset.output}: dimensions do not match the manifest.`)
  }
  if (
    outputMetadata.width !== asset.enhancedInput.width
    || outputMetadata.height !== asset.enhancedInput.height
  ) {
    errors.push(`${asset.output}: dimensions changed from the enhanced input.`)
  }
  if (outputBuffer.length !== asset.optimized.bytes) errors.push(`${asset.output}: byte size does not match the manifest.`)
  if (outputHash !== asset.optimized.sha256) errors.push(`${asset.output}: checksum does not match the manifest.`)
  if (asset.optimized.quality !== manifest.policy.quality) errors.push(`${asset.output}: quality metadata is inconsistent.`)
  if (!projectsData.includes(publicPath)) errors.push(`${asset.output}: homepage project data does not reference this asset.`)
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Validated ${manifest.assets.length} featured assets: WebP signatures, decoding, preserved dimensions, checksums, metadata, and homepage references all pass.`)
}
