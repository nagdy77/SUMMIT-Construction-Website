import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const urlArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'))
const base = (urlArgument ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const configuredEndpointTest = process.argv.includes('--configured')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(full))
    else if (entry.name === 'index.html') files.push(full)
  }
  return files
}

const dist = path.resolve('dist')
const routeFiles = [...await walk(path.join(dist, 'en')), ...await walk(path.join(dist, 'ar'))]
const routes = routeFiles.map((file) => `/${path.relative(dist, path.dirname(file)).split(path.sep).join('/')}/`).sort()
assert.equal(routes.length, 44)

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
  for (let attempt = 0; attempt < 100; attempt++) {
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

for (const route of routes) {
  const response = await fetch(`${base}${route}`)
  assert.equal(response.status, 200, `${route} direct URL must return 200`)
  const html = await response.text()
  assert.match(html, /data-prerendered="true"/, `${route} direct URL must serve static HTML`)
  assert.match(html, /<main\b[\s\S]*?<h1\b/, `${route} direct URL must contain a crawlable H1`)
}

const profile = await mkdtemp(path.join(os.tmpdir(), 'summit-phase5-browser-'))
const port = await freePort()
const browser = spawn(edgePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true })

try {
  const client = await connect(port)
  await Promise.all([client.send('Page.enable'), client.send('Runtime.enable')])
  const evaluate = async (expression) => {
    const result = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result.value
  }
  const waitFor = async (expression, timeout = 12000) => {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return
      await delay(80)
    }
    throw new Error(`Timed out waiting for ${expression}`)
  }
  const navigate = async (route) => {
    await client.send('Page.navigate', { url: `${base}${route}` })
    await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('.site-header'))")
  }
  const routeMetrics = () => evaluate(`(() => ({
    width: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    h1Count: document.querySelectorAll('main h1').length,
    duplicateIds: [...document.querySelectorAll('[id]')].map((node) => node.id).filter((id, index, ids) => ids.indexOf(id) !== index),
    unlabeledFields: [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter((field) => !field.labels?.length && !field.getAttribute('aria-label')).length,
    failedImages: [...document.images].filter((image) => !image.dataset.src && image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
    generatedResources: performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/assets/generated/')).length,
  }))()`)

  await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  for (const route of routes) {
    await navigate(route)
    const metrics = await routeMetrics()
    assert.ok(metrics.documentWidth <= metrics.width, `${route} must not overflow horizontally`)
    assert.equal(metrics.h1Count, 1, `${route} must have one H1`)
    assert.deepEqual(metrics.duplicateIds, [], `${route} must not contain duplicate IDs`)
    assert.equal(metrics.unlabeledFields, 0, `${route} fields must have accessible labels`)
    assert.deepEqual(metrics.failedImages, [], `${route} must have no broken loaded images`)
    assert.equal(metrics.generatedResources, 0, `${route} must not load generated architectural imagery`)
  }

  for (const route of ['/en/downloads/', '/ar/downloads/']) {
    await navigate(route)
    await waitFor("document.querySelector('#root')?.dataset.clientReady === 'true' && document.querySelector('main .eyebrow')?.textContent.trim() === '404'")
    assert.equal(await evaluate("document.querySelectorAll('a[href*=" + JSON.stringify('/downloads/') + "]').length"), 0, `${route} must render the not-found page without a Downloads link`)
  }

  for (const route of ['/en/', '/ar/about/', '/en/services/restoration/', '/ar/projects/mohamed-ali-palace/', '/en/contact/']) {
    await navigate(route)
    await client.send('Page.reload', { ignoreCache: true })
    await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('main h1'))")
    assert.deepEqual((await routeMetrics()).failedImages, [], `${route} must survive a direct refresh`)
  }

  for (const width of [390, 1440]) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1, mobile: width === 390 })
    for (const theme of ['dark', 'light']) {
      for (const route of ['/en/services/', '/ar/contact/', '/en/projects/']) {
        await navigate(route)
        await evaluate(`localStorage.setItem('summit-theme', '${theme}'); location.reload(); true`)
        await waitFor(`document.documentElement.dataset.theme === '${theme}'`)
        const metrics = await routeMetrics()
        assert.ok(metrics.documentWidth <= width, `${route} ${theme} must fit ${width}px`)
        assert.deepEqual(metrics.failedImages, [], `${route} ${theme} must load images at ${width}px`)
      }
    }
  }

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await navigate('/en/services/restoration/')
  const languageHref = await evaluate("document.querySelector('.language-switch').getAttribute('href')")
  assert.match(languageHref, /\/ar\/services\/restoration\/$/, 'language switch must preserve the current route')
  await navigate('/ar/services/restoration/')
  assert.equal(await evaluate("document.documentElement.dir"), 'rtl')

  await navigate('/en/services/')
  assert.deepEqual(await evaluate(`(() => ({ disciplines: [...document.querySelectorAll('.formal-disciplines-grid h3')].map((node) => node.textContent), pages: [...document.querySelectorAll('.service-index-row h2')].map((node) => node.textContent) }))()`), {
    disciplines: ['Construction', 'Restoration', 'Renovation'],
    pages: ['Construction', 'Heritage Restoration', 'Residential Fit-Out', 'Commercial Fit-Out'],
  })

  await navigate('/en/projects/')
  assert.equal(await evaluate("document.querySelectorAll('.portfolio-card').length"), 11)
  await evaluate("document.querySelectorAll('.portfolio-filters button')[1].click(); true")
  await waitFor("document.querySelectorAll('.portfolio-card').length > 0 && document.querySelectorAll('.portfolio-card').length < 11")
  await evaluate("document.querySelectorAll('.portfolio-filters button')[0].click(); true")
  await waitFor("document.querySelectorAll('.portfolio-card').length === 11")

  await navigate('/en/projects/mohamed-ali-palace/')
  await evaluate("document.querySelector('.gallery-trigger').click(); true")
  await waitFor("document.querySelector('.portfolio-lightbox').open")
  const before = await evaluate("document.querySelector('.lightbox-toolbar span').textContent")
  await evaluate("document.querySelector('.lightbox-controls button:last-child').click(); true")
  await waitFor(`document.querySelector('.lightbox-toolbar span').textContent !== ${JSON.stringify(before)}`)
  await evaluate("document.querySelector('.lightbox-toolbar button').click(); true")
  await waitFor("!document.querySelector('.portfolio-lightbox').open")

  await navigate('/en/contact/')
  await delay(1600)
  await evaluate("document.querySelector('.enquiry-form').requestSubmit(); true")
  assert.match(await evaluate("document.querySelector('.form-status').textContent"), /required fields/i)
  assert.equal(await evaluate("document.querySelector('.form-status').getAttribute('role')"), 'alert')

  const fillValidForm = () => evaluate(`(() => {
    const set = (selector, value) => { const node = document.querySelector(selector); node.value = value; node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true })); };
    set('#contact-name', 'QA Review'); set('#contact-email', 'qa@example.com'); set('#contact-phone', '+20 100 000 0000'); set('#contact-interest', 'construction'); set('#contact-message', 'This is a controlled local integration test message.'); return true;
  })()`)

  if (configuredEndpointTest) {
    await navigate('/en/contact/')
    await delay(1600)
    await fillValidForm()
    await evaluate(`window.fetch = () => new Promise((resolve) => setTimeout(() => resolve(new Response('', { status: 200 })), 250)); document.querySelector('.enquiry-form').requestSubmit(); true`)
    await waitFor("document.querySelector('.enquiry-form').getAttribute('aria-busy') === 'true'")
    assert.equal(await evaluate("document.querySelector('.enquiry-form button[type=submit]').disabled"), true)
    await waitFor("document.querySelector('.form-status').dataset.state === 'success'")
    assert.match(await evaluate("document.querySelector('.form-status').textContent"), /accepted your enquiry/i)

    await navigate('/en/contact/')
    await delay(1600)
    await fillValidForm()
    await evaluate(`window.fetch = () => Promise.resolve(new Response('', { status: 500 })); document.querySelector('.enquiry-form').requestSubmit(); true`)
    await waitFor("document.querySelector('.form-status').dataset.state === 'error'")
    assert.match(await evaluate("document.querySelector('.form-status').textContent"), /could not be submitted/i)
  } else {
    await navigate('/en/contact/')
    assert.equal(await evaluate("document.querySelector('.enquiry-form').dataset.deliveryConfigured"), 'false')
    await delay(1600)
    await fillValidForm()
    await evaluate("document.querySelector('.enquiry-form').requestSubmit(); true")
    await waitFor("document.querySelector('.form-status').dataset.state === 'error'")
    assert.match(await evaluate("document.querySelector('.form-status').textContent"), /awaiting provider configuration/i)
    assert.equal(await evaluate("document.querySelector('.form-status').dataset.state"), 'error')
  }

  await client.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await navigate('/en/services/')
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-reveal]')).opacity"), '1')

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await navigate('/en/about/')
  const menuButton = "document.querySelector('[aria-controls=mobile-navigation]')"
  await evaluate(`${menuButton}.click(); true`)
  await waitFor("document.querySelector('#mobile-navigation')?.getAttribute('aria-hidden') === 'false' && Number(getComputedStyle(document.querySelector('#mobile-navigation')).opacity) > .95")
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true")
  await waitFor("document.querySelector('#mobile-navigation')?.getAttribute('aria-hidden') === 'true' && getComputedStyle(document.querySelector('#mobile-navigation')).visibility === 'hidden'")
  assert.equal(await evaluate(`${menuButton} === document.activeElement`), true)

  console.log(`Verified 44 direct localized routes, refreshes, navigation, language switching, both themes, mobile/desktop layouts, service alignment, filters, gallery controls, ${configuredEndpointTest ? 'configured form loading/success/error states' : 'unconfigured form error behavior'}, accessibility basics, reduced motion and image loading in Edge.`)
} finally {
  browser.kill()
  await delay(250)
  await rm(profile, { recursive: true, force: true })
}
