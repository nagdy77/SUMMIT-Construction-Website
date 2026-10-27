import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import sharp from 'sharp'

const referencePath = 'references/pattern-correction/client-approved-pattern.png'
const tilePath = 'public/assets/patterns/summit-reference-pattern.png'
const maskPath = 'public/assets/patterns/summit-reference-pattern-mask.png'

const [reference, tile, mask, css] = await Promise.all([
  readFile(referencePath),
  readFile(tilePath),
  sharp(maskPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  readFile('src/styles/globals.css', 'utf8'),
])

assert.equal(reference.equals(tile), true, 'Production pattern must be the exact client-supplied file, byte for byte')
assert.equal(mask.info.width, 485)
assert.equal(mask.info.height, 358)
assert.match(css, /summit-reference-pattern\.png/)
assert.match(css, /summit-reference-pattern-mask\.png/)
assert.match(css, /485px 358px/)
assert.doesNotMatch(css, /97px 179px/)
assert.doesNotMatch(css, /97px 268px/)
assert.doesNotMatch(css, /summit-quotation-grid\.svg/)
await assert.rejects(access('public/assets/patterns/summit-quotation-grid.svg'), 'Legacy approximation must not remain publicly served')

const alphaValues = new Set()
for (let index = 3; index < mask.data.length; index += 4) alphaValues.add(mask.data[index])
assert.ok(alphaValues.size >= 8, 'Derived mask must preserve the supplied antialias coverage steps')
assert.ok(alphaValues.has(0) && alphaValues.has(255), 'Derived mask must preserve both the field and line core')

console.log('Verified the exact 485 x 358 client-approved PNG byte for byte, its derived mask, native CSS scale and zero legacy pattern references in website styles.')
