import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const outputDirectory = path.resolve('references', 'qa', 'privacy-refinement')
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

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

const expected = {
  en: {
    title: 'Privacy Policy',
    status: 'Draft for client and legal review',
    updated: 'To be added after approval',
    headings: ['Information We Collect', 'How We Use Information', 'Contact Enquiries', 'Cookies and Analytics', 'Third-Party Services', 'Data Retention and Security', 'Your Privacy Rights', 'Contact Information'],
  },
  ar: {
    title: 'سياسة الخصوصية',
    status: 'مسودة لمراجعة العميل والمستشار القانوني',
    updated: 'يُضاف بعد الاعتماد',
    headings: ['المعلومات التي نجمعها', 'كيفية استخدام المعلومات', 'استفسارات التواصل', 'ملفات الارتباط والتحليلات', 'خدمات الجهات الخارجية', 'الاحتفاظ بالبيانات وأمنها', 'حقوقك المتعلقة بالخصوصية', 'بيانات التواصل'],
  },
}

await mkdir(outputDirectory, { recursive: true })
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-privacy-refinement-'))
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
  const navigate = async (locale, theme) => {
    await client.send('Page.navigate', { url: `${base}/${locale}/privacy/` })
    await waitFor("document.readyState === 'complete' && document.querySelector('#root')?.dataset.clientReady === 'true'")
    await evaluate(`localStorage.setItem('summit-theme', '${theme}'); location.reload(); true`)
    await waitFor(`document.readyState === 'complete' && document.documentElement.dataset.theme === '${theme}' && document.querySelector('#root')?.dataset.clientReady === 'true'`)
    if (await evaluate("Boolean(document.querySelector('[data-skip-intro]'))")) {
      await evaluate("document.querySelector('[data-skip-intro]').click(); true")
      await waitFor("!document.querySelector('[data-skip-intro]')")
    }
    await evaluate('document.fonts.ready', true)
    await delay(160)
  }

  let checks = 0
  for (const width of [320, 390, 768, 1440]) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 844 : 900, deviceScaleFactor: 1, mobile: width < 768 })
    for (const locale of ['en', 'ar']) {
      for (const theme of ['dark', 'light']) {
        await navigate(locale, theme)
        const metrics = await evaluate(`(() => {
          const main = document.querySelector('main')
          const h1 = main.querySelector('h1')
          const sections = [...main.querySelectorAll('.privacy-section h2')].map((node) => node.textContent.trim())
          const meta = [...main.querySelectorAll('.privacy-meta dd')].map((node) => node.textContent.trim())
          const text = main.textContent
          return {
            width: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            lang: document.documentElement.lang,
            dir: document.documentElement.dir,
            title: h1.textContent.trim(),
            h1Size: parseFloat(getComputedStyle(h1).fontSize),
            headings: sections,
            meta,
            contentsLinks: main.querySelectorAll('.privacy-contents a').length,
            headerPrivacyLinks: document.querySelectorAll('.site-header .nav-link[href$="/privacy/"], #mobile-navigation > .site-container > a[href$="/privacy/"]').length,
            footerPrivacyLinks: document.querySelectorAll('.site-footer a[href$="/privacy/"]').length,
            contentWidth: main.querySelector('.privacy-sections').getBoundingClientRect().width,
            forbiddenCopy: /local configuration|approved endpoint|setup process/i.test(text),
            failedImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
          }
        })()`)

        assert.equal(metrics.width, width)
        assert.ok(metrics.documentWidth <= width, `${locale}/${theme} privacy must fit ${width}px`)
        assert.equal(metrics.lang, locale)
        assert.equal(metrics.dir, locale === 'ar' ? 'rtl' : 'ltr')
        assert.equal(metrics.title, expected[locale].title)
        assert.deepEqual(metrics.headings, expected[locale].headings)
        assert.deepEqual(metrics.meta, [expected[locale].status, expected[locale].updated])
        assert.equal(metrics.contentsLinks, 8)
        assert.equal(metrics.headerPrivacyLinks, 0)
        assert.equal(metrics.footerPrivacyLinks, 1)
        assert.equal(metrics.forbiddenCopy, false)
        assert.deepEqual(metrics.failedImages, [])
        assert.ok(metrics.h1Size <= (width <= 560 ? 50 : 84), `Privacy title must remain restrained at ${width}px`)
        if (width === 1440) assert.ok(metrics.contentWidth <= 833, 'Legal copy must keep a comfortable reading width')
        checks += 14
      }
    }
  }

  const captures = [
    { locale: 'en', theme: 'dark', width: 1440, height: 900, filename: 'privacy-en-desktop-dark.png' },
    { locale: 'ar', theme: 'light', width: 390, height: 844, filename: 'privacy-ar-mobile-light.png' },
  ]
  for (const capture of captures) {
    await client.send('Emulation.setDeviceMetricsOverride', { width: capture.width, height: capture.height, deviceScaleFactor: 1, mobile: capture.width < 768 })
    await navigate(capture.locale, capture.theme)
    await evaluate('scrollTo(0, 0); true')
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    await writeFile(path.join(outputDirectory, capture.filename), Buffer.from(screenshot.data, 'base64'))
  }

  console.log(`Verified ${checks} Privacy-page assertions across EN/AR, dark/light themes, and 320/390/768/1440px; captured ${captures.length} review screenshots.`)
} finally {
  if (client) {
    try { await client.send('Browser.close') } catch { /* Browser may already be closed. */ }
  }
  browser.kill()
  await delay(250)
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 })
}
