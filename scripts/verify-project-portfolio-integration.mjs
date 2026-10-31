import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mediaManifest = JSON.parse(await readFile(path.join(repositoryRoot, 'public', 'assets', 'projects', 'portfolio', 'media-manifest.json'), 'utf8'))
const projects = Object.fromEntries(Object.entries(mediaManifest.projects).map(([slug, project]) => [slug, project.count]))
const expectedPhotoCount = Object.values(projects).reduce((total, count) => total + count, 0)
const categoryCounts = [4, 4, 2, 6]

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
      const timeout = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 30000)
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
  throw new Error('Could not connect to Edge.')
}

const profile = await mkdtemp(path.join(os.tmpdir(), 'summit-project-integration-'))
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
  const waitFor = async (expression, timeout = 15000) => {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return
      await delay(90)
    }
    throw new Error(`Timed out waiting for ${expression}`)
  }
  const navigate = async (url) => {
    await client.send('Page.navigate', { url })
    await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('.site-header'))")
  }
  const waitForImages = async (selector = 'img') => evaluate(`Promise.all([...document.querySelectorAll('${selector}')].map((image) => new Promise((resolve) => {
    image.loading = 'eager';
    if (image.complete) { resolve(image.naturalWidth > 0); return; }
    const finish = () => resolve(image.naturalWidth > 0);
    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', () => resolve(false), { once: true });
    setTimeout(() => resolve(image.complete && image.naturalWidth > 0), 15000);
  })))`)

  for (const width of [320, 390, 768, 1440]) {
    console.log(`Checking listing at ${width}px`)
    await client.send('Emulation.setDeviceMetricsOverride', { width, height: width < 600 ? 844 : 960, deviceScaleFactor: 1, mobile: width < 600 })
    await navigate(`${base}/en/projects/`)
    await waitFor("document.querySelectorAll('.portfolio-card').length === 16 && document.querySelectorAll('.portfolio-category-card').length === 4")
    const metrics = await evaluate(`({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, cards: document.querySelectorAll('.portfolio-card').length, categories: document.querySelectorAll('.portfolio-category-card').length })`)
    assert.equal(metrics.viewport, width, `${width}px viewport must be emulated exactly`)
    assert.ok(metrics.documentWidth <= width, `${width}px project listing must not overflow horizontally`)
    assert.equal(metrics.cards, 16, `${width}px listing must show all projects before filtering`)
    assert.equal(metrics.categories, 4, `${width}px listing must show four illustrated category cards`)
  }

  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false })
  for (const theme of ['dark', 'light']) {
    console.log(`Checking ${theme} theme`)
    await navigate(`${base}/en/projects/`)
    await evaluate(`localStorage.setItem('summit-theme', '${theme}'); location.reload(); true`)
    await waitFor(`document.documentElement.dataset.theme === '${theme}' && document.querySelectorAll('.portfolio-card').length === 16`)
    assert.ok((await waitForImages('.portfolio-category-card img, .portfolio-card img')).every(Boolean), `${theme} project listing images must decode`)
  }

  for (let index = 0; index < categoryCounts.length; index += 1) {
    console.log(`Checking category filter ${index + 1}`)
    await navigate(`${base}/en/projects/`)
    await evaluate(`document.querySelectorAll('.portfolio-category-card')[${index}].click(); true`)
    await waitFor(`document.querySelectorAll('.portfolio-card').length === ${categoryCounts[index]}`)
    const state = await evaluate(`({ pressed: document.querySelectorAll('.portfolio-category-card')[${index}].getAttribute('aria-pressed'), cards: document.querySelectorAll('.portfolio-card').length })`)
    assert.equal(state.pressed, 'true', `category card ${index + 1} must expose its selected state`)
    assert.equal(state.cards, categoryCounts[index], `category card ${index + 1} must filter the correct project count`)
  }

  await navigate(`${base}/en/projects/`)
  await evaluate("document.querySelectorAll('.portfolio-filters button')[0].click(); true")
  await waitFor("document.querySelectorAll('.portfolio-card').length === 16")

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  for (const [slug, expectedImages] of Object.entries(projects)) {
    console.log(`Checking gallery ${slug}`)
    await navigate(`${base}/en/projects/${slug}/`)
    await waitFor("Boolean(document.querySelector('.detail-cover'))")
    const expectedThumbnails = expectedImages - 1
    await waitFor(`document.querySelectorAll('.detail-gallery button').length === ${expectedThumbnails}`)
    assert.ok((await waitForImages('.detail-cover img, .detail-gallery img')).every(Boolean), `${slug} gallery images must decode`)
    const metrics = await evaluate(`({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, cover: document.querySelectorAll('.detail-cover').length, thumbnails: document.querySelectorAll('.detail-gallery button').length, placeholder: Boolean(document.querySelector('.detail-media-placeholder')) })`)
    assert.ok(metrics.documentWidth <= metrics.viewport, `${slug} must not overflow on mobile`)
    assert.equal(metrics.cover, 1, `${slug} must have a cover image`)
    assert.equal(metrics.thumbnails + 1, expectedImages, `${slug} must expose every supplied photograph`)
    assert.equal(metrics.placeholder, false, `${slug} must not render a media placeholder`)
  }

  await navigate(`${base}/en/projects/mohamed-ali-palace/`)
  await evaluate("document.querySelector('.detail-cover').click(); true")
  await waitFor("document.querySelector('.portfolio-lightbox').open")
  const before = await evaluate("document.querySelector('.lightbox-toolbar > span').textContent")
  await evaluate("document.querySelector('.portfolio-lightbox').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); true")
  await waitFor(`document.querySelector('.lightbox-toolbar > span').textContent !== ${JSON.stringify(before)}`)
  await evaluate("document.querySelector('.lightbox-toolbar button').click(); true")
  await waitFor("!document.querySelector('.portfolio-lightbox').open")

  await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await navigate(`${base}/en/projects/`)
  const reducedMotion = await evaluate(`({ categoryTransition: getComputedStyle(document.querySelector('.portfolio-category-card')).transitionDuration, cardCount: document.querySelectorAll('.portfolio-card').length })`)
  assert.equal(reducedMotion.cardCount, 16, 'reduced-motion mode must retain all projects')
  const transitionSeconds = reducedMotion.categoryTransition.split(',').map((duration) => duration.trim().endsWith('ms') ? Number.parseFloat(duration) / 1000 : Number.parseFloat(duration))
  assert.ok(transitionSeconds.every((duration) => duration <= 0.0001), `reduced-motion mode must suppress category-card motion (${reducedMotion.categoryTransition})`)
  await client.send('Emulation.setEmulatedMedia', { features: [] })

  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false })
  await navigate(`${base}/en/`)
  await waitFor("document.querySelectorAll('.featured-projects nav button').length === 4")
  const initialFeatured = await evaluate("document.querySelector('[data-projects-gallery]').dataset.activeProject")
  await evaluate("document.querySelectorAll('.featured-projects nav button')[1].click(); true")
  await waitFor(`document.querySelector('[data-projects-gallery]').dataset.activeProject !== ${JSON.stringify(initialFeatured)}`)
  assert.ok((await waitForImages('.featured-projects img')).every(Boolean), 'featured project photography must decode')

  console.log(`Verified four category filters, all ${Object.keys(projects).length} galleries and ${expectedPhotoCount} numbered photographs, light/dark themes, 320/390/768/1440 layouts, keyboard lightbox controls, reduced motion, and the restored four-project homepage feature in Edge.`)
} finally {
  browser.kill()
  await delay(250)
  await rm(profile, { recursive: true, force: true })
}
