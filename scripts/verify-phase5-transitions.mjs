import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const siteUrl = process.argv[2] ?? 'http://127.0.0.1:4173/'
const filter = process.argv[3]
const outputDirectory = path.resolve('references/qa/phase-5')
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
    await delay(40)
  }
  const snapshot = await client.evaluate(`({
    url: location.href,
    heroState: document.querySelector('#top')?.dataset.transitionState,
    heroImageStatus: document.querySelector('#top')?.dataset.imageStatus,
    heroIndex: [...document.querySelectorAll('[data-hero-slide]')].findIndex(slide => slide.getAttribute('aria-hidden') === 'false'),
    galleryState: document.querySelector('[data-projects-gallery]')?.dataset.galleryState,
    galleryProject: document.querySelector('[data-projects-gallery]')?.dataset.activeProject,
    galleryImage: document.querySelector('[data-projects-gallery]')?.dataset.activeImage,
    body: document.body.innerText.slice(-250)
  })`)
  throw new Error(`Timed out: ${message}. Snapshot: ${JSON.stringify(snapshot)}`)
}

const monitorSource = `(() => {
  const qa = window.__transitionQA = {
    heroArmed: false, galleryArmed: false, heroSamples: 0, gallerySamples: 0,
    heroAnimationSamples: 0, galleryAnimationSamples: 0,
    coverageFailures: [], heroStates: [], galleryStates: []
  };
  function fullMask(value) {
    if (!value || value === 'none') return true;
    if (value.startsWith('inset(')) {
      return value.slice(6, -1).split(/\\s+/).every(number => parseFloat(number) === 0);
    }
    return value.replaceAll(' ', '') === 'polygon(0px0px,100%0px,100%100%,0px100%)'
      || value.replaceAll(' ', '') === 'polygon(0%0%,100%0%,100%100%,0%100%)';
  }
  function isVisible(element) {
    const style = getComputedStyle(element);
    return style.visibility !== 'hidden' && parseFloat(style.opacity) >= 0.99;
  }
  function decoded(image) {
    return Boolean(image && image.complete && image.naturalWidth > 0 && !image.hidden && isVisible(image));
  }
  function sample() {
    const hero = document.querySelector('#top');
    const gallery = document.querySelector('[data-projects-gallery]');
    if (qa.heroArmed && hero) {
      qa.heroSamples++;
      const state = hero.dataset.transitionState;
      if (qa.heroStates.at(-1) !== state) qa.heroStates.push(state);
      if (state === 'animating') qa.heroAnimationSamples++;
      const covered = [...hero.querySelectorAll('[data-hero-slide]')].some(slide =>
        isVisible(slide) && fullMask(getComputedStyle(slide).clipPath) && decoded(slide.querySelector('[data-hero-image]')));
      if (!covered && qa.coverageFailures.length < 30) qa.coverageFailures.push({ section: 'hero', state, time: performance.now(),
        layers: [...hero.querySelectorAll('[data-hero-slide]')].map(slide => {
          const image = slide.querySelector('[data-hero-image]');
          const style = getComputedStyle(slide);
          const picture = image?.closest('picture');
          return { visibility: style.visibility, opacity: style.opacity, clip: style.clipPath,
            articleStyle: slide.style.cssText, articleClass: slide.className,
            imageOpacity: image ? getComputedStyle(image).opacity : null,
            imageVisibility: image ? getComputedStyle(image).visibility : null,
            imageStyle: image?.style.cssText, pictureStyle: picture?.style.cssText,
            pictureVisibility: picture ? getComputedStyle(picture).visibility : null,
            fullMask: fullMask(style.clipPath), ready: image?.dataset.ready,
            decoded: image?.naturalWidth, complete: image?.complete, source: image?.currentSrc, hidden: image?.hidden };
        }) });
    }
    if (qa.galleryArmed && gallery) {
      qa.gallerySamples++;
      const state = gallery.dataset.galleryState;
      if (qa.galleryStates.at(-1) !== state) qa.galleryStates.push(state);
      if (state === 'transitioning') qa.galleryAnimationSamples++;
      const covered = [...gallery.querySelectorAll('[data-project-layer]')].some(layer =>
        isVisible(layer) && fullMask(getComputedStyle(layer).clipPath) && decoded(layer.querySelector('img[data-project-image]')));
      if (!covered && qa.coverageFailures.length < 30) qa.coverageFailures.push({ section: 'gallery', state, time: performance.now() });
    }
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

async function waitHero(client, index, timeout = 12000) {
  await waitFor(client, `document.querySelector('#top')?.dataset.transitionState === 'idle' && (${heroIndexExpression}) === ${index}`, `hero slide ${index + 1}`, timeout)
  assert.equal(await client.evaluate(`(() => { const slide = document.querySelectorAll('[data-hero-slide]')[${index}]; const image = slide?.querySelector('[data-hero-image]'); return image?.dataset.ready === 'true' && image.complete && image.naturalWidth > 0 && !image.hidden; })()`), true, `Hero ${index + 1} must have a decoded image`)
}

async function waitGallery(client, project, image, timeout = 12000) {
  await waitFor(client, `(() => { const value = ${galleryStateExpression}; return value.project === ${JSON.stringify(project)} && value.image === ${image} && value.state === 'idle' && value.decoded; })()`, `gallery ${project} photograph ${image + 1}`, timeout)
}

async function armGallery(client) {
  await client.evaluate(`document.querySelector('[data-projects-gallery]').scrollIntoView({ block: 'center', behavior: 'instant' })`)
  await waitGallery(client, 'mohamed-ali-palace', 0)
  await delay(1400)
  await client.evaluate('window.__transitionQA.galleryArmed = true')
}

async function setMotion(client, value) {
  await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value }] })
  await delay(80)
}

async function heroAndGallerySequence(client, result) {
  await click(client, '[aria-label="Pause carousel autoplay"]')
  result.heroConsecutiveTransitions = []
  for (let count = 0; count < 20; count += 1) {
    const before = await client.evaluate(heroIndexExpression)
    const expected = (before + 1) % 4
    await click(client, '[aria-label="Show next slide"]')
    await waitHero(client, expected)
    result.heroConsecutiveTransitions.push(expected + 1)
  }
  let before = await client.evaluate(heroIndexExpression)
  await client.evaluate(`(async () => { for (let count = 0; count < 7; count++) { document.querySelector('[aria-label="Show next slide"]').click(); await new Promise(resolve => setTimeout(resolve, 28)); } })()`)
  await waitHero(client, (before + 7) % 4)
  result.heroRapidNextClicks = 7
  before = await client.evaluate(heroIndexExpression)
  await client.evaluate(`(async () => { for (let count = 0; count < 6; count++) { document.querySelector('[aria-label="Show previous slide"]').click(); await new Promise(resolve => setTimeout(resolve, 24)); } })()`)
  await waitHero(client, (before - 6 + 8) % 4)
  result.heroRapidPreviousClicks = 6

  before = await client.evaluate(heroIndexExpression)
  await click(client, '[aria-label="Show next slide"]')
  await waitFor(client, `document.querySelector('#top').dataset.transitionState === 'animating'`, 'hero motion before preference change')
  await setMotion(client, 'reduce')
  await waitHero(client, (before + 1) % 4)
  await setMotion(client, 'no-preference')
  await click(client, '[aria-label="Pause carousel autoplay"]')
  result.reducedMotionDuringHeroAnimation = true

  before = await client.evaluate(heroIndexExpression)
  await delay(8300)
  assert.equal(await client.evaluate(heroIndexExpression), before, 'Paused autoplay changed the photograph')
  result.autoplayPausedForMs = 8300
  await click(client, '[aria-label="Resume carousel autoplay"]')
  await waitHero(client, (before + 1) % 4, 12000)
  result.realAutoplayCycle = true
  await click(client, '[aria-label="Pause carousel autoplay"]')
  await gallerySequence(client, result)
}

async function gallerySequence(client, result) {
  await armGallery(client)
  const projectIds = ['mohamed-ali-palace', 'ministries-district', 'lakeview-residence']
  result.galleryPhotographs = []
  for (const [projectIndex, projectId] of projectIds.entries()) {
    await click(client, `[data-projects-navigation] button:nth-child(${projectIndex + 1})`)
    await waitGallery(client, projectId, 0)
    for (let image = 0; image < 3; image += 1) {
      const labels = [
        ['marble hall', 'palace entrance', 'ornate interior'],
        ['main facade', 'facade works', 'site overview'],
        ['kitchen detail', 'bathroom finish', 'interior joinery'],
      ]
      await click(client, `[aria-label="Show ${labels[projectIndex][image]}"]`)
      await waitGallery(client, projectId, image)
      const state = await client.evaluate(galleryStateExpression)
      assert.equal(state.selection, `${projectIndex}:${image}`, 'Gallery data and visible layer disagree')
      if (projectIndex === 2 && image > 0) assert.equal(state.fit, 'contain', 'Lakeview portrait was cropped')
      result.galleryPhotographs.push({ project: projectId, image: image + 1, fit: state.fit })
    }
  }
  await click(client, '[aria-label="Show next photograph of Lakeview Residence"]')
  await waitGallery(client, 'lakeview-residence', 0)
  await click(client, '[aria-label="Show previous photograph of Lakeview Residence"]')
  await waitGallery(client, 'lakeview-residence', 2)
  await client.evaluate(`(async () => { for (let count = 0; count < 7; count++) { document.querySelector('[aria-label="Show next photograph of Lakeview Residence"]').click(); await new Promise(resolve => setTimeout(resolve, 26)); } })()`)
  await waitGallery(client, 'lakeview-residence', 0)
  result.galleryRapidClicks = 7
  await client.evaluate(`document.querySelector('[data-projects-gallery]').focus()`)
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
  await waitGallery(client, 'lakeview-residence', 1)
  result.galleryKeyboardNavigation = true
  await click(client, '[data-projects-navigation] button:nth-child(1)')
  await client.evaluate(`document.querySelector('[data-projects-navigation] button:nth-child(2)').click(); document.querySelector('[data-projects-navigation] button:nth-child(3)').click()`)
  await waitGallery(client, 'lakeview-residence', 0)
  result.rapidProjectSelection = true

  await click(client, '[aria-label="Show bathroom finish"]')
  await waitFor(client, `document.querySelector('[data-projects-gallery]').dataset.galleryState === 'transitioning'`, 'gallery motion before preference change')
  await setMotion(client, 'reduce')
  await waitGallery(client, 'lakeview-residence', 1)
  assert.equal(await client.evaluate(`document.querySelector('[aria-label="Autoplay disabled by reduced motion preference"]')?.disabled`), true)
  result.reducedMotionAfterLoading = true
  result.reducedMotionDuringGalleryAnimation = true
  await setMotion(client, 'no-preference')
  await click(client, '[aria-label="Show interior joinery"]')
  await waitGallery(client, 'lakeview-residence', 2)
  result.restoredMotion = true
}

async function requestScenario(client, result, scenario) {
  await click(client, '[aria-label="Pause carousel autoplay"]')
  if (scenario.section === 'gallery') await armGallery(client)
  const targetSelector = scenario.section === 'hero'
    ? '[aria-label="Show next slide"]'
    : '[data-projects-navigation] button:nth-child(2)'
  await click(client, targetSelector)
  if (scenario.mode === 'slow') {
    await waitFor(client, scenario.section === 'hero'
      ? `document.querySelector('#top').dataset.transitionState === 'loading'`
      : `document.querySelector('[data-projects-gallery]').dataset.galleryState === 'loading'`, 'slow image loading state')
    await delay(1100)
    if (scenario.section === 'hero') assert.equal(await client.evaluate(heroIndexExpression), 0, 'Hero changed before delayed image decoded')
    else assert.equal((await client.evaluate(galleryStateExpression)).project, 'mohamed-ali-palace', 'Gallery changed before delayed image decoded')
    result.outgoingRetainedDuringSlowRequest = true
    if (scenario.motionDuringLoad) {
      await setMotion(client, 'reduce')
      result.reducedMotionChangedWhileLoading = true
    }
    await scenario.releaseRequests()
    if (scenario.section === 'hero') {
      await waitHero(client, scenario.motionDuringLoad ? 0 : 1)
      if (scenario.motionDuringLoad) {
        await click(client, '[aria-label="Show next slide"]')
        await waitHero(client, 1)
      }
    } else await waitGallery(client, 'ministries-district', 0)
    result.delayedImageRecovered = true
  } else {
    if (scenario.section === 'hero') {
      await waitFor(client, `document.querySelector('#top').dataset.imageStatus === 'unavailable' && document.querySelector('#top').dataset.transitionState === 'idle'`, 'failed hero target retained')
      assert.equal(await client.evaluate(heroIndexExpression), 0)
      await click(client, '[aria-label="Show next slide"]')
      await waitHero(client, 2)
    } else {
      await waitFor(client, `document.querySelector('#projects [role="status"]').textContent.includes('could not')`, 'failed gallery target announced')
      assert.equal((await client.evaluate(galleryStateExpression)).project, 'mohamed-ali-palace')
      await click(client, '[data-projects-navigation] button:nth-child(3)')
      await waitGallery(client, 'lakeview-residence', 0)
    }
    result.failedTargetRetainedOutgoing = true
    result.recoveryNavigationPassed = true
  }
}

async function responsiveHeroScenario(client, result) {
  await click(client, '[aria-label="Pause carousel autoplay"]')
  await click(client, '[aria-label="Show next slide"]')
  await waitHero(client, 1)
  const imageExpression = `document.querySelectorAll('[data-hero-image]')[1]`
  result.mobileSource = await client.evaluate(`${imageExpression}.currentSrc`)
  assert.match(result.mobileSource, /-mobile(?:-\d+)?\.webp(?:$|\?)/, 'Prepared slide did not select its portrait source')
  // A responsive source replacement may retain the previous bitmap while its
  // complete flag is false; verify decode/source selection separately from the
  // carousel handoff coverage sampler during this viewport change.
  await client.evaluate('window.__transitionQA.heroArmed = false')
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await waitFor(client, `(() => { const image = ${imageExpression}; return image.complete && image.naturalWidth >= 960 && !/-mobile(?:-\\d+)?\\.webp(?:$|\\?)/.test(image.currentSrc); })()`, 'prepared slide responsive desktop source')
  await client.evaluate(`${imageExpression}.decode()`)
  result.desktopSource = await client.evaluate(`${imageExpression}.currentSrc`)
  result.preparedSlideRespondsToViewport = true
  await client.evaluate('window.__transitionQA.heroArmed = true')
  await click(client, '[aria-label="Show next slide"]')
  await waitHero(client, 2)
  result.subsequentDesktopTransition = true
}

async function runScenario(scenario) {
  const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-phase5-transitions-'))
  const port = 9600 + Math.floor(Math.random() * 1000)
  const browser = spawn(edgePath, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-background-timer-throttling',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profileDirectory}`, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true })
  const result = { name: scenario.name, viewport: scenario.mobile ? [390, 844] : [1440, 900], passed: false }
  const consoleErrors = []
  const expectedNetworkErrors = []
  const documentNavigations = []
  let client
  const heldRequests = new Set()
  let requestsReleased = false
  try {
    client = await connect(port)
    await Promise.all([client.send('Page.enable'), client.send('Runtime.enable'), client.send('Network.enable'), client.send('Log.enable')])
    client.on('Page.frameNavigated', ({ frame }) => {
      if (!frame.parentId) documentNavigations.push(frame.url)
    })
    client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => consoleErrors.push(exceptionDetails.exception?.description ?? exceptionDetails.text))
    client.on('Runtime.consoleAPICalled', ({ type, args }) => {
      if (type === 'error') consoleErrors.push(args.map((argument) => argument.value ?? argument.description ?? '').join(' '))
    })
    client.on('Log.entryAdded', ({ entry }) => {
      if (entry.level !== 'error') return
      if (scenario.mode === 'failed' && entry.source === 'network' && entry.url?.includes(scenario.pattern)) expectedNetworkErrors.push(entry.text)
      else if (entry.url?.endsWith('/favicon.ico')) expectedNetworkErrors.push(entry.text)
      else consoleErrors.push(`${entry.text} ${entry.url ?? ''}`)
    })
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: result.viewport[0], height: result.viewport[1], deviceScaleFactor: scenario.mobile ? 3 : 1, mobile: Boolean(scenario.mobile),
    })
    await client.send('Network.setCacheDisabled', { cacheDisabled: true })
    await client.send('Page.addScriptToEvaluateOnNewDocument', { source: monitorSource })
    if (scenario.pattern) {
      await client.send('Fetch.enable', { patterns: [{ urlPattern: `*${scenario.pattern}*`, requestStage: 'Request' }] })
      client.on('Fetch.requestPaused', ({ requestId }) => {
        if (scenario.mode === 'failed') void client.send('Fetch.failRequest', { requestId, errorReason: 'Failed' }).catch(() => undefined)
        else if (requestsReleased) void client.send('Fetch.continueRequest', { requestId }).catch(() => undefined)
        else heldRequests.add(requestId)
      })
      scenario.releaseRequests = async () => {
        requestsReleased = true
        await Promise.all([...heldRequests].map((requestId) => client.send('Fetch.continueRequest', { requestId })))
        heldRequests.clear()
      }
    }
    const navigation = await client.send('Page.navigate', { url: siteUrl })
    assert.ok(!navigation.errorText, `Page navigation failed: ${navigation.errorText}`)
    await waitFor(client, `Boolean(document.querySelector('#top') && document.querySelector('[data-projects-gallery]') && document.querySelectorAll('[data-hero-slide]').length === 4 && !document.querySelector('vite-error-overlay'))`, 'React application mounted', 15000)
    await waitFor(client, `!document.querySelector('[data-skip-intro]') && document.querySelector('#summit-first-hero-image')?.dataset.ready === 'true'`, 'intro handoff and decoded first hero', 10000)
    await delay(1900)
    await waitHero(client, 0)
    await client.evaluate('window.__transitionQA.heroArmed = true')
    if (scenario.responsive) await responsiveHeroScenario(client, result)
    else if (scenario.section) await requestScenario(client, result, scenario)
    else if (scenario.galleryOnly) {
      await click(client, '[aria-label="Pause carousel autoplay"]')
      await gallerySequence(client, result)
    } else await heroAndGallerySequence(client, result)
    await delay(120)
    result.coverage = await client.evaluate('window.__transitionQA')
    assert.deepEqual(result.coverage.coverageFailures, [], 'At least one frame lost decoded full-image coverage')
    assert.ok(result.coverage.heroSamples > 0, 'Hero monitor did not sample the page')
    if (!scenario.section && !scenario.galleryOnly && !scenario.responsive) {
      assert.ok(result.coverage.heroAnimationSamples > 300, 'Twenty actual animated hero transitions were not sampled')
      assert.ok(result.coverage.galleryAnimationSamples > 50, 'Gallery motion was not sampled')
    }
    assert.deepEqual(consoleErrors, [], 'Unexpected browser console errors')
    assert.equal(documentNavigations.length, 1, 'The document reloaded during interaction QA')
    result.passed = true
  } catch (error) {
    result.error = error.stack ?? String(error)
    if (client) result.coverage = await client.evaluate('window.__transitionQA').catch(() => null)
  } finally {
    result.consoleErrors = consoleErrors
    result.expectedNetworkErrors = expectedNetworkErrors
    result.documentNavigations = documentNavigations
    if (client) {
      try { await client.send('Browser.close') } catch { /* Process fallback below. */ }
      client.socket.close()
    }
    browser.kill()
    await delay(200)
    const resolvedProfile = path.resolve(profileDirectory)
    if (resolvedProfile.startsWith(path.resolve(os.tmpdir()) + path.sep)) await rm(resolvedProfile, { recursive: true, force: true, maxRetries: 4, retryDelay: 150 })
  }
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${scenario.name}${result.error ? `: ${result.error.split('\n')[0]}` : ''}`)
  return result
}

await mkdir(outputDirectory, { recursive: true })
const response = await fetch(siteUrl)
assert.equal(response.status, 200, 'Preview server must respond successfully before browser tests begin')
const scenarios = [
  { name: 'animated-desktop-complete-gallery-and-hero' },
  { name: 'mobile-complete-gallery', mobile: true, galleryOnly: true },
  { name: 'mobile-to-desktop-responsive-hero', mobile: true, responsive: true },
  { name: 'mobile-hero-slow-image', mobile: true, section: 'hero', mode: 'slow', pattern: 'hero-construction' },
  { name: 'mobile-hero-failed-image', mobile: true, section: 'hero', mode: 'failed', pattern: 'hero-construction' },
  { name: 'mobile-hero-reduced-motion-during-load', mobile: true, section: 'hero', mode: 'slow', pattern: 'hero-construction', motionDuringLoad: true },
  { name: 'mobile-gallery-slow-image', mobile: true, section: 'gallery', mode: 'slow', pattern: '/featured/ministries-district/ministries-district-main-facade.webp' },
  { name: 'mobile-gallery-failed-image', mobile: true, section: 'gallery', mode: 'failed', pattern: '/featured/ministries-district/ministries-district-main-facade.webp' },
  { name: 'mobile-gallery-reduced-motion-during-load', mobile: true, section: 'gallery', mode: 'slow', pattern: '/featured/ministries-district/ministries-district-main-facade.webp', motionDuringLoad: true },
]
const results = []
for (const scenario of scenarios.filter((candidate) => !filter || candidate.name.includes(filter))) {
  let result = await runScenario(scenario)
  // Browser startup is outside the application. Retry it once without ever
  // retrying or suppressing an assertion failure from an actual loaded page.
  if (result.error?.includes('Headless Edge did not start.')) {
    result = await runScenario(scenario)
    result.browserStartupRetries = 1
  }
  results.push(result)
}
const report = { testedAt: new Date().toISOString(), siteUrl, passed: results.every((result) => result.passed), scenarios: results }
const filename = filter ? `transitions-${filter.replaceAll(/[^a-zA-Z0-9-]/g, '-')}.json` : 'transitions.json'
await writeFile(path.join(outputDirectory, filename), `${JSON.stringify(report, null, 2)}\n`)
assert.ok(results.length > 0, 'No test scenarios matched the filter')
assert.ok(report.passed, 'One or more transition scenarios failed. See the saved JSON report.')
