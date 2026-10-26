import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const outputDirectory = path.resolve('references', 'qa', 'phase-6', 'screenshots')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const pages = [
  ['', 'home'],
  ['about/', 'about'],
  ['services/', 'services'],
  ['services/construction/', 'service-construction'],
  ['services/restoration/', 'service-restoration'],
  ['services/renovation/', 'service-residential-fit-out'],
  ['services/fit-out/', 'service-commercial-fit-out'],
  ['projects/', 'projects'],
  ['clients/', 'clients'],
  ['downloads/', 'downloads'],
  ['contact/', 'contact'],
  ['privacy/', 'privacy'],
]
const viewports = [
  { name: 'mobile', width: 390, height: 844, mobile: true },
  { name: 'desktop', width: 1440, height: 1000, mobile: false },
]

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
    } catch {
      // Edge is still starting.
    }
    await delay(100)
  }
  throw new Error('Could not connect to Edge.')
}

await mkdir(outputDirectory, { recursive: true })
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-phase6-screenshots-'))
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
  await client.send('Emulation.setEmulatedMedia', {
    media: '',
    features: [
      { name: 'prefers-reduced-motion', value: 'reduce' },
      { name: 'prefers-color-scheme', value: 'dark' },
    ],
  })

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

  for (const viewport of viewports) {
    await client.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, mobile: viewport.mobile, deviceScaleFactor: 1 })
    for (const locale of ['en', 'ar']) {
      for (const [tail, label] of pages) {
        const route = `/${locale}/${tail}`
        await client.send('Page.navigate', { url: `${base}${route}` })
        if (!await waitFor("document.readyState === 'complete' && document.querySelector('#root')?.dataset.clientReady === 'true' && Boolean(document.querySelector('main h1'))")) {
          throw new Error(`Timed out preparing screenshot for ${route}`)
        }
        await evaluate("localStorage.setItem('summit-theme','dark');document.documentElement.dataset.theme='dark';document.documentElement.style.colorScheme='dark';true")
        await evaluate(`(async () => {
          await document.fonts.ready;
          const step = Math.max(500, Math.floor(innerHeight * .75));
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 80));
          }
          scrollTo(0, 0);
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        })()`, true)
        await delay(250)
        const { contentSize } = await client.send('Page.getLayoutMetrics')
        const screenshot = await client.send('Page.captureScreenshot', {
          format: 'png',
          fromSurface: true,
          captureBeyondViewport: true,
          clip: { x: 0, y: 0, width: viewport.width, height: Math.ceil(contentSize.height), scale: 1 },
        })
        const filename = `${locale}-${label}-${viewport.name}.png`
        await writeFile(path.join(outputDirectory, filename), Buffer.from(screenshot.data, 'base64'))
        captures.push({ route, viewport: viewport.name, width: viewport.width, height: Math.ceil(contentSize.height), file: filename })
        console.log(`Captured ${filename}`)
      }
    }
  }

  await writeFile(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), count: captures.length, captures }, null, 2)}\n`, 'utf8')
} finally {
  if (client) {
    try { await client.send('Browser.close') } catch { /* Browser may already be closed. */ }
  }
  browser.kill()
  await delay(250)
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 })
}

console.log(`Captured ${captures.length} bilingual desktop/mobile page screenshots in ${outputDirectory}.`)
