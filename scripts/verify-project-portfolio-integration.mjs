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
const genericProjects = Object.fromEntries(Object.entries(projects).filter(([slug]) => slug !== 'beit-al-razzaz'))
const expectedPhotoCount = Object.values(projects).reduce((total, count) => total + count, 0)
const categoryCounts = [4, 6, 2, 6]

class CdpClient {
  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    this.events = []
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))
      if (!message.id) {
        this.events.push(message)
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
  await Promise.all([client.send('Page.enable'), client.send('Runtime.enable'), client.send('Log.enable')])
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
  const getBrowserErrors = () => client.events.filter((event) => event.method === 'Runtime.exceptionThrown'
    || (event.method === 'Runtime.consoleAPICalled' && event.params?.type === 'error')
    || (event.method === 'Log.entryAdded' && event.params?.entry?.level === 'error'))

  for (const width of [320, 390, 768, 1440]) {
    console.log(`Checking listing at ${width}px`)
    await client.send('Emulation.setDeviceMetricsOverride', { width, height: width < 600 ? 844 : 960, deviceScaleFactor: 1, mobile: width < 600 })
    await navigate(`${base}/en/projects/`)
    await waitFor("document.querySelectorAll('.portfolio-card').length === 18 && document.querySelectorAll('.portfolio-category-card').length === 4")
    const metrics = await evaluate(`({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, cards: document.querySelectorAll('.portfolio-card').length, categories: document.querySelectorAll('.portfolio-category-card').length })`)
    assert.equal(metrics.viewport, width, `${width}px viewport must be emulated exactly`)
    assert.ok(metrics.documentWidth <= width, `${width}px project listing must not overflow horizontally`)
    assert.equal(metrics.cards, 18, `${width}px listing must show all projects before filtering`)
    assert.equal(metrics.categories, 4, `${width}px listing must show four illustrated category cards`)
    if (width === 320) {
      const loading = await evaluate(`(() => { const images = [...document.querySelectorAll('.portfolio-category-card img, .portfolio-card img')]; return { total: images.length, lazy: images.filter((image) => image.loading === 'lazy').length, loaded: images.filter((image) => image.complete && image.naturalWidth > 0).length }; })()`)
      assert.equal(loading.lazy, loading.total, 'project listing imagery must remain lazy-loaded')
      assert.ok(loading.loaded < loading.total, 'the initial project listing viewport must not fetch every project image')
    }
  }

  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false })
  for (const theme of ['dark', 'light']) {
    console.log(`Checking ${theme} theme`)
    await navigate(`${base}/en/projects/`)
    await evaluate(`localStorage.setItem('summit-theme', '${theme}'); location.reload(); true`)
    await waitFor(`document.documentElement.dataset.theme === '${theme}' && document.querySelectorAll('.portfolio-card').length === 18`)
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
  await waitFor("document.querySelectorAll('.portfolio-card').length === 18")

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  for (const [slug, expectedImages] of Object.entries(genericProjects)) {
    console.log(`Checking gallery ${slug}`)
    await navigate(`${base}/en/projects/${slug}/`)
    await waitFor("Boolean(document.querySelector('.detail-cover'))")
    const expectedThumbnails = expectedImages - 1
    await waitFor(`document.querySelectorAll('.detail-gallery-carousel [data-carousel-copy="main"] .media-carousel__frame').length === ${expectedThumbnails}`)
    assert.ok((await waitForImages('.detail-cover img, .detail-gallery-carousel [data-carousel-copy="main"] img')).every(Boolean), `${slug} gallery images must decode`)
    const metrics = await evaluate(`(() => { const carousel = document.querySelector('.detail-gallery-carousel'); const viewport = carousel?.querySelector('.media-carousel__viewport'); const item = carousel?.querySelector('[data-carousel-copy="main"]'); return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, cover: document.querySelectorAll('.detail-cover').length, thumbnails: document.querySelectorAll('.detail-gallery-carousel [data-carousel-copy="main"] .media-carousel__frame').length, carousels: document.querySelectorAll('.detail-gallery-carousel').length, carouselDirection: carousel?.getAttribute('dir'), carouselWidth: viewport?.clientWidth, itemWidth: item?.getBoundingClientRect().width, placeholder: Boolean(document.querySelector('.detail-media-placeholder')) }; })()`)
    assert.ok(metrics.documentWidth <= metrics.viewport, `${slug} must not overflow on mobile`)
    assert.equal(metrics.cover, 1, `${slug} must have a cover image`)
    assert.equal(metrics.carousels, 1, `${slug} must expose one horizontal gallery carousel`)
    assert.equal(metrics.thumbnails + 1, expectedImages, `${slug} must expose every supplied photograph`)
    assert.equal(metrics.carouselDirection, 'ltr', `${slug} English carousel must expose LTR controls`)
    assert.ok(metrics.itemWidth < metrics.carouselWidth && metrics.itemWidth > metrics.carouselWidth * .65, `${slug} mobile carousel must show a swipe affordance without oversized slides`)
    assert.equal(metrics.placeholder, false, `${slug} must not render a media placeholder`)
  }

  for (const locale of ['en', 'ar']) {
    console.log(`Checking unified Beit Al-Razzaz case study (${locale})`)
    await navigate(`${base}/${locale}/projects/beit-al-razzaz/`)
    await waitFor("document.querySelectorAll('.beit-comparison').length === 7")
    const qaitbayLoading = await evaluate(`(() => { const images = [...document.querySelectorAll('[aria-labelledby="beit-qaitbay-heading"] [data-carousel-copy="main"] img')]; return { total: images.length, lazy: images.filter((image) => image.loading === 'lazy').length, lowPriority: images.filter((image) => image.fetchPriority === 'low').length, loaded: images.filter((image) => image.complete && image.naturalWidth > 0).length }; })()`)
    assert.deepEqual([qaitbayLoading.total, qaitbayLoading.lazy, qaitbayLoading.lowPriority], [17, 17, 17], `Beit Al-Razzaz ${locale} Qaitbay gallery must remain lazy and low-priority`)
    if (locale === 'en') assert.ok(qaitbayLoading.loaded < 17, 'The uncached Beit Al-Razzaz page must not initially fetch the full Qaitbay gallery')
    assert.ok((await waitForImages('.beit-case-study img')).every(Boolean), `Beit Al-Razzaz ${locale} images must decode`)
    const beit = await evaluate(`({
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      comparisons: document.querySelectorAll('.beit-comparison').length,
      phase1: document.querySelectorAll('#beit-phase-1 [data-carousel-copy="main"] img').length + 1,
      phase2: document.querySelectorAll('#beit-phase-2 [data-carousel-copy="main"] img').length,
      carpentry: document.querySelectorAll('[aria-labelledby="beit-carpentry-heading"] [data-carousel-copy="main"] img').length,
      archive: document.querySelectorAll('[aria-labelledby="beit-archive-heading"] [data-carousel-copy="main"] img').length,
      qaitbay: document.querySelectorAll('[aria-labelledby="beit-qaitbay-heading"] [data-carousel-copy="main"] img').length,
      carousels: document.querySelectorAll('.beit-photo-carousel').length,
      carouselDirections: [...document.querySelectorAll('.beit-photo-carousel')].map((carousel) => carousel.getAttribute('dir')),
      comparisonStructures: [...document.querySelectorAll('.beit-comparison')].map((comparison) => ({ images: comparison.querySelectorAll('.beit-comparison-image img').length, ranges: comparison.querySelectorAll('input[type="range"]').length, labels: [...comparison.querySelectorAll('.beit-photo-label')].map((label) => label.textContent.trim()) })),
      staticComparisonImages: [...document.querySelectorAll('img')].filter((image) => /before|after|قبل|بعد/i.test(image.alt) && !image.closest('.beit-comparison')).length,
      comparisonColumns: getComputedStyle(document.querySelector('.beit-pair-grid')).gridTemplateColumns.split(' ').filter(Boolean).length,
      phaseNavigation: [...document.querySelectorAll('.beit-phase-navigation a')].map((link) => link.textContent.trim()),
      hasQaitbaySection: Boolean(document.querySelector('[aria-labelledby="beit-qaitbay-heading"]')),
      facts: [...document.querySelectorAll('.project-facts > div')].map((item) => [item.querySelector('dt')?.textContent?.trim(), item.querySelector('dd')?.textContent?.trim()]),
      visibleText: document.body.innerText,
    })`)
    assert.ok(beit.documentWidth <= beit.viewport, `Beit Al-Razzaz ${locale} must not overflow on mobile`)
    assert.equal(beit.comparisons, 7, 'Beit Al-Razzaz must expose all seven verified comparisons')
    assert.equal(beit.carousels, 5, 'Beit Al-Razzaz must expose five regular-photo carousels')
    assert.ok(beit.carouselDirections.every((direction) => direction === (locale === 'en' ? 'ltr' : 'rtl')), `Beit Al-Razzaz ${locale} carousel controls must follow the page direction`)
    assert.deepEqual([beit.phase1, beit.phase2, beit.carpentry, beit.archive, beit.qaitbay], [12, 16, 9, 3, 17], 'Beit Al-Razzaz must expose every correctly grouped gallery image')
    assert.ok(beit.comparisonStructures.every((comparison) => comparison.images === 2 && comparison.ranges === 1), 'every verified pair must use one overlaid two-image comparison with an accessible range control')
    assert.ok(beit.comparisonStructures.every((comparison) => JSON.stringify(comparison.labels) === JSON.stringify(locale === 'en' ? ['Before', 'After'] : ['قبل', 'بعد'])), `all ${locale} comparison labels must be consistent`)
    assert.equal(beit.staticComparisonImages, 0, 'no verified before/after image may remain outside an interactive comparison')
    assert.equal(beit.comparisonColumns, 2, `Beit Al-Razzaz ${locale} mobile comparison grids must use exactly two columns`)
    assert.equal(beit.hasQaitbaySection, true, 'Qaitbay Main Hall must be integrated into Beit Al-Razzaz')
    assert.deepEqual(beit.phaseNavigation, locale === 'en' ? ['01Phase 1 – Northern Side', '02Phase 2 – Western Wing', '•Qaitbay’s Seat Main Hall'] : ['01المرحلة الأولى – المنطقة الشمالية', '02المرحلة الثانية – الجناح الغربي', '•مقعد قايتباي – القاعة الرئيسية'], `Beit Al-Razzaz ${locale} navigation must retain both phases and the unphased Qaitbay section`)
    assert.doesNotMatch(beit.visibleText, /E3-|DSC_|\.jpe?g|\.png|Group\s*\d/i, 'technical media identifiers must stay out of visible content')
    assert.ok(beit.facts.some(([label, value]) => label === (locale === 'en' ? 'Funding Entity' : 'جهة التمويل') && value === (locale === 'en' ? 'British Embassy' : 'السفارة البريطانية')), `Beit Al-Razzaz ${locale} must retain the confirmed funding fact`)
    assert.ok(beit.visibleText.includes(locale === 'en' ? 'Romanian Embassy' : 'السفارة الرومانية'), `Carpentry Workshop ${locale} must show the Romanian Embassy funding attribution`)
  }

  await client.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 844, deviceScaleFactor: 1, mobile: true })
  await navigate(`${base}/en/projects/beit-al-razzaz/`)
  const narrowComparisonLayout = await evaluate(`(() => { const grid = document.querySelector('.beit-pair-grid'); const comparisons = [...grid.querySelectorAll('.beit-comparison')]; return { columns: getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length, documentWidth: document.documentElement.scrollWidth, viewport: innerWidth, widths: comparisons.map((comparison) => comparison.getBoundingClientRect().width), values: comparisons.map((comparison) => comparison.querySelector('input').value) }; })()`)
  assert.equal(narrowComparisonLayout.columns, 2, '320px comparison layout must retain exactly two columns')
  assert.ok(narrowComparisonLayout.documentWidth <= narrowComparisonLayout.viewport, '320px comparison layout must not create horizontal page overflow')
  assert.ok(narrowComparisonLayout.widths.every((width) => width > 0 && width < narrowComparisonLayout.viewport / 2), 'each mobile comparison must fit independently within its grid cell')
  assert.deepEqual(narrowComparisonLayout.values, ['50', '50', '50'], 'every comparison must start with its own divider at 50%')
  const initialSlider = await evaluate("document.querySelector('.beit-comparison input').value")
  await evaluate("document.querySelector('.beit-comparison input').focus(); true")
  await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
  await waitFor(`document.querySelector('.beit-comparison input').value !== ${JSON.stringify(initialSlider)}`)
  await evaluate("document.querySelector('.beit-comparison-image').scrollIntoView({ block: 'center' }); true")
  await waitFor("document.querySelector('.beit-comparison-image').getBoundingClientRect().top >= 0 && document.querySelector('.beit-comparison-image').getBoundingClientRect().bottom <= innerHeight")
  const dispatchPointerDrag = async (index, pointerType, from, to) => evaluate(`(async () => {
    const element = document.querySelectorAll('.beit-comparison-image')[${index}];
    element.setPointerCapture = () => {};
    element.hasPointerCapture = () => true;
    element.releasePointerCapture = () => {};
    const bounds = element.getBoundingClientRect();
    const send = (type, fraction) => element.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: ${JSON.stringify(pointerType)}, clientX: bounds.left + bounds.width * fraction, clientY: bounds.top + bounds.height / 2 }));
    send('pointerdown', ${from});
    send('pointermove', ${to});
    send('pointerup', ${to});
    await new Promise((resolve) => setTimeout(resolve, 50));
    return [...document.querySelectorAll('.beit-comparison input')].slice(0, 2).map((input) => Number(input.value));
  })()`)
  const afterMouseComparison = await dispatchPointerDrag(0, 'mouse', .2, .8)
  assert.ok(afterMouseComparison[0] >= 75, 'first comparison must respond to mouse pointer dragging')
  assert.equal(afterMouseComparison[1], 50, 'dragging the first comparison must not change the second divider')
  const afterTouchComparison = await dispatchPointerDrag(1, 'touch', .8, .3)
  assert.ok(afterTouchComparison[1] <= 35, 'second comparison must respond to touch pointer dragging')
  assert.equal(afterTouchComparison[0], afterMouseComparison[0], 'dragging the second comparison must not change the first divider')

  console.log('Checking carousel autoplay, pause, looping and desktop drag')
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false })
  await navigate(`${base}/en/projects/mohamed-ali-palace/`)
  const initiallyOffscreen = await evaluate(`document.querySelector('.detail-gallery-carousel').dataset.carouselAutoplay`)
  assert.equal(initiallyOffscreen, 'paused', 'offscreen gallery autoplay must remain paused')
  await evaluate("document.querySelector('.detail-gallery-carousel').scrollIntoView({ block: 'center' }); true")
  await waitFor("document.querySelector('.detail-gallery-carousel').dataset.carouselVisible === 'true' && document.querySelector('.detail-gallery-carousel').dataset.carouselAutoplay === 'running'")
  const autoplayStart = await evaluate("document.querySelector('.detail-gallery-carousel').dataset.carouselCurrent")
  await waitFor(`document.querySelector('.detail-gallery-carousel').dataset.carouselCurrent !== ${JSON.stringify(autoplayStart)}`, 6500)
  await evaluate(`window.__summitVisibilityState = 'hidden'; Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__summitVisibilityState }); document.dispatchEvent(new Event('visibilitychange')); true`)
  await waitFor("document.querySelector('.detail-gallery-carousel').dataset.carouselAutoplay === 'paused'")
  const hiddenTabStart = await evaluate("document.querySelector('.detail-gallery-carousel').dataset.carouselCurrent")
  await delay(4300)
  assert.equal(await evaluate("document.querySelector('.detail-gallery-carousel').dataset.carouselCurrent"), hiddenTabStart, 'hidden-tab state must pause carousel autoplay')
  await evaluate(`window.__summitVisibilityState = 'visible'; document.dispatchEvent(new Event('visibilitychange')); true`)
  await waitFor("document.querySelector('.detail-gallery-carousel').dataset.carouselAutoplay === 'running'")
  const hoverPoint = await evaluate(`(() => { const bounds = document.querySelector('.detail-gallery-carousel').getBoundingClientRect(); return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }; })()`)
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hoverPoint.x, y: hoverPoint.y })
  await waitFor("document.querySelector('.detail-gallery-carousel').dataset.carouselAutoplay === 'paused'")
  const hoverStart = await evaluate("document.querySelector('.detail-gallery-carousel').dataset.carouselCurrent")
  await delay(4300)
  assert.equal(await evaluate("document.querySelector('.detail-gallery-carousel').dataset.carouselCurrent"), hoverStart, 'hover interaction must pause carousel autoplay')
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 })
  await waitFor(`document.querySelector('.detail-gallery-carousel').dataset.carouselCurrent !== ${JSON.stringify(hoverStart)}`, 6500)

  await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await waitFor("document.querySelector('.detail-gallery-carousel').dataset.carouselAutoplay === 'disabled'")
  const dragBounds = await evaluate(`(() => { const viewport = document.querySelector('.media-carousel__viewport'); const bounds = viewport.getBoundingClientRect(); return { left: bounds.left, right: bounds.right, y: bounds.top + bounds.height / 2, before: viewport.scrollLeft }; })()`)
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: dragBounds.right - 40, y: dragBounds.y })
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dragBounds.right - 40, y: dragBounds.y, button: 'left', buttons: 1, clickCount: 1 })
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: dragBounds.left + 80, y: dragBounds.y, button: 'left', buttons: 1 })
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dragBounds.left + 80, y: dragBounds.y, button: 'left', buttons: 0, clickCount: 1 })
  await waitFor(`document.querySelector('.media-carousel__viewport').scrollLeft > ${dragBounds.before + 40}`)
  const carouselBounds = await evaluate(`(() => { const viewport = document.querySelector('.media-carousel__viewport'); const bounds = viewport.getBoundingClientRect(); return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2, scroll: viewport.scrollLeft }; })()`)
  await client.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: carouselBounds.x, y: carouselBounds.y, deltaX: 180, deltaY: 0 })
  await waitFor(`Math.abs(document.querySelector('.media-carousel__viewport').scrollLeft - ${carouselBounds.scroll}) > 20`)

  const loopSetup = await evaluate(`(() => { const carousel = document.querySelector('.detail-gallery-carousel'); const viewport = carousel.querySelector('.media-carousel__viewport'); const track = carousel.querySelector('.media-carousel__track'); const items = [...carousel.querySelectorAll('[data-carousel-copy="main"]')]; const step = items[1].offsetLeft - items[0].offsetLeft; const mainStart = items[0].offsetLeft - track.offsetLeft; viewport.scrollTo({ left: mainStart + (items.length - 1) * step, behavior: 'auto' }); viewport.dispatchEvent(new Event('scroll')); return { count: items.length }; })()`)
  await waitFor(`document.querySelector('.detail-gallery-carousel').dataset.carouselCurrent === ${JSON.stringify(String(loopSetup.count))}`)
  await evaluate("document.querySelectorAll('.detail-gallery-carousel .media-carousel__controls button')[1].click(); true")
  await waitFor("document.querySelector('.detail-gallery-carousel').dataset.carouselCurrent === '1'")
  await delay(350)
  const loopPosition = await evaluate(`(() => { const carousel = document.querySelector('.detail-gallery-carousel'); const viewport = carousel.querySelector('.media-carousel__viewport'); const track = carousel.querySelector('.media-carousel__track'); const items = [...carousel.querySelectorAll('[data-carousel-copy="main"]')]; const step = items[1].offsetLeft - items[0].offsetLeft; const mainStart = items[0].offsetLeft - track.offsetLeft; return { scroll: viewport.scrollLeft, mainStart, step, delta: Math.abs(viewport.scrollLeft - mainStart) }; })()`)
  assert.ok(loopPosition.delta < loopPosition.step * .08, `infinite loop must normalize to the identical first slide without a visible end jump (${JSON.stringify(loopPosition)})`)

  await evaluate("document.querySelector('.detail-gallery-carousel [data-carousel-copy=\"main\"] .media-carousel__frame').click(); true")
  await waitFor("document.querySelector('.portfolio-lightbox').open")
  await evaluate("document.querySelector('.lightbox-toolbar button').click(); true")
  await waitFor("!document.querySelector('.portfolio-lightbox').open")
  await client.send('Emulation.setEmulatedMedia', { features: [] })

  console.log('Checking mobile touch swipe and Arabic carousel direction')
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await navigate(`${base}/en/projects/soma-bay/`)
  await evaluate("document.querySelector('.detail-gallery-carousel').scrollIntoView({ block: 'center' }); true")
  await waitFor("document.querySelector('.detail-gallery-carousel').dataset.carouselVisible === 'true'")
  const touchBounds = await evaluate(`(() => { const viewport = document.querySelector('.media-carousel__viewport'); const bounds = viewport.getBoundingClientRect(); return { left: bounds.left, right: bounds.right, y: bounds.top + bounds.height / 2, before: viewport.scrollLeft }; })()`)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchBounds.right - 35, y: touchBounds.y, radiusX: 4, radiusY: 4, force: 1 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchBounds.left + 45, y: touchBounds.y, radiusX: 4, radiusY: 4, force: 1 }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await waitFor(`document.querySelector('.media-carousel__viewport').scrollLeft > ${touchBounds.before + 30}`)
  await navigate(`${base}/ar/projects/soma-bay/`)
  await evaluate("document.querySelector('.detail-gallery-carousel').scrollIntoView({ block: 'center' }); true")
  const rtlCarousel = await evaluate(`(() => { const carousel = document.querySelector('.detail-gallery-carousel'); return { direction: carousel.getAttribute('dir'), nextGlyph: carousel.querySelectorAll('.media-carousel__controls button')[1].textContent, pageWidth: document.documentElement.scrollWidth, viewport: innerWidth }; })()`)
  assert.equal(rtlCarousel.direction, 'rtl', 'Arabic gallery controls must expose RTL direction')
  assert.equal(rtlCarousel.nextGlyph, '←', 'Arabic next control must point in the RTL reading direction')
  assert.ok(rtlCarousel.pageWidth <= rtlCarousel.viewport, 'Arabic mobile carousel must not create horizontal page overflow')
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: false })

  assert.deepEqual(getBrowserErrors(), [], 'live portfolio routes must not emit browser console errors')
  client.events.length = 0
  for (const slug of ['qaitbays-seat-main-hall', 'madinet-masr-qaitbay-main-hall', 'carpentry-workshop']) {
    await navigate(`${base}/en/projects/${slug}/`)
    await waitFor("document.body.innerText.includes('Page not found')")
  }
  await delay(100)
  const retiredRouteErrors = getBrowserErrors()
  assert.ok(retiredRouteErrors.every((event) => event.params?.exceptionDetails?.exception?.description?.includes('React error #418')), 'retired route checks may only emit the preview server fallback hydration warning')
  client.events.length = 0

  const pendingProjects = [
    ['down-town-1', 'Down Town 1', 'داون تاون 1'],
    ['soma-bay', 'Soma Bay', 'سوما باي'],
  ]
  const pendingCopy = {
    en: 'Detailed project information, including scope of work, project phases, location, and duration, will be added once confirmed.',
    ar: 'سيتم إضافة تفاصيل المشروع، بما في ذلك نطاق الأعمال ومراحل التنفيذ والموقع ومدة المشروع، فور تأكيد المعلومات.',
  }
  for (const [slug, titleEn, titleAr] of pendingProjects) {
    for (const locale of ['en', 'ar']) {
      await navigate(`${base}/${locale}/projects/${slug}/`)
      await waitFor("Boolean(document.querySelector('.detail-project-note'))")
      const details = await evaluate(`({
        title: document.querySelector('.detail-heading h1').textContent.trim(),
        note: document.querySelector('.detail-project-note > p:last-child').textContent.trim(),
        facts: document.querySelectorAll('.project-facts > div').length,
        scope: Boolean(document.querySelector('.detail-scope')),
        reviewWarning: Boolean(document.querySelector('.project-review-status')),
      })`)
      assert.equal(details.title, locale === 'en' ? titleEn : titleAr, `${slug} must use its ${locale} title`)
      assert.equal(details.note, pendingCopy[locale], `${slug} must use the approved ${locale} pending-details copy`)
      assert.equal(details.facts, 0, `${slug} must hide unknown facts`)
      assert.equal(details.scope, false, `${slug} must hide unknown scope`)
      assert.equal(details.reviewWarning, false, `${slug} pending details must use the editorial section rather than a warning banner`)
    }
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
  assert.equal(reducedMotion.cardCount, 18, 'reduced-motion mode must retain all projects')
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

  assert.deepEqual(getBrowserErrors(), [], 'live production routes must not emit browser console errors')

  console.log(`Verified ${Object.keys(genericProjects).length + 5} horizontal carousels, seven independent before/after comparisons, all ${Object.keys(projects).length} project galleries and ${expectedPhotoCount} photographs, autoplay/pause/looping, mouse drag, trackpad scroll, touch swipe, RTL controls, two-column mobile comparisons, lightbox controls, reduced motion, no console errors, and 320–1440px layouts in Edge.`)
} finally {
  browser.kill()
  await delay(250)
  await rm(profile, { recursive: true, force: true })
}
