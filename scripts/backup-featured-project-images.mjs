import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const workspace = process.cwd()
const sourceRoot = path.join(workspace, 'public', 'assets', 'projects', 'featured')
const destinationRoot = path.resolve(process.argv[2] ?? '')

if (!process.argv[2]) throw new Error('Provide an absolute backup directory.')
if (destinationRoot.startsWith(`${workspace}${path.sep}`)) {
  throw new Error('The backup directory must be outside the workspace.')
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  }))
  return nested.flat()
}

function hash(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

const files = (await walk(sourceRoot)).sort()
if (files.length !== 9) throw new Error(`Expected 9 featured assets; found ${files.length}.`)

await mkdir(path.dirname(destinationRoot), { recursive: true })
await mkdir(destinationRoot)

const manifest = {
  createdAt: new Date().toISOString(),
  sourceRoot,
  backupRoot: destinationRoot,
  files: [],
}

for (const sourcePath of files) {
  const relativePath = path.relative(sourceRoot, sourcePath)
  const backupPath = path.join(destinationRoot, relativePath)
  await mkdir(path.dirname(backupPath), { recursive: true })
  await copyFile(sourcePath, backupPath)

  const [sourceBuffer, backupBuffer] = await Promise.all([
    readFile(sourcePath),
    readFile(backupPath),
  ])
  const [sourceMetadata, backupMetadata] = await Promise.all([
    sharp(sourceBuffer, { failOn: 'error' }).metadata(),
    sharp(backupBuffer, { failOn: 'error' }).metadata(),
  ])
  const sourceHash = hash(sourceBuffer)
  const backupHash = hash(backupBuffer)

  if (sourceHash !== backupHash) throw new Error(`Backup checksum mismatch: ${relativePath}`)
  if (sourceMetadata.width !== backupMetadata.width || sourceMetadata.height !== backupMetadata.height) {
    throw new Error(`Backup dimensions mismatch: ${relativePath}`)
  }

  manifest.files.push({
    relativePath: relativePath.split(path.sep).join('/'),
    bytes: sourceBuffer.length,
    sha256: sourceHash,
    format: sourceMetadata.format,
    width: sourceMetadata.width,
    height: sourceMetadata.height,
  })
}

await writeFile(path.join(destinationRoot, 'backup-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Backed up and verified ${manifest.files.length} featured assets at ${destinationRoot}`)
