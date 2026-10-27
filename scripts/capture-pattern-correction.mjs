import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const outputDirectory = path.resolve('references', 'qa', 'pattern-correction')
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
const referenceBuffer = await readFile('references/pattern-correction/client-approved-pattern.png')
const referenceDataUrl = `data:image/png;base64,${referenceBuffer.toString('base64')}`
const previousSourceBuffer = await readFile('references/pattern-correction/client-reference.png')
const previousTileDataUrl = `data:image/png;base64,${(await sharp(previousSourceBuffer).extract({ left: 33, top: 102, width: 97, height: 179 }).png().toBuffer()).toString('base64')}`
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-pattern-correction-'))
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
  const navigate = async (route) => {
    await client.send('Page.navigate', { url: `${base}${route}` })
    if (!await waitFor("document.readyState === 'complete' && document.querySelector('#root')?.dataset.clientReady === 'true'")) throw new Error(`Timed out loading ${route}`)
    if (await waitFor("Boolean(document.querySelector('[data-skip-intro]'))", 1500)) {
      await evaluate("document.querySelector('[data-skip-intro]').click();true")
      await waitFor("!document.querySelector('[data-skip-intro]')", 3000)
    }
    await evaluate("localStorage.setItem('summit-theme','dark'); document.documentElement.dataset.theme='dark'; true")
    await evaluate('document.fonts.ready', true)
    await delay(200)
  }
  const capture = async (filename, detail) => {
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    await writeFile(path.join(outputDirectory, filename), Buffer.from(screenshot.data, 'base64'))
    captures.push({ filename, ...detail })
  }

  await setViewport(1048, 440)
  await navigate('/en/about/')
  await evaluate(`document.body.innerHTML=${JSON.stringify(`<main style="box-sizing:border-box;min-height:100vh;padding:18px;background:#171816;color:#f3f1ec;font:600 13px Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase"><div style="display:grid;grid-template-columns:485px 485px;gap:12px"><section><p style="margin:0 0 10px">Exact client-supplied pattern</p><img alt="" src="${referenceDataUrl}" style="display:block;width:485px;height:358px;object-fit:none"></section><section><p style="margin:0 0 10px">Implemented production asset</p><div style="width:485px;height:358px;background:#707073 url('${base}/assets/patterns/summit-reference-pattern.png') 0 0/485px 358px repeat"></div></section></div></main>`)}; true`)
  await delay(250)
  await capture('01-reference-vs-implemented.png', { comparison: 'exact client-approved PNG beside the production asset at native scale' })

  await evaluate(`document.body.innerHTML=${JSON.stringify(`<main style="box-sizing:border-box;min-height:100vh;padding:30px;background:#171816;color:#f3f1ec;font:600 13px Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase"><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px"><section><p>Previous derived sub-tile</p><div style="height:350px;background:#707073 url('${previousTileDataUrl}') 0 0/97px 179px repeat"></div></section><section><p>Exact approved 485x358 pattern</p><div style="height:350px;background:#707073 url('${base}/assets/patterns/summit-reference-pattern.png') 0 0/485px 358px repeat"></div></section></div></main>`)}; true`)
  await delay(250)
  await capture('02-old-vs-new.png', { comparison: 'previous derived sub-tile beside exact client-approved production asset' })

  await setViewport(1440, 900)
  await navigate('/en/about/')
  await evaluate('scrollTo(0,0);true')
  await capture('03-header-top.png', { route: '/en/about/', state: 'top' })
  await evaluate('scrollTo(0,1000);true')
  await waitFor("document.querySelector('.site-header')?.dataset.scrolled === 'true'")
  await capture('04-header-scrolled.png', { route: '/en/about/', state: 'scrolled' })
  await evaluate('scrollTo(0,document.documentElement.scrollHeight);true')
  await delay(200)
  await capture('05-footer.png', { route: '/en/about/', state: 'footer' })

  await navigate('/en/services/')
  await evaluate("document.querySelector('.brand-pattern-field')?.scrollIntoView({block:'center'});true")
  await delay(200)
  await capture('06-patterned-section.png', { route: '/en/services/', state: 'selected image-free section' })

  await setViewport(390, 844, true)
  await navigate('/en/about/')
  await evaluate("document.querySelector('[aria-controls=\"mobile-navigation\"]').click();true")
  await waitFor("document.querySelector('#mobile-navigation')?.getAttribute('aria-hidden') === 'false' && Number(getComputedStyle(document.querySelector('#mobile-navigation')).opacity) > .95")
  await delay(200)
  await capture('07-mobile-menu-open.png', { route: '/en/about/', state: 'mobile menu open' })

  await writeFile(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), count: captures.length, captures }, null, 2)}\n`, 'utf8')
} finally {
  if (client) {
    try { await client.send('Browser.close') } catch { /* Browser may already be closed. */ }
  }
  browser.kill()
  await delay(250)
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 })
}

console.log(`Captured ${captures.length} pattern-correction screenshots in ${outputDirectory}.`)
