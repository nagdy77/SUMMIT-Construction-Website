import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const outputPath = path.resolve(process.argv[2] ?? 'references/qa/image-performance/quality.json')
const changedFiles = execFileSync('git', ['diff', '--name-only'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter((file) => file.startsWith('public/assets/projects/portfolio/beit-al-razzaz/') && file.endsWith('-large.webp') && existsSync(file))

const comparisons = []
for (const file of changedFiles) {
  const current = sharp(file)
  const metadata = await current.metadata()
  const width = metadata.width
  const height = metadata.height
  if (!width || !height) throw new Error(`Missing dimensions for ${file}`)
  const previousBuffer = execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 })
  const [previousRaw, currentRaw] = await Promise.all([
    sharp(previousBuffer).resize({ width, height, fit: 'fill' }).removeAlpha().raw().toBuffer(),
    current.removeAlpha().raw().toBuffer(),
  ])
  let squaredError = 0
  let absoluteError = 0
  for (let index = 0; index < currentRaw.length; index += 1) {
    const difference = currentRaw[index] - previousRaw[index]
    squaredError += difference * difference
    absoluteError += Math.abs(difference)
  }
  const mse = squaredError / currentRaw.length
  const psnr = mse === 0 ? 99 : 10 * Math.log10((255 * 255) / mse)
  comparisons.push({
    file,
    width,
    height,
    previousBytes: previousBuffer.length,
    optimizedBytes: (await stat(file)).size,
    psnrDb: Number(psnr.toFixed(2)),
    meanAbsoluteError: Number((absoluteError / currentRaw.length).toFixed(3)),
  })
}

const report = {
  compared: comparisons.length,
  previousBytes: comparisons.reduce((sum, item) => sum + item.previousBytes, 0),
  optimizedBytes: comparisons.reduce((sum, item) => sum + item.optimizedBytes, 0),
  minimumPsnrDb: Math.min(...comparisons.map((item) => item.psnrDb)),
  averagePsnrDb: Number((comparisons.reduce((sum, item) => sum + item.psnrDb, 0) / comparisons.length).toFixed(2)),
  maximumMeanAbsoluteError: Math.max(...comparisons.map((item) => item.meanAbsoluteError)),
  comparisons,
}

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ outputPath, ...report, comparisons: undefined }, null, 2))
