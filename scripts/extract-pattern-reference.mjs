import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const [sessionPath, outputPath, marker = 'PATTERN CORRECTION'] = process.argv.slice(2)

if (!sessionPath || !outputPath) {
  throw new Error('Usage: node scripts/extract-pattern-reference.mjs <session-jsonl> <output-png> [message-marker]')
}

const lines = (await readFile(sessionPath, 'utf8')).split(/\r?\n/)
const message = lines
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .map((entry) => entry.payload)
  .find((payload) => payload?.type === 'message'
    && payload.role === 'user'
    && payload.content?.some((item) => item.type === 'input_text' && item.text.includes(marker)))

const image = message?.content?.find((item) => item.type === 'input_image')
const match = image?.image_url?.match(/^data:image\/png;base64,(.+)$/s)

if (!match) throw new Error('The exact embedded PNG reference was not found.')

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, Buffer.from(match[1], 'base64'))
console.log(`Extracted exact reference to ${path.resolve(outputPath)}`)
