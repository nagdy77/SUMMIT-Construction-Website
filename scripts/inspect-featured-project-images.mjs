import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.join(process.cwd(), 'public', 'assets', 'projects', 'featured')

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  }))
  return nested.flat()
}

const files = (await walk(root)).filter((file) => /\.(?:png|jpe?g|webp)$/i.test(file)).sort()
let decoded = 0

for (const file of files) {
  try {
    const [metadata, fileStat] = await Promise.all([
      sharp(file, { failOn: 'error' }).metadata(),
      stat(file),
    ])
    console.log([
      path.relative(root, file),
      metadata.format,
      `${metadata.width}x${metadata.height}`,
      `${Math.round(fileStat.size / 1024)} KiB`,
    ].join(' | '))
    decoded += 1
  } catch (error) {
    console.error(`${file} | DECODE FAILED | ${error instanceof Error ? error.message : String(error)}`)
  }
}

console.log(`Decoded ${decoded} of ${files.length} assets successfully.`)

if (decoded !== files.length) process.exitCode = 1
