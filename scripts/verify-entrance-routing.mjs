import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const outputDirectory = path.resolve('references', 'qa', 'entrance-routing')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const assertions = []
const errors = []

function check(condition, message, detail) {
  assertions.push({ passed: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) })
  if (!condition) console.error(`FAIL ${message}${detail === undefined ? '' : ` ${JSON.stringify(detail)}`}`)
}

class CdpClient {
  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Map()
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))
      if (!message.id) {
        for (const listener of this.listeners.get(message.method) ?? []) listener(message.params)
        return
      }
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

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? []
    listeners.push(listener)
    this.listeners.set(method, listeners)
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
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-entrance-routing-'))
const port = await freePort()
const browser = spawn(edgePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profileDirectory}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true })

let client
try {
  client = await connect(port)
  await Promise.all([client.send('Page.enable'), client.send('Runtime.enable')])
  client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => errors.push(exceptionDetails.exception?.description ?? exceptionDetails.text))
  client.on('Runtime.consoleAPICalled', ({ type, args }) => {
    if (type === 'error') errors.push(args.map((argument) => argument.value ?? argument.description ?? '').join(' '))
  })

  const evaluate = async (expression, awaitPromise = false) => {
    const response = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
    return response.result.value
  }
  const waitFor = async (expression, timeout = 10000) => {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return true
      await delay(50)
    }
    return false
  }
  const setReducedMotion = (reduced) => client.send('Emulation.setEmulatedMedia', {
    media: '',
    features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }],
  })
  const waitForIntro = (pathSuffix) => waitFor(`location.pathname.endsWith(${JSON.stringify(pathSuffix)}) && document.querySelector('#root')?.dataset.clientReady === 'true' && Boolean(document.querySelector('[data-skip-intro]'))`, 10000)
  const completeIntro = async () => {
    const appeared = await waitFor("Boolean(document.querySelector('[data-skip-intro]'))", 3000)
    if (appeared) await evaluate("document.querySelector('[data-skip-intro]').click();true")
    return waitFor("!document.querySelector('[data-skip-intro]') && document.body.style.overflow !== 'hidden' && document.documentElement.style.overflow !== 'hidden'", 4000)
  }

  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await setReducedMotion(false)

  await client.send('Page.navigate', { url: `${base}/en/about/` })
  check(await waitForIntro('/en/about/'), 'Entry animation appears on a direct inner-page load')
  check(await evaluate("getComputedStyle(document.querySelector('.entrance-intro')).visibility !== 'hidden' && document.body.style.overflow === 'hidden'"), 'Entry overlay is visible and locks scrolling while active')
  check(await completeIntro(), 'Entry animation can be skipped and restores scrolling')

  await client.send('Page.reload', { ignoreCache: true })
  check(await waitForIntro('/en/about/'), 'Entry animation appears again after refresh')
  check(await completeIntro(), 'Refreshed entry animation completes cleanly')

  await evaluate("document.querySelector('.site-header a[href$=\"/en/services/\"]')?.click();true")
  check(await waitForIntro('/en/services/'), 'Entry animation appears after internal page navigation')
  check(await completeIntro(), 'Page-navigation entry animation completes cleanly')

  await evaluate("document.querySelector('.language-switch')?.click();true")
  check(await waitForIntro('/ar/services/'), 'Entry animation appears after language-route navigation')
  check(await completeIntro(), 'Language-route entry animation completes cleanly')

  check((await evaluate("sessionStorage.getItem('summit-intro-seen')")) === null, 'No session-storage gate suppresses later entrances')

  await setReducedMotion(true)
  await client.send('Page.reload', { ignoreCache: true })
  await delay(250)
  check(await waitFor("document.querySelector('#root')?.dataset.clientReady === 'true'", 10000), 'Reduced-motion route hydrates')
  check(await evaluate("!document.querySelector('[data-skip-intro]') && document.body.style.overflow !== 'hidden' && document.documentElement.style.overflow !== 'hidden'"), 'Reduced motion skips the entry animation and leaves scrolling unlocked')
  check(errors.length === 0, 'No runtime or console errors occur during entrance routing', errors)
} catch (error) {
  errors.push(error.stack ?? String(error))
} finally {
  const result = {
    generatedAt: new Date().toISOString(),
    assertions,
    errors,
    summary: {
      assertions: assertions.length,
      passed: assertions.filter((assertion) => assertion.passed).length,
      failed: assertions.filter((assertion) => !assertion.passed).length,
      runtimeErrors: errors.length,
    },
  }
  await writeFile(path.join(outputDirectory, 'results.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  if (client) {
    try { await client.send('Browser.close') } catch { /* Browser may already be closed. */ }
  }
  browser.kill()
  await delay(250)
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 })

  console.log(JSON.stringify(result.summary, null, 2))
  if (result.summary.failed || result.summary.runtimeErrors) process.exitCode = 1
}
