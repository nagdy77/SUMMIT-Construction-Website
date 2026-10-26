import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const source = process.argv[2]
if (!source) throw new Error('Pass the company profile PDF path.')

const data = readFileSync(source)
const latin = data.toString('latin1')
const objects = new Map()
const objectPattern = /(\d+)\s+0\s+obj\b([\s\S]*?)endobj/g
for (const match of latin.matchAll(objectPattern)) objects.set(Number(match[1]), match[2])

const contentIds = [...latin.matchAll(/\/Contents\s+(\d+)\s+0\s+R/g)].map((match) => Number(match[1]))
const decodeLiteral = (value) => value
  .replace(/\\([()\\])/g, '$1')
  .replace(/\\n/g, '\n')
  .replace(/\\r/g, '\r')
  .replace(/\\t/g, '\t')
  .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(Number.parseInt(octal, 8)))

for (const id of [...new Set(contentIds)]) {
  const body = objects.get(id)
  if (!body) continue
  const streamStart = body.indexOf('stream')
  const streamEnd = body.lastIndexOf('endstream')
  if (streamStart < 0 || streamEnd < 0) continue
  const lineOffset = body[streamStart + 6] === '\r' && body[streamStart + 7] === '\n' ? 8 : 7
  const objectOffset = latin.indexOf(body)
  const byteStart = objectOffset + streamStart + lineOffset
  const byteEnd = objectOffset + streamEnd
  let stream = data.subarray(byteStart, byteEnd)
  if (body.includes('/FlateDecode')) stream = inflateSync(stream)
  const content = stream.toString('latin1')
  const text = [...content.matchAll(/BT([\s\S]*?)ET/g)]
    .flatMap((block) => [...block[1].matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map((entry) => decodeLiteral(entry[1])))
    .join(' ')
    .replace(/[\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text) console.log(`CONTENT ${id}: ${text}`)
}
