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
const categoryCounts = [5, 5, 2, 6]

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
    await waitFor("document.querySelectorAll('.portfolio-card').length === 18 && document.querySelectorAll('.portfolio-category-card').length === 4")
    const metrics = await evaluate(`({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, cards: document.querySelectorAll('.portfolio-card').length, categories: document.querySelectorAll('.portfolio-category-card').length })`)
    assert.equal(metrics.viewport, width, `${width}px viewport must be emulated exactly`)
    assert.ok(metrics.documentWidth <= width, `${width}px project listing must not overflow horizontally`)
    assert.equal(metrics.cards, 18, `${width}px listing must show all projects before filtering`)
    assert.equal(metrics.categories, 4, `${width}px listing must show four illustrated category cards`)
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
    await waitFor(`document.querySelectorAll('.detail-gallery button').length === ${expectedThumbnails}`)
    assert.ok((await waitForImages('.detail-cover img, .detail-gallery img')).every(Boolean), `${slug} gallery images must decode`)
    const metrics = await evaluate(`({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, cover: document.querySelectorAll('.detail-cover').length, thumbnails: document.querySelectorAll('.detail-gallery button').length, placeholder: Boolean(document.querySelector('.detail-media-placeholder')) })`)
    assert.ok(metrics.documentWidth <= metrics.viewport, `${slug} must not overflow on mobile`)
    assert.equal(metrics.cover, 1, `${slug} must have a cover image`)
    assert.equal(metrics.thumbnails + 1, expectedImages, `${slug} must expose every supplied photograph`)
    assert.equal(metrics.placeholder, false, `${slug} must not render a media placeholder`)
  }

  for (const locale of ['en', 'ar']) {
    console.log(`Checking unified Beit Al-Razzaz case study (${locale})`)
    await navigate(`${base}/${locale}/projects/beit-al-razzaz/`)
    await waitFor("document.querySelectorAll('.beit-comparison').length === 7")
    assert.ok((await waitForImages('.beit-case-study img')).every(Boolean), `Beit Al-Razzaz ${locale} images must decode`)
    const beit = await evaluate(`({
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      comparisons: document.querySelectorAll('.beit-comparison').length,
      phase1: document.querySelectorAll('#beit-phase-1 .beit-editorial-grid img').length + 1,
      phase2: document.querySelectorAll('#beit-phase-2 .beit-editorial-grid img').length,
      carpentry: document.querySelectorAll('[aria-labelledby="beit-carpentry-heading"] .beit-editorial-grid img').length,
      archive: document.querySelectorAll('[aria-labelledby="beit-archive-heading"] .beit-editorial-grid img').length,
      phaseNavigation: [...document.querySelectorAll('.beit-phase-navigation a')].map((link) => link.textContent.trim()),
      hasQaitbaySection: Boolean(document.querySelector('[aria-labelledby="beit-qaitbay-heading"]')),
      facts: [...document.querySelectorAll('.project-facts > div')].map((item) => [item.querySelector('dt')?.textContent?.trim(), item.querySelector('dd')?.textContent?.trim()]),
      visibleText: document.body.innerText,
    })`)
    assert.ok(beit.documentWidth <= beit.viewport, `Beit Al-Razzaz ${locale} must not overflow on mobile`)
    assert.equal(beit.comparisons, 7, 'Beit Al-Razzaz must expose all seven verified comparisons')
    assert.deepEqual([beit.phase1, beit.phase2, beit.carpentry, beit.archive], [12, 16, 9, 3], 'Beit Al-Razzaz must expose every correctly grouped gallery image')
    assert.equal(beit.hasQaitbaySection, false, 'Qaitbay Main Hall must not remain in Beit Al-Razzaz')
    assert.deepEqual(beit.phaseNavigation, locale === 'en' ? ['01Phase 1 – Northern Side', '02Phase 2 – Western Wing'] : ['01المرحلة الأولى – المنطقة الشمالية', '02المرحلة الثانية – الجناح الغربي'], `Beit Al-Razzaz ${locale} phase navigation must use the confirmed labels`)
    assert.doesNotMatch(beit.visibleText, /E3-|DSC_|\.jpe?g|\.png|Group\s*\d/i, 'technical media identifiers must stay out of visible content')
    assert.ok(beit.facts.some(([label, value]) => label === (locale === 'en' ? 'Funding Entity' : 'جهة التمويل') && value === (locale === 'en' ? 'British Embassy' : 'السفارة البريطانية')), `Beit Al-Razzaz ${locale} must retain the confirmed funding fact`)
    assert.ok(beit.visibleText.includes(locale === 'en' ? 'Romanian Embassy' : 'السفارة الرومانية'), `Carpentry Workshop ${locale} must show the Romanian Embassy funding attribution`)
  }

  for (const locale of ['en', 'ar']) {
    await navigate(`${base}/${locale}/projects/madinet-masr-qaitbay-main-hall/`)
    await waitFor("Boolean(document.querySelector('.detail-cover'))")
    const qaitbay = await evaluate(`({
      title: document.querySelector('.detail-heading h1').textContent.trim(),
      client: [...document.querySelectorAll('.project-facts > div')].find((item) => item.querySelector('dt')?.textContent?.trim() === ${JSON.stringify(locale === 'en' ? 'Client' : 'العميل')})?.querySelector('dd')?.textContent?.trim(),
      images: document.querySelectorAll('.detail-cover img, .detail-gallery img').length,
      hasUnknownFacts: document.querySelectorAll('.project-facts > div').length !== 1,
    })`)
    assert.equal(qaitbay.title, locale === 'en' ? 'Qaitbay’s Seat Main Hall' : 'مقعد قايتباي – القاعة الرئيسية', `Qaitbay ${locale} title must be localized`)
    assert.equal(qaitbay.client, locale === 'en' ? 'Madinet Masr' : 'شركة مدينة مصر', `Qaitbay ${locale} must show the confirmed Madinet Masr client`)
    assert.equal(qaitbay.images, 17, 'Qaitbay project must preserve all 17 photographs')
    assert.equal(qaitbay.hasUnknownFacts, false, 'Qaitbay project must not invent unconfirmed metadata')
  }

  await navigate(`${base}/en/projects/beit-al-razzaz/`)
  const initialSlider = await evaluate("document.querySelector('.beit-comparison input').value")
  await evaluate("document.querySelector('.beit-comparison input').focus(); true")
  await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 })
  await waitFor(`document.querySelector('.beit-comparison input').value !== ${JSON.stringify(initialSlider)}`)
  await evaluate("document.querySelector('.beit-comparison-image').scrollIntoView({ block: 'center' }); true")
  await waitFor("document.querySelector('.beit-comparison-image').getBoundingClientRect().top >= 0 && document.querySelector('.beit-comparison-image').getBoundingClientRect().bottom <= innerHeight")
  const dispatchPointerDrag = async (pointerType, from, to) => evaluate(`(async () => {
    const element = document.querySelector('.beit-comparison-image');
    element.setPointerCapture = () => {};
    element.hasPointerCapture = () => true;
    element.releasePointerCapture = () => {};
    const bounds = element.getBoundingClientRect();
    const send = (type, fraction) => element.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: ${JSON.stringify(pointerType)}, clientX: bounds.left + bounds.width * fraction, clientY: bounds.top + bounds.height / 2 }));
    send('pointerdown', ${from});
    send('pointermove', ${to});
    send('pointerup', ${to});
    await new Promise((resolve) => setTimeout(resolve, 50));
    return Number(document.querySelector('.beit-comparison input').value);
  })()`)
  assert.ok(await dispatchPointerDrag('mouse', .2, .8) >= 75, 'comparison must respond to mouse pointer dragging')
  assert.ok(await dispatchPointerDrag('touch', .8, .3) <= 35, 'comparison must respond to touch pointer dragging')

  for (const slug of ['qaitbays-seat-main-hall', 'carpentry-workshop']) {
    await navigate(`${base}/en/projects/${slug}/`)
    await waitFor("document.body.innerText.includes('Page not found')")
  }

  const pendingProjects = [
    ['down-town-1', 'Down Town 1', 'داون تاون 1'],
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

  console.log(`Verified four category filters, all ${Object.keys(projects).length} galleries and ${expectedPhotoCount} photographs, bilingual pending-detail sections, light/dark themes, 320/390/768/1440 layouts, keyboard lightbox controls, reduced motion, and the unchanged four-project homepage feature in Edge.`)
} finally {
  browser.kill()
  await delay(250)
  await rm(profile, { recursive: true, force: true })
}
