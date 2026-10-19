import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

// Crop the unmodified browser captures so the copy fade can be reviewed alone.
const directory = path.resolve('references/qa/carousel-repair')
for (const name of ['desktop-hero-3', 'mobile-hero-3', 'desktop-gallery-ministries-district-1', 'mobile-gallery-ministries-district-1']) {
  const record = JSON.parse(await readFile(path.join(directory, `${name}-frames.json`), 'utf8'))
  const width = name.startsWith('mobile') ? 390 : 1440
  const height = name.startsWith('mobile') ? 844 : 900
  const copies = [record.screenshots[0].before, record.screenshots.at(-1).after]
    .flatMap((frame) => frame.copy)
    .filter((copy) => copy.opacity > 0.9 && copy.visible && !copy.text.startsWith('View'))
  const top = Math.max(0, Math.floor(Math.min(...copies.map((copy) => copy.bounds.top)) - 14))
  const bottom = Math.min(height, Math.ceil(Math.max(...copies.map((copy) => copy.bounds.top + copy.bounds.height)) + 14))
  const left = width === 390 ? 12 : record.section === 'hero' ? 40 : 500
  const region = { left, top, width: Math.min(width - left - 12, width === 390 ? 366 : 1000), height: bottom - top }
  const panelWidth = width === 390 ? 320 : 540
  const panelHeight = Math.round(region.height * panelWidth / region.width)
  const panels = []
  for (const [index, frame] of record.screenshots.entries()) {
    const image = await sharp(path.join(directory, frame.file)).extract(region).resize(panelWidth, panelHeight).png().toBuffer()
    const label = index === 0 ? 'BEFORE' : index === record.screenshots.length - 1 ? 'AFTER' : 'FADE IN PROGRESS'
    const title = Buffer.from(`<svg width="${panelWidth}" height="30"><rect width="100%" height="100%" fill="#171816"/><text x="12" y="20" font-family="Arial" font-size="11" fill="#D5B452">${label}</text></svg>`)
    panels.push({ input: title, left: index * panelWidth, top: 0 }, { input: image, left: index * panelWidth, top: 30 })
  }
  await sharp({ create: { width: panelWidth * record.screenshots.length, height: panelHeight + 30, channels: 3, background: '#171816' } })
    .composite(panels).png().toFile(path.join(directory, `${name}-text-filmstrip.png`))
  console.log(`Saved ${name}-text-filmstrip.png`)
}
