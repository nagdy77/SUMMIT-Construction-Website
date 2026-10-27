import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const outputDirectory = path.resolve('references', 'qa', 'visual-polish-pass-02')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-polish-pass02-'))
const port = await freePort()
const browser = spawn(edgePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profileDirectory}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true })

const captures = []
let client
try {
  client = await connect(port)
  await Promise.all([client.send('Page.enable'), client.send('Runtime.enable')])
  await client.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }, { name: 'prefers-color-scheme', value: 'dark' }] })

  const evaluate = async (expression, awaitPromise = false) => {
    const response = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
    return response.result.value
  }
  const waitFor = async (expression, timeout = 15000) => {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return true
      await delay(75)
    }
    return false
  }
  const setViewport = (width, height, mobile = false) => client.send('Emulation.setDeviceMetricsOverride', { width, height, mobile, deviceScaleFactor: 1 })
  const navigate = async (route, theme = 'dark') => {
    await client.send('Page.navigate', { url: `${base}${route}` })
    if (!await waitFor("document.readyState === 'complete' && document.querySelector('#root')?.dataset.clientReady === 'true'")) throw new Error(`Timed out loading ${route}`)
    if (await waitFor("Boolean(document.querySelector('[data-skip-intro]'))", 1500)) {
      await evaluate("document.querySelector('[data-skip-intro]').click();true")
      await waitFor("!document.querySelector('[data-skip-intro]')", 3000)
    }
    await evaluate(`localStorage.setItem('summit-theme', '${theme}'); document.documentElement.dataset.theme='${theme}'; document.documentElement.style.colorScheme='${theme}'; true`)
    await evaluate("document.fonts.ready", true)
    await delay(180)
  }
  const captureViewport = async (filename, route, state) => {
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    await writeFile(path.join(outputDirectory, filename), Buffer.from(screenshot.data, 'base64'))
    captures.push({ filename, route, state })
  }
  const captureElement = async ({ filename, route, selector, theme = 'dark' }) => {
    await navigate(route, theme)
    const found = await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)
    if (!found) throw new Error(`Missing screenshot selector ${selector} on ${route}`)
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'center' }); true`)
    await delay(240)
    const rect = await evaluate(`(() => { const rect=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x:Math.max(0,rect.left+scrollX), y:Math.max(0,rect.top+scrollY), width:Math.min(rect.width,document.documentElement.scrollWidth), height:Math.min(rect.height,1400) }; })()`)
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...rect, scale: 1 } })
    await writeFile(path.join(outputDirectory, filename), Buffer.from(screenshot.data, 'base64'))
    captures.push({ filename, route, selector, theme })
  }

  await setViewport(1440, 900)
  await navigate('/en/about/')
  await evaluate('scrollTo(0,0);true')
  await captureViewport('01-header-top-desktop.png', '/en/about/', 'top')
  await evaluate('scrollTo(0,1000);true')
  await waitFor("document.querySelector('.site-header')?.dataset.scrolled === 'true'")
  await captureViewport('02-header-scrolled-desktop.png', '/en/about/', 'scrolled')

  await setViewport(390, 844, true)
  await navigate('/en/about/')
  await captureViewport('03-mobile-menu-closed.png', '/en/about/', 'closed')
  await evaluate("document.querySelector('[aria-controls=\"mobile-navigation\"]').click();true")
  await delay(170)
  await captureViewport('04-mobile-menu-mid-animation.png', '/en/about/', 'mid-animation')
  await waitFor("document.querySelector('#mobile-navigation')?.getAttribute('aria-hidden') === 'false' && Number(getComputedStyle(document.querySelector('#mobile-navigation')).opacity) > .95")
  await delay(320)
  await captureViewport('05-mobile-menu-open.png', '/en/about/', 'open')
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));true")
  await waitFor("document.querySelector('#mobile-navigation')?.getAttribute('aria-hidden') === 'true'")

  await setViewport(1440, 900)
  await navigate('/en/about/')
  await evaluate('scrollTo(0,document.documentElement.scrollHeight);true')
  await delay(220)
  await captureViewport('06-footer-pattern.png', '/en/about/', 'footer')

  const patternSections = [
    ['07-pattern-home-introduction.png', '/en/', '.about-section .brand-pattern-field', 'dark'],
    ['08-pattern-about-panel.png', '/en/about/', '.inner-hero-copy.brand-pattern-field', 'dark'],
    ['09-pattern-services-introduction.png', '/en/services/', '.services-index-heading.brand-pattern-field', 'dark'],
    ['10-pattern-service-panel.png', '/en/services/construction/', '.service-detail-hero .brand-pattern-field', 'dark'],
    ['11-pattern-projects-introduction.png', '/en/projects/', '.editorial-page-heading.brand-pattern-field', 'dark'],
    ['12-pattern-project-metadata.png', '/en/projects/mohamed-ali-palace/', '.detail-scope.brand-pattern-field', 'dark'],
    ['13-pattern-clients-introduction.png', '/en/clients/', '.clients-heading.brand-pattern-field', 'dark'],
    ['14-pattern-contact-panel.png', '/en/contact/', '.contact-layout header.brand-pattern-field', 'dark'],
    ['15-pattern-privacy-light.png', '/en/privacy/', '.privacy-editorial header.brand-pattern-field', 'light'],
    ['16-pattern-image-placeholder.png', '/en/projects/safi-al-din-gawhar/', '.detail-media-placeholder', 'dark'],
  ]
  for (const [filename, route, selector, theme] of patternSections) await captureElement({ filename, route, selector, theme })

  await writeFile(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), count: captures.length, captures }, null, 2)}\n`, 'utf8')
} finally {
  if (client) {
    try { await client.send('Browser.close') } catch { /* Browser may already be closed. */ }
  }
  browser.kill()
  await delay(250)
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 })
}

console.log(`Captured ${captures.length} visual-polish-pass-02 screenshots in ${outputDirectory}.`)
