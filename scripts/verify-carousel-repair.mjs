import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

// This suite observes real, unmodified animation time in Edge. It never seeks,
// pauses, accelerates, or otherwise drives a GSAP timeline. Screenshot pixels,
// rather than timeline existence or image coverage alone, are the fade proof.
const siteUrl = process.argv[2] ?? 'http://127.0.0.1:4173/'
const viewportFilter = process.argv[3]
const outputDirectory = path.resolve('references/qa/carousel-repair')
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

class CdpClient {
  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Map()
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(String(data))
      if (!message.id) {
        for (const listener of this.listeners.get(message.method) ?? []) listener(message.params)
        return
      }
      const request = this.pending.get(message.id)
      if (!request) return
      this.pending.delete(message.id)
      clearTimeout(request.timeout)
      if (message.error) request.reject(new Error(message.error.message))
      else request.resolve(message.result)
    })
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`CDP command timed out: ${method}`))
      }, 20000)
      this.pending.set(id, { resolve, reject, timeout })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? []
    listeners.push(listener)
    this.listeners.set(method, listeners)
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
    return response.result.value
  }
}

async function connect(port) {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
      const page = pages.find((candidate) => candidate.type === 'page')
      if (page?.webSocketDebuggerUrl) {
        const socket = new WebSocket(page.webSocketDebuggerUrl)
        await new Promise((resolve, reject) => {
          socket.addEventListener('open', resolve, { once: true })
          socket.addEventListener('error', reject, { once: true })
        })
        return new CdpClient(socket)
      }
    } catch { /* Edge is starting. */ }
    await delay(100)
  }
  throw new Error('Headless Edge did not start.')
}

async function waitFor(client, expression, message, timeout = 12000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await client.evaluate(expression)) return
    await delay(12)
  }
  const snapshot = await client.evaluate('window.__carouselRepairQA?.snapshot()')
  throw new Error(`Timed out: ${message}. ${JSON.stringify(snapshot)}`)
}

const monitorSource = `(() => {
  const qa = window.__carouselRepairQA = { frames: [], armed: false, section: 'hero' };
  function opacity(element, stop) {
    let result = 1;
    for (let current = element; current && current !== stop; current = current.parentElement) {
      result *= Number(getComputedStyle(current).opacity);
    }
    return Number(result.toFixed(5));
  }
  function imageState(layer, index, root) {
    const image = layer.querySelector('img[data-hero-image], img[data-project-image]');
    const style = getComputedStyle(layer);
    const photo = image && getComputedStyle(image);
    return { index, selection: layer.dataset.selection, active: layer.dataset.layerActive,
      visible: Boolean(image && photo.visibility !== 'hidden' && !image.hidden),
      opacity: image ? opacity(image, root) : 0,
      layerOpacity: Number(style.opacity), zIndex: Number(style.zIndex), clipPath: style.clipPath,
      decoded: Boolean(image?.complete && image?.naturalWidth > 0),
      source: image?.currentSrc, fit: photo?.objectFit };
  }
  qa.snapshot = () => {
    const root = document.querySelector(qa.section === 'hero' ? '#top' : '[data-projects-gallery]');
    if (!root) return null;
    const copyRoot = qa.section === 'hero' ? root : document.querySelector('#projects');
    const selector = qa.section === 'hero' ? '[data-hero-copy], [data-hero-line]' : '[data-project-active-copy]';
    return { time: performance.now(), section: qa.section,
      state: qa.section === 'hero' ? root.dataset.transitionState : root.dataset.galleryState,
      project: root.dataset.activeProject, image: root.dataset.activeImage,
      layers: [...root.querySelectorAll(qa.section === 'hero' ? '[data-hero-slide]' : '[data-project-layer]')]
        .map((layer, index) => imageState(layer, index, root)),
      copy: [...copyRoot.querySelectorAll(selector)].map(element => ({
        text: element.textContent.trim().replace(/\\s+/g, ' '),
        opacity: opacity(element, copyRoot), localOpacity: Number(getComputedStyle(element).opacity),
        visible: getComputedStyle(element).visibility !== 'hidden',
        transform: getComputedStyle(element).transform,
        bounds: { top: element.getBoundingClientRect().top, height: element.getBoundingClientRect().height }
      })) };
  };
  function sample() {
    if (qa.armed) qa.frames.push(qa.snapshot());
    requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
})();`

const heroIndexExpression = `[...document.querySelectorAll('[data-hero-slide]')].findIndex(slide => slide.getAttribute('aria-hidden') === 'false')`
const galleryStateExpression = `(() => {
  const gallery = document.querySelector('[data-projects-gallery]');
  const layer = gallery?.querySelector('[data-layer-active="true"]');
  const image = layer?.querySelector('img[data-project-image]');
  return { project: gallery?.dataset.activeProject, image: Number(gallery?.dataset.activeImage),
    state: gallery?.dataset.galleryState, selection: layer?.dataset.selection,
    decoded: Boolean(image?.complete && image.naturalWidth > 0 && !image.hidden),
    fit: image ? getComputedStyle(image).objectFit : null };
})()`

async function click(client, selector) {
  await client.evaluate(`(() => { const button = document.querySelector(${JSON.stringify(selector)}); if (!button) throw new Error('Missing control: ' + ${JSON.stringify(selector)}); button.click(); })()`)
}

async function waitHero(client, index, timeout = 14000) {
  await waitFor(client, `document.querySelector('#top')?.dataset.transitionState === 'idle' && (${heroIndexExpression}) === ${index}`, `hero slide ${index + 1}`, timeout)
  assert.equal(await client.evaluate(`(() => { const image = document.querySelectorAll('[data-hero-image]')[${index}]; return image?.dataset.ready === 'true' && image.complete && image.naturalWidth > 0 && !image.hidden; })()`), true, `Hero ${index + 1} must have a decoded photograph`)
}

async function waitGallery(client, project, image, timeout = 14000) {
  await waitFor(client, `(() => { const value = ${galleryStateExpression}; return value.project === ${JSON.stringify(project)} && value.image === ${image} && value.state === 'idle' && value.decoded; })()`, `gallery ${project} photograph ${image + 1}`, timeout)
}

async function screenshot(client, name) {
  const before = await client.evaluate('window.__carouselRepairQA.snapshot()')
  const capture = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  const after = await client.evaluate('window.__carouselRepairQA.snapshot()')
  const buffer = Buffer.from(capture.data, 'base64')
  await writeFile(path.join(outputDirectory, `${name}.png`), buffer)
  return { buffer, name, before, after }
}

async function imagePixels(buffer, region) {
  return sharp(buffer).extract(region).resize(36, 36, { fit: 'fill' }).blur(0.65).removeAlpha().raw().toBuffer()
}

const rmse = (first, second) => Math.sqrt(first.reduce((sum, value, index) => sum + (value - second[index]) ** 2, 0) / first.length)

async function pixelEvidence(frames, region) {
  const before = await imagePixels(frames[0].buffer, region)
  const after = await imagePixels(frames.at(-1).buffer, region)
  const endpointsDifference = rmse(before, after)
  assert.ok(endpointsDifference > 3, `Photography endpoints must visibly differ; difference was ${endpointsDifference.toFixed(3)}`)
  const middleFrames = []
  for (const frame of frames.slice(1, -1)) {
    const middle = await imagePixels(frame.buffer, region)
    let numerator = 0
    let denominator = 0
    for (let index = 0; index < before.length; index += 1) {
      const difference = after[index] - before[index]
      numerator += (middle[index] - before[index]) * difference
      denominator += difference ** 2
    }
    const fittedIncomingWeight = numerator / denominator
    const blend = before.map((value, index) => Math.round(value + fittedIncomingWeight * (after[index] - value)))
    const distanceToBefore = rmse(middle, before)
    const distanceToAfter = rmse(middle, after)
    const distanceToBlend = rmse(middle, blend)
    const visiblyMixed = fittedIncomingWeight > 0.12 && fittedIncomingWeight < 0.88
      && Math.min(distanceToBefore, distanceToAfter) > 1.5
      && distanceToBlend < Math.min(distanceToBefore, distanceToAfter) * 0.85
    middleFrames.push({ screenshot: `${frame.name}.png`, fittedIncomingWeight, distanceToBefore, distanceToAfter, distanceToBlend, visiblyMixed })
  }
  return { region, endpointsDifference, middleFrames, visiblyMixed: middleFrames.some((frame) => frame.visiblyMixed) }
}

async function filmstrip(frames, name, width, height) {
  const panelWidth = width < 500 ? 220 : 360
  const panelHeight = Math.round(height * panelWidth / width)
  const panels = []
  for (const [index, frame] of frames.entries()) {
    const image = await sharp(frame.buffer).resize(panelWidth, panelHeight).png().toBuffer()
    const label = index === 0 ? 'BEFORE' : index === frames.length - 1 ? 'AFTER' : `DURING ${index}`
    const heading = Buffer.from(`<svg width="${panelWidth}" height="32"><rect width="100%" height="100%" fill="#161616"/><text x="12" y="21" font-family="Arial" font-size="12" fill="#D5B452">${label}</text></svg>`)
    panels.push({ input: image, top: 32, left: index * panelWidth })
    panels.push({ input: heading, top: 0, left: index * panelWidth })
  }
  await sharp({ create: { width: panelWidth * frames.length, height: panelHeight + 32, channels: 3, background: '#161616' } })
    .composite(panels).png().toFile(path.join(outputDirectory, `${name}-filmstrip.png`))
}

function animationEvidence(samples, section) {
  const animated = samples.filter((frame) => frame.state === (section === 'hero' ? 'animating' : 'transitioning'))
  const overlap = animated.filter((frame) => frame.layers.filter((layer) => layer.visible && layer.decoded && layer.opacity > 0.015).length >= 2)
  const gradual = overlap.filter((frame) => frame.layers.some((layer) => layer.opacity > 0.08 && layer.opacity < 0.92))
  const outgoingRetained = overlap.every((frame) => frame.layers.some((layer) => layer.visible && layer.decoded && layer.opacity >= 0.99))
  const partialCopy = animated.flatMap((frame) => frame.copy.filter((item) => item.visible && item.opacity > 0.03 && item.opacity < 0.97).map((copy) => ({ time: frame.time, text: copy.text, opacity: copy.opacity })))
  const localCopyFade = animated.flatMap((frame) => frame.copy.filter((item) => item.visible && item.localOpacity > 0.03 && item.localOpacity < 0.97).map((copy) => ({ time: frame.time, text: copy.text, opacity: copy.localOpacity })))
  return { totalFrames: samples.length, animatedFrames: animated.length, overlappingFrames: overlap.length,
    gradualOpacityFrames: gradual.length, outgoingRetained,
    gradualDurationMs: gradual.length > 1 ? gradual.at(-1).time - gradual[0].time : 0,
    partialCopyFrames: partialCopy.length, independentlyFadingCopyFrames: localCopyFade.length,
    localCopyFade: localCopyFade.slice(0, 8) }
}

async function recordTransition(client, options) {
  const { name, section, target, trigger, width, height, detailed = false } = options
  await client.evaluate(`window.__carouselRepairQA.section = ${JSON.stringify(section)}; window.__carouselRepairQA.frames = []; window.__carouselRepairQA.armed = false`)
  const region = section === 'hero'
    ? width < 500 ? { left: 185, top: 125, width: 185, height: 190 } : { left: 1080, top: 130, width: 310, height: 430 }
    : await client.evaluate(`(() => { const rect = document.querySelector('[data-projects-gallery]').getBoundingClientRect(); return {
      left: Math.ceil(rect.left + rect.width * .12), top: Math.ceil(rect.top + rect.height * .16),
      width: Math.floor(rect.width * .58), height: Math.floor(rect.height * .53)
    }; })()`)
  const frames = [await screenshot(client, `${name}-before`)]
  await client.evaluate('window.__carouselRepairQA.frames = []; window.__carouselRepairQA.armed = true')
  await trigger()
  await waitFor(client, `window.__carouselRepairQA.snapshot()?.state === ${JSON.stringify(section === 'hero' ? 'animating' : 'transitioning')}`, `${name} transition starts`, 13000)
  const transitionStart = await client.evaluate('performance.now()')
  for (const milliseconds of detailed ? [200, 500, 800] : [500]) {
    const now = await client.evaluate('performance.now()')
    if (now < transitionStart + milliseconds) await delay(transitionStart + milliseconds - now)
    frames.push(await screenshot(client, `${name}-during-${milliseconds}ms`))
  }
  if (section === 'hero') await waitHero(client, target)
  else await waitGallery(client, target.project, target.image)
  // A completed transition must already paint the target; allow one actual frame.
  await delay(40)
  frames.push(await screenshot(client, `${name}-after`))
  await client.evaluate('window.__carouselRepairQA.armed = false')
  const samples = await client.evaluate('window.__carouselRepairQA.frames')
  const motion = animationEvidence(samples, section)
  const pixels = await pixelEvidence(frames, region)
  const result = { name, section, target, motion, pixels,
    screenshots: frames.map(({ name: frameName, before, after }) => ({ file: `${frameName}.png`, before, after })),
    samples }
  await writeFile(path.join(outputDirectory, `${name}-frames.json`), `${JSON.stringify(result, null, 2)}\n`)
  await filmstrip(frames, name, width, height)
  assert.ok(motion.gradualOpacityFrames >= 8, `${name}: too few actual intermediate image opacities (${motion.gradualOpacityFrames})`)
  assert.ok(motion.gradualDurationMs >= 400, `${name}: image opacity did not visibly evolve over time (${motion.gradualDurationMs.toFixed(0)}ms)`)
  assert.ok(motion.outgoingRetained, `${name}: outgoing image must remain fully opaque under incoming image`)
  assert.ok(pixels.visiblyMixed, `${name}: screenshot pixels do not prove an in-progress fade; inspect filmstrip`)
  assert.ok(motion.independentlyFadingCopyFrames >= 3, `${name}: supporting copy did not independently fade`)
  console.log(`PASS ${name}: ${motion.gradualOpacityFrames} intermediate image frames; pixel mixture ${pixels.middleFrames.map((frame) => frame.fittedIncomingWeight.toFixed(2)).join('/')}`)
  return result
}

async function runViewport(viewport) {
  const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-carousel-repair-'))
  const port = 9700 + Math.floor(Math.random() * 700)
  const browser = spawn(edgePath, [
    '--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-background-timer-throttling',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profileDirectory}`, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true })
  const result = { name: viewport.name, viewport: [viewport.width, viewport.height], passed: false, transitions: [], consoleErrors: [] }
  let client
  try {
    client = await connect(port)
    await Promise.all([client.send('Page.enable'), client.send('Runtime.enable'), client.send('Network.enable'), client.send('Log.enable')])
    client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => result.consoleErrors.push(exceptionDetails.exception?.description ?? exceptionDetails.text))
    client.on('Runtime.consoleAPICalled', ({ type, args }) => {
      if (type === 'error') result.consoleErrors.push(args.map((argument) => argument.value ?? argument.description ?? '').join(' '))
    })
    await client.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 500 })
    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
    await client.send('Page.addScriptToEvaluateOnNewDocument', { source: monitorSource })
    await client.send('Page.navigate', { url: siteUrl })
    await waitFor(client, `Boolean(document.querySelector('[data-projects-gallery]') && document.querySelectorAll('[data-hero-slide]').length === 4 && !document.querySelector('vite-error-overlay'))`, 'application mounted', 18000)
    await waitFor(client, `!document.querySelector('[data-skip-intro]') && document.querySelector('#summit-first-hero-image')?.dataset.ready === 'true'`, 'intro handoff', 12000)
    await delay(2100)
    await waitHero(client, 0)
    await click(client, '[aria-label="Pause carousel autoplay"]')
    const transition = (options) => recordTransition(client, { width: viewport.width, height: viewport.height, ...options })
    for (let target = 1; target <= 4; target += 1) {
      result.transitions.push(await transition({ name: `${viewport.name}-hero-${target % 4 + 1}`, section: 'hero', target: target % 4, detailed: target === 1 || target === 3,
        trigger: () => click(client, '[aria-label="Show next slide"]') }))
    }
    result.transitions.push(await transition({ name: `${viewport.name}-hero-autoplay`, section: 'hero', target: 1, detailed: true,
      trigger: () => click(client, '[aria-label="Resume carousel autoplay"]') }))
    await click(client, '[aria-label="Pause carousel autoplay"]')
    await client.evaluate(`(async () => { for (let count = 0; count < 7; count++) { document.querySelector('[aria-label="Show next slide"]').click(); await new Promise(resolve => setTimeout(resolve, 35)); } })()`)
    await waitHero(client, 0)
    result.rapidHeroNextClicks = 7
    await client.evaluate(`(async () => { for (let count = 0; count < 6; count++) { document.querySelector('[aria-label="Show previous slide"]').click(); await new Promise(resolve => setTimeout(resolve, 32)); } })()`)
    await waitHero(client, 2)
    result.rapidHeroPreviousClicks = 6

    await client.evaluate(`(() => { const gallery = document.querySelector('[data-projects-gallery]'); const rect = gallery.getBoundingClientRect(); window.scrollTo({ top: window.scrollY + rect.top - ${viewport.width < 500 ? 170 : 120}, behavior: 'instant' }); })()`)
    await waitGallery(client, 'mohamed-ali-palace', 0)
    await delay(1200)
    const selections = [
      { project: 'mohamed-ali-palace', image: 1, label: 'palace entrance' },
      { project: 'mohamed-ali-palace', image: 2, label: 'ornate interior' },
      { project: 'ministries-district', image: 0, projectIndex: 2 },
      { project: 'ministries-district', image: 1, label: 'facade works' },
      { project: 'ministries-district', image: 2, label: 'site overview' },
      { project: 'lakeview-residence', image: 0, projectIndex: 3 },
      { project: 'lakeview-residence', image: 1, label: 'bathroom finish' },
      { project: 'lakeview-residence', image: 2, label: 'interior joinery' },
      { project: 'mohamed-ali-palace', image: 0, projectIndex: 1 },
    ]
    for (const selection of selections) {
      result.transitions.push(await transition({ name: `${viewport.name}-gallery-${selection.project}-${selection.image + 1}`, section: 'gallery', target: selection,
        detailed: selection.projectIndex === 2 || (selection.project === 'lakeview-residence' && selection.image === 1),
        trigger: () => click(client, selection.projectIndex ? `[data-projects-navigation] button:nth-child(${selection.projectIndex})` : `[aria-label="Show ${selection.label}"]`) }))
      if (selection.project === 'lakeview-residence' && selection.image > 0) assert.equal((await client.evaluate(galleryStateExpression)).fit, 'contain', 'Lakeview portrait composition must remain uncropped')
    }
    await client.evaluate(`(async () => { for (let count = 0; count < 7; count++) { document.querySelector('[aria-label="Show next photograph of Mohamed Ali Palace"]').click(); await new Promise(resolve => setTimeout(resolve, 30)); } })()`)
    await waitGallery(client, 'mohamed-ali-palace', 1)
    result.rapidGalleryNextClicks = 7
    await client.evaluate(`document.querySelector('[data-projects-navigation] button:nth-child(2)').click(); document.querySelector('[data-projects-navigation] button:nth-child(3)').click(); document.querySelector('[data-projects-navigation] button:nth-child(1)').click()`)
    await waitGallery(client, 'mohamed-ali-palace', 0)
    result.rapidProjectSelection = true
    await client.evaluate(`document.querySelector('[data-projects-gallery]').focus({ preventScroll: true })`)
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
    await waitGallery(client, 'mohamed-ali-palace', 1)
    result.galleryKeyboard = true
    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    await delay(100)
    await click(client, '[aria-label="Show ornate interior"]')
    await waitGallery(client, 'mohamed-ali-palace', 2)
    assert.equal(await client.evaluate(`document.querySelector('[aria-label="Autoplay disabled by reduced motion preference"]')?.disabled`), true)
    result.reducedMotion = true
    assert.deepEqual(result.consoleErrors, [], 'Unexpected browser console error')
    result.passed = true
  } catch (error) {
    result.error = error.stack ?? String(error)
    if (client) await screenshot(client, `${viewport.name}-failure`).catch(() => undefined)
  } finally {
    if (client) {
      try { await client.send('Browser.close') } catch { /* Process fallback below. */ }
      client.socket.close()
    }
    browser.kill()
    await delay(250)
    const resolvedProfile = path.resolve(profileDirectory)
    if (resolvedProfile.startsWith(path.resolve(os.tmpdir()) + path.sep)) await rm(resolvedProfile, { recursive: true, force: true, maxRetries: 4, retryDelay: 150 })
  }
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? `: ${result.error.split('\n')[0]}` : ''}`)
  return result
}

await mkdir(outputDirectory, { recursive: true })
assert.equal((await fetch(siteUrl)).status, 200, 'Preview server must respond before browser QA')
const viewports = [ { name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 } ]
const results = []
for (const viewport of viewports.filter((candidate) => !viewportFilter || candidate.name.includes(viewportFilter))) {
  results.push(await runViewport(viewport))
}
const report = { testedAt: new Date().toISOString(), siteUrl, method: 'Native real-time Edge rendering; no animation clock manipulation. Screenshot RGB mixture fit plus RAF opacity evidence.',
  passed: results.every((result) => result.passed), scenarios: results }
await writeFile(path.join(outputDirectory, viewportFilter ? `results-${viewportFilter}.json` : 'results.json'), `${JSON.stringify(report, null, 2)}\n`)
assert.ok(results.length > 0, 'No viewport matched filter')
assert.ok(report.passed, 'Visual fade evidence failed; inspect saved screenshots, filmstrips, and JSON.')
