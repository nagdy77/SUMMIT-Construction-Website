import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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
  for (let attempt = 0; attempt < 80; attempt++) {
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
    } catch { /* Browser is starting. */ }
    await delay(100)
  }
  throw new Error('Could not connect to Edge.')
}

const profile = await mkdtemp(path.join(os.tmpdir(), 'summit-portfolio-browser-'))
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
  const waitFor = async (expression, timeout = 10000) => {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return
      await delay(80)
    }
    throw new Error(`Timed out waiting for ${expression}`)
  }
  const navigate = async (url) => {
    await client.send('Page.navigate', { url })
    await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('.site-header'))")
  }

  const widths = [320, 375, 390, 430, 768, 1440]
  const arabicTitles = [
    'قصر محمد علي', 'بيت الرزاز', 'مقعد قايتباي – القاعة الرئيسية', 'صفي الدين جوهر', 'كنيسة سانت أندروز',
    'حي الوزارات بالعاصمة الإدارية الجديدة', 'ستريم 3', 'أوريانا – كايرو فيستيفال سيتي', 'ألتو', 'داون تاون 1',
    'ليك فيو ريزيدنس', 'مارفل', 'بي سي بي جي', 'بي إس بي', 'ديسيغوال', 'مارينا رينالدي',
    'سكاي أوفيسز', 'فودا',
  ]

  for (const width of widths) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 844 : 960, deviceScaleFactor: 1, mobile: width < 768 })
    for (const locale of ['en', 'ar']) {
      await navigate(`${base}/${locale}/projects/`)
      await waitFor("document.querySelectorAll('.portfolio-card').length === 18")
      const metrics = await evaluate(`(() => {
        const grid = document.querySelector('#project-grid');
        const cards = [...grid.querySelectorAll('.portfolio-card')];
        const firstRowTop = cards[0].offsetTop;
        const firstRowCount = cards.filter((card) => card.offsetTop === firstRowTop).length;
        return {
          width: innerWidth,
          direction: document.documentElement.dir,
          documentWidth: document.documentElement.scrollWidth,
          cards: cards.length,
          firstRowCount,
          columns: getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
          titles: cards.map((card) => card.querySelector('h2')?.textContent?.trim()),
          failedImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
        };
      })()`)
      assert.equal(metrics.width, width, `${width}px viewport must be emulated exactly`)
      assert.ok(metrics.documentWidth <= width, `${width}px ${locale} listing must not overflow horizontally`)
      assert.equal(metrics.cards, 18, `${width}px ${locale} listing must show all 18 projects`)
      assert.equal(metrics.columns, width <= 800 ? 2 : 3, `${width}px ${locale} listing must use the intended project columns`)
      assert.equal(metrics.firstRowCount, width <= 800 ? 2 : 3, `${width}px ${locale} first row must contain the intended card count`)
      assert.equal(metrics.direction, locale === 'ar' ? 'rtl' : 'ltr', `${locale} must use the correct document direction`)
      if (locale === 'ar') assert.deepEqual(metrics.titles, arabicTitles, 'Arabic listing must render every project name in Arabic')
      assert.deepEqual(metrics.failedImages, [], `${width}px ${locale} listing must have no failed images`)
    }
  }

  for (const width of widths) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 844 : 960, deviceScaleFactor: 1, mobile: width < 768 })
    for (const locale of ['en', 'ar']) {
      await navigate(`${base}/${locale}/`)
      await evaluate("document.querySelector('[data-skip-intro]')?.click(); true")
      await waitFor("Boolean(document.querySelector('.featured-projects__showcase'))")
      const metrics = await evaluate(`(() => {
        const showcase = document.querySelector('.featured-projects__showcase');
        const navigation = document.querySelector('.featured-projects__navigation-column').getBoundingClientRect();
        const preview = document.querySelector('.featured-projects__preview').getBoundingClientRect();
        const gallery = document.querySelector('.featured-project-gallery').getBoundingClientRect();
        const title = document.querySelector('.featured-project-summary__title');
        return {
          documentWidth: document.documentElement.scrollWidth,
          viewport: innerWidth,
          columns: getComputedStyle(showcase).gridTemplateColumns.split(' ').filter(Boolean).length,
          navigationLeft: navigation.left,
          navigationTop: navigation.top,
          previewLeft: preview.left,
          previewTop: preview.top,
          galleryRatio: gallery.width / gallery.height,
          title: title.textContent.trim(),
          titleOverflow: title.scrollWidth > title.clientWidth + 1,
        };
      })()`)
      assert.ok(metrics.documentWidth <= metrics.viewport, `${width}px ${locale} selected projects must not overflow`)
      assert.ok(metrics.galleryRatio > 1.5 && metrics.galleryRatio < 1.7, `${width}px ${locale} preview must keep the controlled 16:10 ratio`)
      assert.equal(metrics.titleOverflow, false, `${width}px ${locale} active project title must remain contained`)
      if (width >= 1024) {
        assert.equal(metrics.columns, 2, `${width}px ${locale} selected projects must use two editorial columns`)
        assert.ok(locale === 'en' ? metrics.navigationLeft < metrics.previewLeft : metrics.navigationLeft > metrics.previewLeft, `${width}px ${locale} selected projects must mirror list and preview positions`)
      } else {
        assert.equal(metrics.columns, 1, `${width}px ${locale} selected projects must use a deliberate single-column mobile/tablet layout`)
        assert.ok(metrics.navigationTop < metrics.previewTop, `${width}px ${locale} selector must precede the preview`)
      }
      assert.equal(metrics.title, locale === 'ar' ? 'قصر محمد علي' : 'Mohamed Ali Palace', `${width}px ${locale} active project title must be localized`)
    }
  }

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await navigate(`${base}/ar/projects/mohamed-ali-palace/`)
  await waitFor("Boolean(document.querySelector('.detail-heading h1'))")
  const detail = await evaluate(`(() => ({
    heading: document.querySelector('.detail-heading h1').textContent.trim(),
    breadcrumb: [...document.querySelectorAll('.breadcrumbs li')].at(-1).textContent.trim(),
    documentWidth: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }))()`)
  assert.equal(detail.heading, 'قصر محمد علي', 'Arabic detail heading must use the Arabic project title')
  assert.ok(detail.breadcrumb.includes('قصر محمد علي'), 'Arabic breadcrumb must use the Arabic project title')
  assert.ok(detail.documentWidth <= detail.viewport, 'Arabic project detail must not overflow at 390px')

  console.log('Verified 18 project cards, two-up mobile rows, compact EN/AR Selected Projects composition, Arabic project titles, RTL mirroring, image loading, and 320–1440px layouts in Edge.')
} finally {
  browser.kill()
  await delay(250)
  await rm(profile, { recursive: true, force: true })
}
