import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const outputDirectory = path.resolve('references', 'qa', 'founders-update')
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const expected = {
  en: {
    heading: 'Meet the Founders',
    alt: 'Black-and-white portrait of SUMMIT founders Ahmed Elesawy on the left and Mohamed Haron on the right',
    translationStatus: '',
    founders: [
      ['Ahmed Elesawy', 'Summit Company will be one of the most important emerging companies in the field of restoration and contracting because we do what we love, so the results become wonderful.\nOur passion is to build civilization with the spirit of heritage.'],
      ['Mohamed Haron', 'Power without thinking does not mean anything.\nAt Summit, we care about strength and intelligence\nSo we are growing faster than any other company'],
    ],
  },
  ar: {
    heading: 'تعرّف إلى المؤسسين',
    alt: 'صورة بالأبيض والأسود لمؤسسي سوميت، أحمد العيسوي على اليسار ومحمد هارون على اليمين',
    translationStatus: 'الترجمة العربية للمقولتين قيد اعتماد العميل قبل النشر.',
    founders: [
      ['أحمد العيسوي', 'ستكون شركة سوميت واحدة من أهم الشركات الناشئة في مجال الترميم والمقاولات لأننا نفعل ما نحبه، فتكون النتائج رائعة.\nشغفنا هو أن نبني الحضارة بروح التراث.'],
      ['محمد هارون', 'القوة من دون تفكير لا تعني شيئًا.\nفي سوميت، نهتم بالقوة والذكاء\nلذلك ننمو أسرع من أي شركة أخرى'],
    ],
  },
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
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-founders-update-'))
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
    const url = `${base}/${locale}/about/`
    await client.send('Page.navigate', { url })
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
    await evaluate("document.querySelector('.founders-story').scrollIntoView({ block: 'center' }); true")
    await waitFor("document.querySelector('.founders-image img').complete && document.querySelector('.founders-image img').naturalWidth > 0")
    await delay(reducedMotion ? 120 : 1500)
  }

  let assertions = 0
  for (const width of [390, 1440]) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 1000, deviceScaleFactor: 1, mobile: width === 390 })
    for (const locale of ['en', 'ar']) {
      for (const theme of ['dark', 'light']) {
        await navigate(locale, theme)
        const metrics = await evaluate(`(() => {
          const section = document.querySelector('.founders-story')
          const image = section.querySelector('.founders-image img')
          const imageRect = image.getBoundingClientRect()
          const quotes = [...section.querySelectorAll('.founder-quote')].map((article) => ({
            name: article.querySelector('h3').textContent.trim(),
            quote: article.querySelector('blockquote p').textContent,
            top: article.getBoundingClientRect().top,
            font: getComputedStyle(article.querySelector('blockquote p')).fontFamily,
            opacity: getComputedStyle(article).opacity,
          }))
          return {
            width: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            lang: document.documentElement.lang,
            dir: document.documentElement.dir,
            theme: document.documentElement.dataset.theme,
            heading: section.querySelector('h2').textContent.trim(),
            labelledBy: section.getAttribute('aria-labelledby'),
            alt: image.alt,
            imagePath: new URL(image.currentSrc || image.src).pathname,
            imageWidth: imageRect.width,
            imageHeight: imageRect.height,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            objectFit: getComputedStyle(image).objectFit,
            imageTop: imageRect.top,
            quotes,
            translationStatus: section.querySelector('.founders-translation-status')?.textContent.trim() || '',
            previousSectionClass: section.previousElementSibling?.className || '',
            nextSectionClass: section.nextElementSibling?.className || '',
            failedImages: [...document.images].filter((item) => item.complete && item.naturalWidth === 0).map((item) => item.src),
          }
        })()`)

        assert.equal(metrics.width, width)
        assert.ok(metrics.documentWidth <= width, `${locale}/${theme} founders section must fit ${width}px`)
        assert.equal(metrics.lang, locale)
        assert.equal(metrics.dir, locale === 'ar' ? 'rtl' : 'ltr')
        assert.equal(metrics.theme, theme)
        assert.equal(metrics.heading, expected[locale].heading)
        assert.equal(metrics.labelledBy, 'founders-heading')
        assert.equal(metrics.alt, expected[locale].alt)
        assert.match(metrics.imagePath, /\/assets\/about\/founders\/founders-monochrome-(960|1536)\.webp$/)
        assert.equal(metrics.objectFit, 'contain')
        assert.ok(Math.abs((metrics.imageWidth / metrics.imageHeight) - 1.5) < 0.01, 'Portrait must preserve its 3:2 aspect ratio')
        assert.ok(Math.abs((metrics.naturalWidth / metrics.naturalHeight) - 1.5) < 0.01, `Selected WebP must preserve its source ratio (${metrics.naturalWidth}x${metrics.naturalHeight})`)
        assert.deepEqual(metrics.quotes.map(({ name, quote }) => [name, quote]), expected[locale].founders)
        assert.equal(metrics.translationStatus, expected[locale].translationStatus)
        assert.match(metrics.previousSectionClass, /inner-hero/)
        assert.match(metrics.nextSectionClass, /company-facts/)
        assert.deepEqual(metrics.failedImages, [])
        if (width === 390) assert.ok(metrics.quotes.every((quote) => quote.top > metrics.imageTop + metrics.imageHeight), 'Mobile quotes must stack below the complete portrait')
        if (locale === 'ar') assert.ok(metrics.quotes.every((quote) => quote.font.includes('IBM Plex Sans Arabic')), 'Arabic quotations must use IBM Plex Sans Arabic')
        assertions += locale === 'ar' || width === 390 ? 19 : 18
      }
    }
  }

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await navigate('en', 'dark', true)
  const reducedMotion = await evaluate(`(() => ({
    imageTransform: getComputedStyle(document.querySelector('.founders-image img')).transform,
    quoteTransforms: [...document.querySelectorAll('.founder-quote')].map((node) => getComputedStyle(node).transform),
    quoteOpacity: [...document.querySelectorAll('.founder-quote')].map((node) => getComputedStyle(node).opacity),
  }))()`)
  assert.equal(reducedMotion.imageTransform, 'none')
  assert.ok(reducedMotion.quoteTransforms.every((value) => value === 'none'))
  assert.ok(reducedMotion.quoteOpacity.every((value) => value === '1'))
  assertions += 3

  const captures = [
    ['founders-en-desktop-dark.png', 'en', 'dark', 1440, 1000],
    ['founders-ar-desktop-light.png', 'ar', 'light', 1440, 1000],
    ['founders-en-mobile-light.png', 'en', 'light', 390, 844],
    ['founders-ar-mobile-dark.png', 'ar', 'dark', 390, 844],
  ]
  for (const [filename, locale, theme, width, height] of captures) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width === 390 })
    await navigate(locale, theme, true)
    const clip = await evaluate(`(() => {
      const rect = document.querySelector('.founders-story').getBoundingClientRect()
      return { x: Math.max(0, rect.left + scrollX), y: Math.max(0, rect.top + scrollY), width: Math.min(rect.width, document.documentElement.scrollWidth), height: rect.height }
    })()`)
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...clip, scale: 1 } })
    await writeFile(path.join(outputDirectory, filename), Buffer.from(screenshot.data, 'base64'))
  }

  console.log(`Verified ${assertions} founders-section assertions across EN/AR, dark/light, desktop/mobile, and reduced motion; captured ${captures.length} review screenshots.`)
} finally {
  if (client) {
    try { await client.send('Browser.close') } catch { /* Browser may already be closed. */ }
  }
  browser.kill()
  await delay(250)
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 })
}
