import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const outputDirectory = path.resolve('references', 'qa', 'phase-6')
const widths = [320, 390, 768, 1440, 1920]
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const results = {
  startedAt: new Date().toISOString(),
  base,
  assertions: [],
  errors: [],
  routeChecks: [],
  interactionChecks: [],
  performance: {},
}

function check(condition, message, detail) {
  const assertion = { passed: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) }
  results.assertions.push(assertion)
  if (!condition) console.error(`FAIL ${message}${detail === undefined ? '' : ` ${JSON.stringify(detail)}`}`)
  return Boolean(condition)
}

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(fullPath))
    else if (entry.name === 'index.html') files.push(fullPath)
  }
  return files
}

function expectedAlternate(route) {
  return route.startsWith('/ar/') ? route.replace(/^\/ar\//, '/en/') : route.replace(/^\/en\//, '/ar/')
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
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`CDP timed out: ${method}`))
      }, 30000)
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
    } catch {
      // Edge is still starting.
    }
    await delay(100)
  }
  throw new Error('Could not connect to the temporary Edge instance.')
}

await mkdir(outputDirectory, { recursive: true })
const routeFiles = [
  ...await walk(path.resolve('dist', 'en')),
  ...await walk(path.resolve('dist', 'ar')),
]
const routes = routeFiles
  .map((file) => `/${path.relative(path.resolve('dist'), path.dirname(file)).split(path.sep).join('/')}/`)
  .sort()
check(routes.length === 46, 'The production build contains all 46 localized route files', routes.length)

for (const route of routes) {
  const response = await fetch(`${base}${route}`)
  const html = await response.text()
  check(response.status === 200, `${route} returns HTTP 200`, response.status)
  check(html.includes('data-prerendered="true"'), `${route} serves prerendered HTML`)
  check(/<main\b[\s\S]*?<h1\b/i.test(html), `${route} contains a crawlable H1`)
}

const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-phase6-browser-'))
const port = await freePort()
const browser = spawn(edgePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profileDirectory}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true })

let client
try {
  client = await connect(port)
  await Promise.all([
    client.send('Page.enable'),
    client.send('Runtime.enable'),
    client.send('Network.enable'),
    client.send('Log.enable'),
  ])

  client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    results.errors.push({ kind: 'runtime', message: exceptionDetails.exception?.description ?? exceptionDetails.text })
  })
  client.on('Runtime.consoleAPICalled', ({ type, args }) => {
    if (type === 'error') results.errors.push({ kind: 'console', message: args.map((argument) => argument.value ?? argument.description ?? '').join(' ') })
  })
  client.on('Log.entryAdded', ({ entry }) => {
    if (entry.level === 'error' && entry.source !== 'network') results.errors.push({ kind: 'log', message: entry.text })
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
  const setViewport = async (width) => {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width,
      height: width <= 390 ? 844 : width === 768 ? 1024 : 1080,
      deviceScaleFactor: 1,
      mobile: width <= 390,
    })
  }
  const setReducedMotion = (reduced) => client.send('Emulation.setEmulatedMedia', {
    media: '',
    features: [
      { name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' },
      { name: 'prefers-color-scheme', value: 'dark' },
    ],
  })
  const navigate = async (route, timeout = 15000) => {
    await client.send('Page.navigate', { url: `${base}${route}` })
    const ready = await waitFor("document.readyState === 'complete' && document.querySelector('#root')?.dataset.clientReady === 'true' && Boolean(document.querySelector('main h1'))", timeout)
    check(ready, `${route} hydrates within ${timeout} ms`)
    return ready
  }
  const key = async (keyName, code, virtualKey, modifiers = 0, inputText = undefined) => {
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey, modifiers, ...(inputText ? { text: inputText } : {}) })
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey, modifiers })
  }
  const routeMetrics = () => evaluate(`(() => {
    const controls = [...document.querySelectorAll('button, input, select, textarea')];
    const unnamedButtons = [...document.querySelectorAll('button')].filter((button) => !(button.getAttribute('aria-label') || button.getAttribute('aria-labelledby') || button.textContent.trim())).length;
    const duplicateIds = [...document.querySelectorAll('[id]')].map((node) => node.id).filter((id, index, ids) => ids.indexOf(id) !== index);
    const unlabeledFields = controls.filter((field) => field.matches('input:not([type="hidden"]),select,textarea') && !field.labels?.length && !field.getAttribute('aria-label') && field.tabIndex >= 0).length;
    const brokenImages = [...document.images].filter((image) => image.getAttribute('src') && image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src);
    const missingAlt = [...document.images].filter((image) => !image.hasAttribute('alt')).map((image) => image.currentSrc || image.src);
    const hiddenReveals = [...document.querySelectorAll('[data-reveal]')].filter((node) => Number(getComputedStyle(node).opacity) < .01).length;
    return {
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      h1Count: document.querySelectorAll('main h1').length,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      hasHeader: Boolean(document.querySelector('.site-header')),
      hasMain: Boolean(document.querySelector('main')),
      hasFooter: Boolean(document.querySelector('footer')),
      duplicateIds,
      unlabeledFields,
      unnamedButtons,
      brokenImages,
      missingAlt,
      hiddenReveals,
      generatedResources: performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/assets/generated/')).map((entry) => entry.name),
      textHasMojibake: /(?:Ã.|Â.|Ø.|Ù.)/.test(document.body.innerText),
      languageHref: document.querySelector('.language-switch')?.getAttribute('href'),
      hrefs: [...document.querySelectorAll('a[href]')].map((link) => link.href),
      imageUrls: [...document.images].flatMap((image) => [image.src, ...(image.srcset || '').split(',').map((candidate) => candidate.trim().split(/\\s+/)[0])]).filter(Boolean),
    };
  })()`)

  const collectedUrls = new Set()
  await setReducedMotion(true)
  for (const width of widths) {
    await setViewport(width)
    for (const route of routes) {
      if (!await navigate(route)) continue
      const metrics = await routeMetrics()
      const locale = route.startsWith('/ar/') ? 'ar' : 'en'
      check(metrics.width === width, `${route} uses the requested ${width}px viewport`, metrics.width)
      check(metrics.documentWidth <= width + 1, `${route} has no horizontal overflow at ${width}px`, { documentWidth: metrics.documentWidth, width })
      check(metrics.h1Count === 1, `${route} has exactly one H1 at ${width}px`, metrics.h1Count)
      check(metrics.lang === locale && metrics.dir === (locale === 'ar' ? 'rtl' : 'ltr'), `${route} has correct language and direction at ${width}px`, { lang: metrics.lang, dir: metrics.dir })
      check(metrics.hasHeader && metrics.hasMain && metrics.hasFooter, `${route} retains its page landmarks at ${width}px`)
      check(metrics.duplicateIds.length === 0, `${route} has no duplicate IDs at ${width}px`, metrics.duplicateIds)
      check(metrics.unlabeledFields === 0 && metrics.unnamedButtons === 0, `${route} interactive controls have accessible names at ${width}px`, { unlabeledFields: metrics.unlabeledFields, unnamedButtons: metrics.unnamedButtons })
      check(metrics.missingAlt.length === 0, `${route} images have alt attributes at ${width}px`, metrics.missingAlt)
      check(metrics.brokenImages.length === 0, `${route} has no broken loaded images at ${width}px`, metrics.brokenImages)
      check(metrics.hiddenReveals === 0, `${route} keeps revealed content visible with reduced motion at ${width}px`, metrics.hiddenReveals)
      check(metrics.generatedResources.length === 0, `${route} loads no generated architectural imagery at ${width}px`, metrics.generatedResources)
      check(!metrics.textHasMojibake, `${route} contains no visible encoding corruption at ${width}px`)
      check(metrics.languageHref?.endsWith(expectedAlternate(route)), `${route} language switch preserves its route`, metrics.languageHref)
      if (width === 390) [...metrics.hrefs, ...metrics.imageUrls].forEach((url) => collectedUrls.add(url))
      results.routeChecks.push({ route, width, documentWidth: metrics.documentWidth, lang: metrics.lang, dir: metrics.dir })
    }
    console.log(`Completed ${width}px route matrix (${routes.length} routes).`)
  }

  for (const candidate of collectedUrls) {
    const url = new URL(candidate, `${base}/en/`)
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== new URL(base).origin) continue
    url.hash = ''
    const response = await fetch(url)
    check(response.status >= 200 && response.status < 400, `Internal resource resolves: ${url.pathname}${url.search}`, response.status)
  }

  for (const width of widths) {
    await setViewport(width)
    await navigate('/en/about/')
    await evaluate("localStorage.setItem('summit-theme','dark');document.documentElement.dataset.theme='dark';true")
    await evaluate("document.querySelector('.site-header button[aria-label^=\"Switch to\"]')?.click();true")
    check(await waitFor("document.documentElement.dataset.theme === 'light'"), `Theme switches to light at ${width}px`)
    await client.send('Page.reload', { ignoreCache: true })
    check(await waitFor("document.querySelector('#root')?.dataset.clientReady === 'true' && document.documentElement.dataset.theme === 'light'"), `Light theme persists after refresh at ${width}px`)
    await evaluate("document.querySelector('.site-header button[aria-label^=\"Switch to\"]')?.click();true")
    check(await waitFor("document.documentElement.dataset.theme === 'dark'"), `Theme switches back to dark at ${width}px`)
  }

  await setViewport(390)
  await navigate('/en/projects/')
  const allCount = await evaluate("document.querySelectorAll('.portfolio-card').length")
  const secondFilter = await evaluate("document.querySelectorAll('.portfolio-filters button')[1]?.textContent.trim()")
  await evaluate("document.querySelectorAll('.portfolio-filters button')[1]?.focus();true")
  await key(' ', 'Space', 32)
  check(await waitFor(`document.querySelectorAll('.portfolio-card').length > 0 && document.querySelectorAll('.portfolio-card').length < ${allCount}`), 'Project category filter responds to the Space key')
  check(await evaluate("document.querySelectorAll('.portfolio-filters button')[1].getAttribute('aria-pressed') === 'true'"), 'Active project filter exposes aria-pressed')
  results.interactionChecks.push({ filter: secondFilter, allCount, filteredCount: await evaluate("document.querySelectorAll('.portfolio-card').length") })

  await navigate('/en/projects/mohamed-ali-palace/')
  await evaluate("document.querySelector('.gallery-trigger').focus();true")
  await key('Enter', 'Enter', 13, 0, '\r')
  check(await waitFor("document.querySelector('.portfolio-lightbox')?.open === true"), 'Project lightbox opens from the keyboard')
  check(await evaluate("document.querySelector('.portfolio-lightbox').contains(document.activeElement)"), 'Project lightbox receives focus')
  const initialCounter = await evaluate("document.querySelector('.lightbox-toolbar span').textContent")
  await key('ArrowRight', 'ArrowRight', 39)
  check(await waitFor(`document.querySelector('.lightbox-toolbar span').textContent !== ${JSON.stringify(initialCounter)}`), 'Right Arrow advances the lightbox')
  await key('ArrowLeft', 'ArrowLeft', 37)
  check(await waitFor(`document.querySelector('.lightbox-toolbar span').textContent === ${JSON.stringify(initialCounter)}`), 'Left Arrow reverses the lightbox')
  await key('Escape', 'Escape', 27)
  check(await waitFor("document.querySelector('.portfolio-lightbox')?.open === false"), 'Escape closes the lightbox')
  check(await evaluate("document.activeElement === document.querySelector('.gallery-trigger')"), 'Closing the lightbox restores focus to its trigger')

  await navigate('/en/about/')
  await evaluate("document.querySelector('[aria-controls=\"mobile-navigation\"]').focus();true")
  await key('Enter', 'Enter', 13, 0, '\r')
  check(await waitFor("Boolean(document.querySelector('#mobile-navigation'))"), 'Mobile navigation opens from the keyboard')
  check(await evaluate("document.body.style.overflow === 'hidden'"), 'Open mobile navigation locks background scrolling')
  let menuFocusContained = true
  for (let index = 0; index < 14; index += 1) {
    await key('Tab', 'Tab', 9)
    menuFocusContained &&= await evaluate("document.querySelector('.site-header').contains(document.activeElement)")
  }
  check(menuFocusContained, 'Mobile navigation keeps keyboard focus inside the open header')
  await key('Escape', 'Escape', 27)
  check(await waitFor("!document.querySelector('#mobile-navigation') && document.activeElement === document.querySelector('[aria-controls=\"mobile-navigation\"]')"), 'Escape closes mobile navigation and restores focus')
  check(await evaluate("document.body.style.overflow !== 'hidden'"), 'Closing mobile navigation restores page scrolling')

  await navigate('/en/contact/')
  await delay(1600)
  await evaluate("document.querySelector('.enquiry-form').requestSubmit();true")
  check((await evaluate("document.querySelector('.form-status').dataset.state")) === 'error', 'Invalid form submission exposes an error state')
  check((await evaluate("document.querySelector('.form-status').getAttribute('role')")) === 'alert', 'Invalid form submission uses an alert role')
  check((await evaluate("document.querySelector('.enquiry-form').dataset.deliveryConfigured")) === 'false', 'Final build reports the unconfigured delivery endpoint truthfully')
  check((await evaluate("document.querySelector('.contact-direct').getAttribute('href')")) === 'mailto:Projects@Summit-constructions.com', 'Direct email fallback uses the verified destination')

  await setReducedMotion(true)
  await navigate('/en/')
  check(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"), 'Reduced-motion preference is active in the browser')
  check(await evaluate("!document.querySelector('[data-skip-intro]') && document.querySelector('button[aria-label=\"Autoplay disabled by reduced motion preference\"]')?.disabled === true"), 'Reduced motion skips the intro and disables hero autoplay')

  await setReducedMotion(false)
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: 50000,
    uploadThroughput: 25000,
    connectionType: 'cellular3g',
  })
  await evaluate("sessionStorage.removeItem('summit-intro-seen');true")
  const slowStarted = Date.now()
  await client.send('Page.reload', { ignoreCache: true })
  const slowHydrated = await waitFor("document.querySelector('#root')?.dataset.clientReady === 'true'", 30000)
  const slowReady = slowHydrated && await waitFor("!document.querySelector('[data-skip-intro]')", 5000)
  const slowState = await evaluate(`(() => { const heading=document.querySelector('#top h1'); return { heading: heading?.textContent.trim(), visible: heading ? getComputedStyle(heading).visibility !== 'hidden' && Number(getComputedStyle(heading).opacity) > .9 : false, bodyOverflow: document.body.style.overflow, htmlOverflow: document.documentElement.style.overflow }; })()`)
  check(slowHydrated, 'Homepage hydrates on a throttled 3G connection')
  check(slowReady, 'Homepage entrance completes after throttled hydration')
  check(slowState.visible && slowState.bodyOverflow !== 'hidden' && slowState.htmlOverflow !== 'hidden', 'Slow connection leaves readable content and scrolling unlocked', slowState)
  results.performance.slow3gEntranceMs = Date.now() - slowStarted
  await client.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1, connectionType: 'none' })

  await setViewport(1440)
  await setReducedMotion(false)
  await client.send('Network.setCacheDisabled', { cacheDisabled: true })
  await navigate('/en/about/')
  await delay(800)
  results.performance.aboutColdLoad = await evaluate(`(() => {
    const resources=performance.getEntriesByType('resource');
    const scripts=resources.filter((entry)=>entry.initiatorType==='script');
    const styles=resources.filter((entry)=>entry.initiatorType==='link' && entry.name.endsWith('.css'));
    return { resourceCount:resources.length, scripts:scripts.map((entry)=>({name:entry.name.split('/').pop(),encodedBodySize:entry.encodedBodySize,duration:Math.round(entry.duration)})), styles:styles.map((entry)=>({name:entry.name.split('/').pop(),encodedBodySize:entry.encodedBodySize,duration:Math.round(entry.duration)})), totalEncodedBytes:resources.reduce((sum,entry)=>sum+entry.encodedBodySize,0) };
  })()`)
  await client.send('Network.setCacheDisabled', { cacheDisabled: false })
} catch (error) {
  results.errors.push({ kind: 'qa-script', message: error.stack ?? String(error) })
} finally {
  results.finishedAt = new Date().toISOString()
  results.summary = {
    assertions: results.assertions.length,
    passed: results.assertions.filter((assertion) => assertion.passed).length,
    failed: results.assertions.filter((assertion) => !assertion.passed).length,
    routeViewportChecks: results.routeChecks.length,
    runtimeErrors: results.errors.length,
  }
  await writeFile(path.join(outputDirectory, 'browser-results.json'), `${JSON.stringify(results, null, 2)}\n`, 'utf8')
  if (client) {
    try { await client.send('Browser.close') } catch { /* The browser may already be closed. */ }
  }
  browser.kill()
  await delay(250)
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 })
}

console.log(JSON.stringify(results.summary, null, 2))
if (results.summary.failed || results.summary.runtimeErrors || results.summary.routeViewportChecks !== routes.length * widths.length) process.exitCode = 1
