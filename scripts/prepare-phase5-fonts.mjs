import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = path.join(workspace, 'public', 'assets', 'fonts')
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const families = [
  {
    name: 'DM Sans',
    query: 'DM Sans:wght@400..700',
    license: 'https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt',
    licenseFile: 'dm-sans-OFL.txt',
    variants: [{ style: 'normal', filename: 'dm-sans-latin.woff2', weight: '400 700', subset: 'latin' }],
  },
  {
    name: 'Instrument Serif',
    query: 'Instrument Serif:ital@0;1',
    license: 'https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/OFL.txt',
    licenseFile: 'instrument-serif-OFL.txt',
    variants: [
      { style: 'normal', filename: 'instrument-serif-latin.woff2', weight: '400', subset: 'latin' },
      { style: 'italic', filename: 'instrument-serif-italic-latin.woff2', weight: '400', subset: 'latin' },
    ],
  },
  {
    name: 'IBM Plex Sans Arabic',
    query: 'IBM Plex Sans Arabic:wght@400;500;600;700',
    license: 'https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsansarabic/OFL.txt',
    licenseFile: 'ibm-plex-sans-arabic-OFL.txt',
    variants: [
      { style: 'normal', filename: 'ibm-plex-sans-arabic-regular.woff2', weight: '400', subset: 'arabic' },
      { style: 'normal', filename: 'ibm-plex-sans-arabic-medium.woff2', weight: '500', subset: 'arabic' },
      { style: 'normal', filename: 'ibm-plex-sans-arabic-semibold.woff2', weight: '600', subset: 'arabic' },
      { style: 'normal', filename: 'ibm-plex-sans-arabic-bold.woff2', weight: '700', subset: 'arabic' },
    ],
  },
]

async function fetchChecked(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent },
    signal: AbortSignal.timeout(25000),
  })
  if (!response.ok) throw new Error(`Request failed: ${response.status} ${url}`)
  return response
}

function selectSubsetVariant(css, subset, style, expectedWeight) {
  const subsetPattern = new RegExp(`/\\*\\s*${subset}\\s*\\*/\\s*@font-face\\s*\\{([^}]+)\\}`, 'g')
  const subsetBlocks = Array.from(css.matchAll(subsetPattern))
  const block = subsetBlocks.find((match) => {
    const foundStyle = match[1].match(/font-style:\s*([^;]+);/)?.[1].trim()
    const foundWeight = match[1].match(/font-weight:\s*([^;]+);/)?.[1].trim()
    return foundStyle === style && foundWeight === expectedWeight
  })?.[1]
  if (!block) throw new Error(`Missing exact ${subset} subset for ${style} ${expectedWeight}`)

  const source = block.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)\s*format\(['"]woff2['"]\)/)?.[1]
  const weight = block.match(/font-weight:\s*([^;]+);/)?.[1].trim()
  const unicodeRange = block.match(/unicode-range:\s*([^;]+);/)?.[1].trim()
  if (!source || !unicodeRange || weight !== expectedWeight) {
    throw new Error(`Unexpected font CSS: style=${style}, weight=${weight}, source=${source}`)
  }
  return { source, weight, unicodeRange }
}

await mkdir(outputDirectory, { recursive: true })
const assets = []
const licenses = []

for (const family of families) {
  const cssUrl = new URL('https://fonts.googleapis.com/css2')
  cssUrl.searchParams.set('family', family.query)
  cssUrl.searchParams.set('display', 'swap')
  const css = await (await fetchChecked(cssUrl)).text()
  const license = await (await fetchChecked(family.license)).text()
  if (!license.includes('SIL OPEN FONT LICENSE Version 1.1') || !license.includes('Copyright')) {
    throw new Error(`Unexpected license response for ${family.name}`)
  }
  await writeFile(path.join(outputDirectory, family.licenseFile), license, 'utf8')
  licenses.push({ family: family.name, source: family.license, filename: family.licenseFile, license: 'SIL Open Font License 1.1' })

  for (const variant of family.variants) {
    const metadata = selectSubsetVariant(css, variant.subset, variant.style, variant.weight)
    const buffer = Buffer.from(await (await fetchChecked(metadata.source)).arrayBuffer())
    if (buffer.toString('ascii', 0, 4) !== 'wOF2' || buffer.byteLength < 1024) {
      throw new Error(`Invalid WOFF2 payload for ${variant.filename}`)
    }
    if (buffer.readUInt32BE(8) !== buffer.byteLength) {
      throw new Error(`WOFF2 header length mismatch for ${variant.filename}`)
    }
    await writeFile(path.join(outputDirectory, variant.filename), buffer)
    const asset = {
      family: family.name,
      style: variant.style,
      filename: variant.filename,
      bytes: buffer.byteLength,
      sha256: createHash('sha256').update(buffer).digest('hex'),
      format: 'woff2',
      subset: variant.subset,
      weight: metadata.weight,
      unicodeRange: metadata.unicodeRange,
      cssSource: cssUrl.href,
      binarySource: metadata.source,
      licenseFile: family.licenseFile,
    }
    assets.push(asset)
    console.log(`${variant.filename}: ${(buffer.byteLength / 1024).toFixed(2)} KiB (${metadata.weight}, ${variant.style})`)
  }
}

const manifest = { generatedAt: new Date().toISOString(), assets, licenses }
await writeFile(path.join(outputDirectory, 'font-provenance.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

const readme = [
  '# SUMMIT self-hosted web fonts',
  '',
  'These unmodified WOFF2 files are the required Latin and Arabic subsets served by the official Google Fonts CSS API. DM Sans uses one variable normal-style file for weights 400–700. Instrument Serif uses one regular and one italic file at weight 400. IBM Plex Sans Arabic uses the Arabic subset at weights 400, 500, 600 and 700. CSS uses `font-display: swap`; no font service is contacted by the website at runtime.',
  '',
  'Both families are distributed under the SIL Open Font License 1.1. The complete upstream copyright notices and licenses are included beside the font files. The licenses allow embedding and redistribution with software while retaining those notices and license terms.',
  '',
  '| Local font | Style | Weight | Bytes | Official binary source |',
  '| --- | --- | --- | ---: | --- |',
  ...assets.map((asset) => `| ${asset.filename} | ${asset.style} | ${asset.weight} | ${asset.bytes.toLocaleString('en-US')} | [Google Fonts WOFF2](${asset.binarySource}) |`),
  '',
  '## Upstream licenses',
  '',
  ...licenses.map((license) => `- ${license.family}: [official OFL source](${license.source}); local copy: [${license.filename}](./${license.filename}).`),
  '',
  '## Reproduction and verification',
  '',
  'Run `node scripts/prepare-phase5-fonts.mjs` from the workspace. The script requests the official CSS for these families with a WOFF2-capable browser user agent, selects only the declared subset for each file, verifies the returned style and weight, downloads each official binary, and checks its WOFF2 signature and header length. `font-provenance.json` records CSS URLs, binary URLs, exact bytes, Unicode coverage, and SHA-256 checksums.',
  '',
  ...[...new Set(assets.map((asset) => asset.cssSource))].map((url) => `- [Official CSS request](${url})`),
  '',
  'Arabic pages use the self-hosted IBM Plex Sans Arabic files. Direction-aware system fallbacks remain available if a font file cannot load.',
  '',
].join('\n')
await writeFile(path.join(outputDirectory, 'README.md'), readme, 'utf8')
console.log(`Total font payload: ${(assets.reduce((total, asset) => total + asset.bytes, 0) / 1024).toFixed(2)} KiB`)
