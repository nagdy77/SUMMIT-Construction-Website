import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const outputPath = path.resolve(process.argv[3] ?? 'references/qa/image-performance/latest.json')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const routes = [
  { id: 'home', path: '/en/', fullScroll: false },
  { id: 'beit-al-razzaz', path: '/en/projects/beit-al-razzaz/', fullScroll: true },
  { id: 'soma-bay', path: '/en/projects/soma-bay/', fullScroll: true },
  { id: 'contact', path: '/en/contact/', fullScroll: false },
]

class CdpClient {
  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))
      if (!message.id) return
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
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`CDP timed out: ${method}`))
      }, 45000)
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
  for (let attempt = 0; attempt < 120; attempt += 1) {
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
  throw new Error('Could not connect to the temporary Edge instance.')
}

const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-image-audit-'))
const port = await freePort()
const browser = spawn(edgePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-background-networking',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profileDirectory}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true })

let client
const report = { measuredAt: new Date().toISOString(), base, viewport: { width: 390, height: 844, deviceScaleFactor: 1 }, routes: [], errors: [] }

try {
  client = await connect(port)
  await Promise.all([
    client.send('Page.enable'),
    client.send('Runtime.enable'),
    client.send('Network.enable'),
    client.send('Performance.enable'),
  ])
  await client.send('Network.setCacheDisabled', { cacheDisabled: true })
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await client.send('Emulation.setEmulatedMedia', {
    media: '',
    features: [
      { name: 'prefers-reduced-motion', value: 'reduce' },
      { name: 'prefers-color-scheme', value: 'dark' },
    ],
  })
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__summitPerf = { lcp: 0, cls: 0, longestTask: 0, longestEvent: 0 };
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__summitPerf.lcp = Math.max(window.__summitPerf.lcp, entry.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__summitPerf.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
    try { new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__summitPerf.longestTask = Math.max(window.__summitPerf.longestTask, entry.duration); }).observe({ type: 'longtask', buffered: true }); } catch {}
    try { new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__summitPerf.longestEvent = Math.max(window.__summitPerf.longestEvent, entry.duration); }).observe({ type: 'event', buffered: true, durationThreshold: 16 }); } catch {}
  ` })

  const evaluate = async (expression, awaitPromise = false) => {
    const response = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
    return response.result.value
  }
  const waitFor = async (expression, timeout = 30000) => {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return true
      await delay(100)
    }
    return false
  }
  const snapshot = () => evaluate(`(() => {
    const resources = performance.getEntriesByType('resource');
    const isImage = (entry) => entry.initiatorType === 'img' || /\\.(?:avif|webp|png|jpe?g|gif|svg)(?:\\?|$)/i.test(entry.name);
    const images = resources.filter(isImage);
    const uniqueImageUrls = [...new Set(images.map((entry) => entry.name))];
    const domImages = [...document.images];
    return {
      navigation: performance.getEntriesByType('navigation')[0] ? {
        domContentLoadedMs: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd),
        loadMs: Math.round(performance.getEntriesByType('navigation')[0].loadEventEnd),
        transferSize: performance.getEntriesByType('navigation')[0].transferSize,
      } : null,
      resourceRequests: resources.length,
      totalResourceBytes: resources.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
      imageRequests: images.length,
      uniqueImageRequests: uniqueImageUrls.length,
      imageEncodedBytes: images.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
      imageTransferBytes: images.reduce((sum, entry) => sum + entry.transferSize, 0),
      assignedImageElements: domImages.filter((image) => image.getAttribute('src') || image.getAttribute('srcset')).length,
      uniqueAssignedImageUrls: new Set(domImages.map((image) => image.currentSrc).filter(Boolean)).size,
      incompleteImages: domImages.filter((image) => (image.getAttribute('src') || image.getAttribute('srcset')) && !image.complete).length,
      brokenImages: domImages.filter((image) => image.complete && image.getAttribute('src') && !image.naturalWidth).length,
      lcpMs: Math.round(window.__summitPerf?.lcp ?? 0),
      cls: Number((window.__summitPerf?.cls ?? 0).toFixed(4)),
      longestTaskMs: Math.round(window.__summitPerf?.longestTask ?? 0),
      longestEventMs: Math.round(window.__summitPerf?.longestEvent ?? 0),
      documentHeight: document.documentElement.scrollHeight,
      scrollY: Math.round(scrollY),
      topImages: images.sort((a, b) => b.encodedBodySize - a.encodedBodySize).slice(0, 8).map((entry) => ({ url: new URL(entry.name).pathname, bytes: entry.encodedBodySize })),
    };
  })()`)

  for (const route of routes) {
    performance.clearResourceTimings?.()
    await client.send('Page.navigate', { url: `${base}${route.path}` })
    const ready = await waitFor("document.readyState === 'complete' && document.querySelector('#root')?.dataset.clientReady === 'true' && Boolean(document.querySelector('main h1'))")
    if (!ready) throw new Error(`${route.path} did not hydrate`) 
    await delay(2500)
    const initial = await snapshot()
    let explored = initial
    if (route.fullScroll) {
      await evaluate(`(async () => {
        const step = Math.max(560, Math.round(innerHeight * .75));
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          scrollTo({ top: y, behavior: 'auto' });
          await new Promise((resolve) => setTimeout(resolve, 180));
        }
        scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
        await new Promise((resolve) => setTimeout(resolve, 2500));
      })()`, true)
      explored = await snapshot()
    }
    report.routes.push({ id: route.id, path: route.path, initial, explored })
  }
} catch (error) {
  report.errors.push(error.stack ?? String(error))
} finally {
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  if (client) {
    try { await client.send('Browser.close') } catch { /* Edge may already be closed. */ }
  }
  browser.kill()
  await delay(250)
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 })
}

console.log(JSON.stringify({ outputPath, errors: report.errors.length, routes: report.routes.map(({ id, initial, explored }) => ({ id, initialImages: initial.imageRequests, exploredImages: explored.imageRequests, exploredBytes: explored.imageEncodedBytes })) }, null, 2))
if (report.errors.length) process.exitCode = 1
