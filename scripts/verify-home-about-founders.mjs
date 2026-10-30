import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const outputDirectory = path.resolve('references', 'qa', 'home-about-founders')
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
let assetAssertions = 0
for (const [file, expectedWidth, expectedHeight] of [
  ['public/assets/about/founders/founders-monochrome-960.webp', 960, 640],
  ['public/assets/about/founders/founders-monochrome-1536.webp', 1536, 1024],
]) {
  const metadata = await sharp(file).metadata()
  assert.equal(metadata.width, expectedWidth)
  assert.equal(metadata.height, expectedHeight)
  assetAssertions += 2
}

class CdpClient {
  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      clearTimeout(pending.timeout)
      if (message.error) pending.reject(new Error(message.error.message))
      else pending.resolve(message.result)
    })
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`CDP timed out: ${method}`)), 30000)
      this.pending.set(id, { resolve, reject, timeout })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => resolve(address.port))
    })
  })
}

async function connect(port) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
      const target = targets.find((item) => item.type === 'page')
      if (target?.webSocketDebuggerUrl) {
        const socket = new WebSocket(target.webSocketDebuggerUrl)
        await new Promise((resolve, reject) => {
          socket.addEventListener('open', resolve, { once: true })
          socket.addEventListener('error', reject, { once: true })
        })
        return new CdpClient(socket)
      }
    } catch { /* Edge is starting. */ }
    await delay(100)
  }
  throw new Error('Could not connect to the temporary Edge instance.')
}

await mkdir(outputDirectory, { recursive: true })
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-home-about-'))
assert.ok(path.resolve(profileDirectory).startsWith(path.resolve(os.tmpdir())))
const port = await freePort()
const browser = spawn(edgePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profileDirectory}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true })

let client
try {
  client = await connect(port)
  await Promise.all([client.send('Page.enable'), client.send('Runtime.enable')])

  const evaluate = async (expression, awaitPromise = false) => {
    const response = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
    return response.result.value
  }
  const waitFor = async (expression, timeout = 15000) => {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return
      await delay(75)
    }
    throw new Error(`Timed out waiting for ${expression}`)
  }
  const navigate = async (locale, theme, reducedMotion = false) => {
    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }] })
    await client.send('Page.navigate', { url: `${base}/${locale}/` })
    await waitFor("document.readyState === 'complete' && document.querySelector('#root')?.dataset.clientReady === 'true'")
    await waitFor("['dark','light'].includes(document.documentElement.dataset.theme)")
    if (await evaluate(`document.documentElement.dataset.theme !== '${theme}'`)) {
      await evaluate(`document.querySelector('button[aria-label="Switch to ${theme} theme"]')?.click(); true`)
      await waitFor(`document.documentElement.dataset.theme === '${theme}'`)
    }
    if (await evaluate("Boolean(document.querySelector('[data-skip-intro]'))")) {
      await evaluate("document.querySelector('[data-skip-intro]').click(); true")
      await waitFor("!document.querySelector('[data-skip-intro]')")
    }
    await evaluate('document.fonts.ready', true)
    await evaluate("document.querySelector('#about').scrollIntoView({ block: 'center' }); true")
    await waitFor("document.querySelector('.about-executive-photo')?.complete && document.querySelector('.about-executive-photo')?.naturalWidth > 0")
    await waitFor("document.querySelector('.about-executive-mark img')?.complete && document.querySelector('.about-executive-mark img')?.naturalWidth > 0")
    await delay(reducedMotion ? 120 : 1600)
  }

  let assertions = assetAssertions
  for (const width of [320, 390, 1440, 1920]) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 844 : 1080, deviceScaleFactor: 1, mobile: width < 768 })
    for (const locale of ['en', 'ar']) {
      for (const theme of ['dark', 'light']) {
        await navigate(locale, theme)
        const metrics = await evaluate(`(() => {
          const section = document.querySelector('#about')
          const frame = section.querySelector('.about-executive-frame')
          const image = section.querySelector('.about-executive-photo')
          const mark = section.querySelector('.about-executive-mark')
          const markImage = mark.querySelector('img')
          const badge = section.querySelector('.about-established-badge')
          return {
            width: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            lang: document.documentElement.lang,
            dir: document.documentElement.dir,
            theme: document.documentElement.dataset.theme,
            imagePath: new URL(image.currentSrc || image.src).pathname,
            imageAlt: image.alt,
            objectFit: getComputedStyle(image).objectFit,
            frameRatio: frame.getBoundingClientRect().width / frame.getBoundingClientRect().height,
            markPath: new URL(markImage.currentSrc || markImage.src).pathname,
            markAlt: markImage.alt,
            markOpacity: Number(getComputedStyle(mark).opacity),
            markFilter: getComputedStyle(mark).filter,
            markNaturalSize: [markImage.naturalWidth, markImage.naturalHeight],
            hasHandmadeSvg: Boolean(section.querySelector('[data-about-geometry] svg')),
            badgeText: badge.textContent.replace(/\\s+/g, ' ').trim(),
            oldWorkerImage: Boolean(section.querySelector('img[src*="about-workmanship"]')),
            serviceMarkPaths: [...document.querySelectorAll('#services .service-brand-mark img')].map((item) => new URL(item.src).pathname),
            serviceMarkAlts: [...document.querySelectorAll('#services .service-brand-mark img')].map((item) => item.alt),
            serviceHandmadeSvgCount: document.querySelectorAll('#services .service-brand-mark svg').length,
            failedImages: [...section.querySelectorAll('img')].filter((item) => item.complete && item.naturalWidth === 0).map((item) => item.src),
          }
        })()`)

        assert.equal(metrics.width, width)
        assert.ok(metrics.documentWidth <= width, `${locale}/${theme} About section must fit ${width}px`)
        assert.equal(metrics.lang, locale)
        assert.equal(metrics.dir, locale === 'ar' ? 'rtl' : 'ltr')
        assert.equal(metrics.theme, theme)
        assert.match(metrics.imagePath, /\/assets\/about\/founders\/founders-monochrome-(960|1536)\.webp$/)
        assert.ok(metrics.imageAlt.includes(locale === 'en' ? 'Ahmed Elesawy' : 'أحمد العيسوي'))
        assert.equal(metrics.objectFit, 'contain')
        assert.ok(Math.abs(metrics.frameRatio - 1.5) < 0.015, 'Executive frame must preserve the portrait ratio')
        assert.match(metrics.markPath, /\/assets\/brand\/summit-mountain-symbol\.webp$/)
        assert.equal(metrics.markAlt, '')
        assert.deepEqual(metrics.markNaturalSize, [480, 388])
        assert.ok(metrics.markOpacity > 0 && metrics.markOpacity <= 0.25)
        assert.notEqual(metrics.markFilter, 'none')
        assert.equal(metrics.hasHandmadeSvg, false)
        assert.match(metrics.badgeText, /2018/)
        assert.equal(metrics.oldWorkerImage, false)
        assert.equal(metrics.serviceMarkPaths.length, 3)
        assert.ok(metrics.serviceMarkPaths.every((item) => /\/assets\/brand\/summit-mountain-symbol\.webp$/.test(item)))
        assert.ok(metrics.serviceMarkAlts.every((item) => item === ''))
        assert.equal(metrics.serviceHandmadeSvgCount, 0)
        assert.deepEqual(metrics.failedImages, [])
        assertions += 22
      }
    }
  }

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await navigate('en', 'dark', true)
  const reducedMotion = await evaluate(`(() => ({
    revealTransform: getComputedStyle(document.querySelector('[data-about-reveal]')).transform,
    imageTransform: getComputedStyle(document.querySelector('[data-about-image-motion]')).transform,
    markTransform: getComputedStyle(document.querySelector('[data-about-geometry]')).transform,
  }))()`)
  assert.equal(reducedMotion.revealTransform, 'none')
  assert.equal(reducedMotion.imageTransform, 'none')
  assert.equal(reducedMotion.markTransform, 'none')
  assertions += 3

  const captures = [
    ['home-about-en-desktop-dark.png', 'en', 'dark', 1440, 1080],
    ['home-about-ar-desktop-light.png', 'ar', 'light', 1440, 1080],
    ['home-about-en-mobile-light.png', 'en', 'light', 390, 844],
    ['home-about-ar-mobile-dark.png', 'ar', 'dark', 390, 844],
  ]
  for (const [filename, locale, theme, width, height] of captures) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width === 390 })
    await navigate(locale, theme, true)
    const clip = await evaluate(`(() => {
      const rect = document.querySelector('#about').getBoundingClientRect()
      return { x: Math.max(0, rect.left + scrollX), y: Math.max(0, rect.top + scrollY), width: Math.min(rect.width, document.documentElement.scrollWidth), height: rect.height }
    })()`)
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...clip, scale: 1 } })
    await writeFile(path.join(outputDirectory, filename), Buffer.from(screenshot.data, 'base64'))
  }

  for (const [filename, width, height] of [
    ['home-services-official-mark-desktop.png', 1440, 1080],
    ['home-services-official-mark-mobile.png', 390, 844],
  ]) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width === 390 })
    await navigate('en', 'dark', true)
    await evaluate("document.querySelector('#services [data-service-panel]').parentElement.scrollIntoView({ block: 'center' }); true")
    await waitFor("[...document.querySelectorAll('#services .service-brand-mark img')].every((image) => image.complete && image.naturalWidth > 0)")
    const clip = await evaluate(`(() => {
      const rect = document.querySelector('#services [data-service-panel]').parentElement.getBoundingClientRect()
      return { x: Math.max(0, rect.left + scrollX), y: Math.max(0, rect.top + scrollY), width: Math.min(rect.width, document.documentElement.scrollWidth), height: rect.height }
    })()`)
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...clip, scale: 1 } })
    await writeFile(path.join(outputDirectory, filename), Buffer.from(screenshot.data, 'base64'))
  }

  console.log(`Verified ${assertions} homepage About and Services-brand assertions across EN/AR, dark/light themes, 320/390/1440/1920px, and reduced motion; captured ${captures.length + 2} review screenshots.`)
} finally {
  if (client) {
    try { await client.send('Browser.close') } catch { /* Browser may already be closed. */ }
  }
  browser.kill()
  await delay(250)
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 })
}
