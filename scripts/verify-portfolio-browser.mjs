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
      if (!message.id) return
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

const profile = await mkdtemp(path.join(os.tmpdir(), 'summit-portfolio-browser-'))
assert.ok(path.resolve(profile).startsWith(path.resolve(os.tmpdir())), 'temporary browser profile must stay inside the OS temp directory')
const port = await freePort()
const browser = spawn(edgePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true })

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
  }

  for (const width of [390, 1440]) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1, mobile: width === 390 })
    for (const theme of ['dark', 'light']) {
      await navigate(`${base}/en/projects/`)
      await evaluate(`localStorage.setItem('summit-theme', '${theme}'); location.reload(); true`)
      await waitFor(`document.documentElement.dataset.theme === '${theme}' && document.querySelectorAll('.portfolio-card').length === 11`)
      const metrics = await evaluate(`(() => {
        const header = document.querySelector('.site-header');
        const footer = document.querySelector('.site-footer');
        const menu = header.querySelector('[aria-controls="mobile-navigation"]');
        const desktopNav = header.querySelector('nav');
        return {
          width: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          cards: document.querySelectorAll('.portfolio-card').length,
          headerPattern: getComputedStyle(header, '::before').backgroundImage,
          footerPattern: getComputedStyle(footer, '::before').backgroundImage,
          headerPatternSize: getComputedStyle(header, '::before').backgroundSize,
          footerPatternSize: getComputedStyle(footer, '::before').backgroundSize,
          headerOpacity: Number(getComputedStyle(header, '::before').opacity),
          footerOpacity: Number(getComputedStyle(footer, '::before').opacity),
          menuVisible: getComputedStyle(menu).display !== 'none',
          desktopNavVisible: getComputedStyle(desktopNav).display !== 'none',
          failedImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
        };
      })()`)
      assert.equal(metrics.width, width, `${width}px viewport must be emulated exactly`)
      assert.ok(metrics.documentWidth <= width, `${width}px ${theme} listing must not overflow horizontally`)
      assert.equal(metrics.cards, 11, `${theme} listing must show all 11 projects`)
      assert.match(metrics.headerPattern, /summit-reference-pattern\.png/, 'header must use the exact extracted reference tile')
      assert.match(metrics.footerPattern, /summit-reference-pattern\.png/, 'footer must use the exact extracted reference tile')
      assert.match(metrics.headerPatternSize, /485px 358px/, 'header must use the exact client-approved pattern panel')
      assert.match(metrics.footerPatternSize, /485px 358px/, 'footer must use the exact client-approved pattern panel')
      assert.ok(metrics.headerOpacity >= 0.8 && metrics.footerOpacity === 1, 'reference pattern must remain visible while preserving the scrolled header treatment')
      assert.deepEqual(metrics.failedImages, [], `${width}px ${theme} listing must have no failed images`)
      assert.equal(metrics.menuVisible, width === 390, 'mobile menu visibility must match the viewport')
      assert.equal(metrics.desktopNavVisible, width === 1440, 'desktop navigation visibility must match the viewport')
    }
  }

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  for (const slug of ['mountain-view', 'safi-al-din-gawhar']) {
    await navigate(`${base}/en/projects/${slug}/`)
    await waitFor("Boolean(document.querySelector('.detail-media-placeholder'))")
    const metrics = await evaluate(`(() => { const heading=document.querySelector('.detail-heading h1'); return { documentWidth:document.documentElement.scrollWidth, viewport:innerWidth, headingOverflow:heading.scrollWidth > heading.clientWidth, placeholder:Boolean(document.querySelector('.detail-media-placeholder')) }; })()`)
    assert.ok(metrics.documentWidth <= metrics.viewport, `${slug} must not overflow at 390px`)
    assert.equal(metrics.headingOverflow, false, `${slug} heading must wrap within its column`)
    assert.equal(metrics.placeholder, true, `${slug} must use the typography media treatment`)
  }

  console.log('Verified the 11-project portfolio, exact extracted pattern, dark/light overlays, 390px mobile layout, desktop navigation, image loading, and image-free project treatments in Edge.')
} finally {
  browser.kill()
  await delay(250)
  await rm(profile, { recursive: true, force: true })
}
