import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class CdpClient {
  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))
      const request = this.pending.get(message.id)
      if (!request) return
      this.pending.delete(message.id)
      clearTimeout(request.timeout)
      if (message.error) request.reject(new Error(message.error.message))
      else request.resolve(message.result)
    })
  }
  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 20000)
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
  for (let attempt = 0; attempt < 80; attempt++) {
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
    } catch { /* Browser is starting. */ }
    await delay(100)
  }
  throw new Error('Could not connect to Edge.')
}

const profile = await mkdtemp(path.join(os.tmpdir(), 'summit-phase4-browser-'))
assert.ok(path.resolve(profile).startsWith(path.resolve(os.tmpdir())))
const port = await freePort()
const browser = spawn(edgePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true })

try {
  const client = await connect(port)
  await Promise.all([client.send('Page.enable'), client.send('Runtime.enable')])
  const evaluate = async (expression) => {
    const response = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text)
    return response.result.value
  }
  const waitFor = async (expression, timeout = 10000) => {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return
      await delay(80)
    }
    throw new Error(`Timed out waiting for ${expression}`)
  }
  const navigate = async (url) => {
    await client.send('Page.navigate', { url })
    await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('.site-header'))")
    await delay(120)
  }

  const routes = ['about', 'services', 'services/construction', 'services/restoration', 'services/renovation', 'services/fit-out', 'clients', 'downloads', 'contact', 'privacy']
  for (const width of [390, 1440]) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1, mobile: width === 390 })
    for (const locale of ['en', 'ar']) {
      for (const route of routes) {
        await navigate(`${base}/${locale}/${route}/`)
        const metrics = await evaluate(`(() => ({
          width: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          lang: document.documentElement.lang,
          dir: document.documentElement.dir,
          h1: Boolean(document.querySelector('main h1')),
          h1Clipped: (() => { const h1 = document.querySelector('main h1'); return h1 ? h1.scrollWidth > h1.clientWidth : true })(),
          headerControlsOutside: [...document.querySelectorAll('.site-header .language-switch, .site-header .theme-toggle')].filter((node) => { const rect = node.getBoundingClientRect(); return rect.left < 0 || rect.right > innerWidth }).length,
          clippedText: [...document.querySelectorAll('main h1, main h2, main p, main li, main label, main figcaption')].filter((node) => node.clientWidth && node.scrollWidth > node.clientWidth + 1).map((node) => ({ tag: node.tagName, className: node.className, text: node.textContent.trim().slice(0, 60), clientWidth: node.clientWidth, scrollWidth: node.scrollWidth })),
          failedImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
        }))()`)
        assert.equal(metrics.width, width, `${route} must use the exact ${width}px viewport`)
        assert.ok(metrics.documentWidth <= width, `${locale}/${route} must not overflow at ${width}px`)
        assert.equal(metrics.lang, locale, `${route} must set the document language`)
        assert.equal(metrics.dir, locale === 'ar' ? 'rtl' : 'ltr', `${route} must set the document direction`)
        assert.equal(metrics.h1, true, `${route} must expose one primary heading`)
        assert.equal(metrics.h1Clipped, false, `${locale}/${route} heading must remain inside its column at ${width}px`)
        assert.equal(metrics.headerControlsOutside, 0, `${locale}/${route} header controls must remain in the viewport at ${width}px`)
        assert.deepEqual(metrics.clippedText, [], `${locale}/${route} text must wrap without clipping at ${width}px`)
        assert.deepEqual(metrics.failedImages, [], `${locale}/${route} must have no failed images`)
      }
    }
  }

  await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  await navigate(`${base}/en/about/`)
  assert.deepEqual(await evaluate(`(() => ({ facts: document.querySelectorAll('.company-facts > div').length, principles: document.querySelectorAll('.principles article').length }))()`), { facts: 3, principles: 3 })

  await navigate(`${base}/en/services/`)
  assert.equal(await evaluate("document.querySelectorAll('.service-index-row').length"), 4)
  const compositions = {}
  for (const slug of ['construction', 'restoration', 'renovation', 'fit-out']) {
    await navigate(`${base}/en/services/${slug}/`)
    compositions[slug] = await evaluate("document.querySelector('.service-detail').className")
    assert.ok(await evaluate("document.querySelectorAll('.service-detail-body li').length > 0"), `${slug} needs verified scope items`)
    assert.ok(await evaluate("Boolean(document.querySelector('.service-next a'))"), `${slug} needs service navigation`)
  }
  assert.equal(new Set(Object.values(compositions)).size, 4, 'four service pages must use four distinct compositions')

  await navigate(`${base}/en/clients/`)
  assert.equal(await evaluate("document.querySelectorAll('.client-logo-grid figure').length"), 8)
  await navigate(`${base}/en/downloads/`)
  assert.match(await evaluate("document.querySelector('.profile-download a[download]').href"), /summit-company-profile\.pdf$/)

  await navigate(`${base}/en/contact/`)
  await delay(1600)
  await evaluate("document.querySelector('.enquiry-form').requestSubmit(); true")
  assert.match(await evaluate("document.querySelector('.form-status').textContent"), /required fields/i)
  assert.equal(await evaluate("document.querySelectorAll('.enquiry-form input, .enquiry-form select, .enquiry-form textarea').length"), 7)

  await client.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await navigate(`${base}/en/about/`)
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-reveal]')).opacity"), '1')

  console.log('Verified 40 responsive EN/AR inner-page renders, four distinct service compositions, 8 profile-supplied marks, the PDF download, form validation, image loading, RTL and reduced motion in Edge.')
} finally {
  browser.kill()
  await delay(250)
  await rm(profile, { recursive: true, force: true })
}
