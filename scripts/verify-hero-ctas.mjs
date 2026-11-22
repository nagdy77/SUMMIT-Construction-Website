import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const outputDirectory = path.resolve('references', 'qa', 'hero-ctas')
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

class CdpClient {
  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      clearTimeout(pending.timeout)
      if (message.error) pending.reject(new Error(`${pending.method}${pending.label ? ` (${pending.label})` : ''}: ${message.error.message}`))
      else pending.resolve(message.result)
    })
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`CDP timed out: ${method}`)), 30000)
      const label = typeof params.expression === 'string' ? params.expression.slice(0, 120).replace(/\s+/g, ' ') : ''
      this.pending.set(id, { resolve, reject, timeout, method, label })
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
    } catch { /* Edge is starting. */ }
    await delay(100)
  }
  throw new Error('Could not connect to the temporary Edge instance.')
}

await mkdir(outputDirectory, { recursive: true })
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-hero-ctas-'))
assert.ok(path.resolve(profileDirectory).startsWith(path.resolve(os.tmpdir())))
const port = await freePort()
const browser = spawn(edgePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profileDirectory}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true })

let client
try {
  client = await connect(port)
  await Promise.all([client.send('Page.enable'), client.send('Runtime.enable')])

  const evaluate = async (expression, awaitPromise = false) => {
    const response = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
    return response.result.value
  }
  const waitFor = async (expression, timeout = 18000) => {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return
      await delay(80)
    }
    throw new Error(`Timed out waiting for ${expression}`)
  }
  const activeIndexExpression = `[...document.querySelectorAll('[data-hero-slide]')].findIndex((slide) => slide.getAttribute('aria-hidden') === 'false')`

  const navigate = async (locale, width, heightOverride) => {
    const height = heightOverride ?? ({ 360: 800, 375: 812, 390: 844, 430: 932, 768: 1024, 1440: 1000 })[width]
    await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 })
    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
    await client.send('Page.navigate', { url: `${base}/${locale}/` })
    await waitFor("document.readyState === 'complete' && document.querySelector('#root')?.dataset.clientReady === 'true'")
    await waitFor("Boolean(document.querySelector('[data-skip-intro]'))")
    await evaluate("document.querySelector('[data-skip-intro]').click(); true")
    await waitFor("!document.querySelector('[data-skip-intro]')")
    await evaluate('document.fonts.ready', true)
    await waitFor("document.querySelector('#top')?.dataset.transitionState === 'idle' && document.querySelector('#summit-first-hero-image')?.dataset.ready === 'true'")
    await delay(1200)
    if (await evaluate("Boolean(document.querySelector('[data-hero-autoplay]:not(:disabled)'))")) {
      await evaluate("document.querySelector('[data-hero-autoplay]').click(); true")
    }
    return height
  }

  let assertions = 0
  let screenshots = 0
  const expected = {
    en: [
      { id: 'story', label: 'Discover Our Story', path: '/en/about/', secondaryLabel: 'Explore Our Projects', secondaryPath: '/en/projects/' },
      { id: 'projects', label: 'Explore Our Projects', path: '/en/projects/', secondaryLabel: 'Discover Our Story', secondaryPath: '/en/about/' },
      { id: 'residential', label: 'Explore Residential Fit-Out', path: '/en/services/renovation/', secondaryLabel: 'Discover Our Story', secondaryPath: '/en/about/' },
      { id: 'quote', label: 'Request a Quote', message: 'Hello SUMMIT Construction, I would like to request a quotation for my project.', secondaryLabel: 'Discover Our Story', secondaryPath: '/en/about/' },
    ],
    ar: [
      { id: 'story', label: 'اكتشف قصتنا', path: '/ar/about/', secondaryLabel: 'استكشف مشاريعنا', secondaryPath: '/ar/projects/' },
      { id: 'projects', label: 'استكشف مشاريعنا', path: '/ar/projects/', secondaryLabel: 'اكتشف قصتنا', secondaryPath: '/ar/about/' },
      { id: 'residential', label: 'استكشف التشطيبات السكنية', path: '/ar/services/renovation/', secondaryLabel: 'اكتشف قصتنا', secondaryPath: '/ar/about/' },
      { id: 'quote', label: 'اطلب عرض سعر', message: 'مرحبًا سوميت، أرغب في طلب عرض سعر لمشروعي.', secondaryLabel: 'اكتشف قصتنا', secondaryPath: '/ar/about/' },
    ],
  }

  for (const width of [360, 375, 390, 430, 768, 1440]) {
    for (const locale of ['en', 'ar']) {
      const height = await navigate(locale, width)
      for (let index = 0; index < 4; index += 1) {
        if (index > 0) {
          await evaluate("document.querySelector('[data-hero-next]').click(); true")
          await waitFor(`document.querySelector('#top')?.dataset.transitionState === 'idle' && (${activeIndexExpression}) === ${index}`)
          await waitFor(`document.querySelectorAll('[data-hero-image]')[${index}]?.dataset.ready === 'true'`)
        }

        const metrics = await evaluate(`(() => {
          const root = document.querySelector('#top')
          const active = root.querySelector('[data-hero-slide][aria-hidden="false"]')
          const heading = active.querySelector('h1, h2')
          const description = active.querySelector('.hero-description')
          const actions = active.querySelector('[data-hero-actions]')
          const ctaHost = active.querySelector('[data-hero-cta]')
          const cta = ctaHost.matches('.hero-cta') ? ctaHost : ctaHost.querySelector('.hero-cta')
          const secondary = active.querySelector('[data-hero-secondary]')
          const navigation = root.querySelector('[data-hero-navigation]')
          const rect = (node) => {
            const value = node.getBoundingClientRect()
            return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height }
          }
          const overlap = (first, second) => first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top
          const hit = (node) => {
            const box = node.getBoundingClientRect()
            const target = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
            return {
              contains: Boolean(target && node.contains(target)),
              tag: target ? target.tagName : null,
              className: target ? String(target.getAttribute('class') ?? '') : '',
              pointerEvents: target ? getComputedStyle(target).pointerEvents : null,
            }
          }
          const ctaStyle = getComputedStyle(cta)
          const actionRect = rect(actions)
          const ctaRect = rect(cta)
          const secondaryRect = rect(secondary)
          const navigationRect = rect(navigation)
          return {
            locale: document.documentElement.lang,
            direction: document.documentElement.dir,
            activeIndex: ${activeIndexExpression},
            slideCount: root.querySelectorAll('[data-hero-slide]').length,
            documentWidth: document.documentElement.scrollWidth,
            viewport: { width: innerWidth, height: innerHeight },
            headingRect: rect(heading),
            headingBottom: heading.getBoundingClientRect().bottom,
            descriptionRect: rect(description),
            description: description.textContent.trim(),
            actionRect,
            ctaRect,
            secondaryRect,
            navigationRect,
            actionCount: actions.querySelectorAll('.hero-cta').length,
            ctaId: ctaHost.dataset.heroCta,
            ctaLabel: cta.querySelector('.hero-cta__label')?.textContent.trim(),
            ctaPath: cta.tagName === 'A' && !cta.href.startsWith('https://wa.me/') ? new URL(cta.href).pathname : null,
            configured: cta.dataset.whatsappConfigured,
            tag: cta.tagName,
            href: cta.getAttribute('href'),
            whatsappPath: cta.tagName === 'A' && cta.href.startsWith('https://wa.me/') ? new URL(cta.href).pathname : null,
            whatsappMessage: cta.tagName === 'A' && cta.href.startsWith('https://wa.me/') ? new URL(cta.href).searchParams.get('text') : null,
            disabled: cta.getAttribute('aria-disabled'),
            tabIndex: cta.tabIndex,
            inactiveFocusable: [...root.querySelectorAll('[data-hero-slide][aria-hidden="true"] .hero-cta')].filter((node) => node.tabIndex >= 0).length,
            backgroundImage: ctaStyle.backgroundImage,
            color: ctaStyle.color,
            border: ctaStyle.borderTopColor,
            pointerEvents: ctaStyle.pointerEvents,
            shineAnimation: ctaStyle.animationName,
            hasArrow: Boolean(cta.querySelector('.hero-cta__arrow svg')),
            hit: hit(cta),
            secondaryLabel: secondary.querySelector('.hero-cta__label')?.textContent.trim(),
            secondaryPath: new URL(secondary.href).pathname,
            secondaryTabIndex: secondary.tabIndex,
            secondaryHit: hit(secondary),
            visibleSketches: [...active.querySelectorAll('.hero-sketch')].filter((node) => getComputedStyle(node).display !== 'none').length,
            overlapsNavigation: overlap(ctaRect, navigationRect),
            secondaryOverlapsNavigation: overlap(secondaryRect, navigationRect),
          }
        })()`)

        if (!metrics.hit.contains) {
          console.error(JSON.stringify({ width, locale, index, metrics }, null, 2))
        }

        const expectedCta = expected[locale][index]
        assert.equal(metrics.locale, locale)
        assert.equal(metrics.direction, locale === 'ar' ? 'rtl' : 'ltr')
        assert.equal(metrics.activeIndex, index)
        assert.equal(metrics.slideCount, 4)
        assert.equal(metrics.documentWidth, width)
        assert.deepEqual(metrics.viewport, { width, height })
        assert.equal(metrics.actionCount, 2)
        assert.equal(metrics.ctaId, expectedCta.id)
        assert.equal(metrics.ctaLabel, expectedCta.label)
        assert.ok(metrics.description.length > 30)
        assert.ok(metrics.headingRect.left >= -0.5 && metrics.headingRect.right <= width + 0.5)
        assert.ok(metrics.descriptionRect.top >= metrics.headingBottom - 1)
        assert.ok(metrics.descriptionRect.left >= -0.5 && metrics.descriptionRect.right <= width + 0.5)
        assert.ok(metrics.actionRect.top >= metrics.headingBottom - 1)
        assert.ok(metrics.actionRect.left >= -0.5 && metrics.actionRect.right <= width + 0.5)
        assert.ok(metrics.actionRect.bottom <= height)
        assert.ok(metrics.ctaRect.height >= 44)
        assert.ok(metrics.ctaRect.left >= -0.5 && metrics.ctaRect.right <= width + 0.5)
        assert.ok(metrics.secondaryRect.height >= 44)
        assert.ok(metrics.secondaryRect.left >= -0.5 && metrics.secondaryRect.right <= width + 0.5)
        assert.equal(metrics.tabIndex, 0)
        assert.equal(metrics.secondaryTabIndex, 0)
        assert.equal(metrics.inactiveFocusable, 0)
        assert.match(metrics.backgroundImage, /linear-gradient/)
        assert.match(metrics.color, /23, 24, 22/)
        assert.notEqual(metrics.border, 'rgba(0, 0, 0, 0)')
        assert.equal(metrics.pointerEvents, 'auto')
        assert.equal(metrics.shineAnimation, 'none')
        assert.equal(metrics.hasArrow, true)
        assert.equal(metrics.hit.contains, true)
        assert.equal(metrics.secondaryLabel, expectedCta.secondaryLabel)
        assert.ok(metrics.secondaryPath.endsWith(expectedCta.secondaryPath))
        assert.equal(metrics.secondaryHit.contains, true)
        assert.ok(metrics.visibleSketches >= 2)
        assert.equal(metrics.overlapsNavigation, false)
        assert.equal(metrics.secondaryOverlapsNavigation, false)
        if (expectedCta.path) {
          assert.equal(metrics.tag, 'A')
          assert.ok(metrics.ctaPath.endsWith(expectedCta.path))
          assertions += 24
        } else if (metrics.configured === 'true') {
          assert.equal(metrics.tag, 'A')
          assert.equal(metrics.whatsappPath, '/201009666337')
          assert.equal(metrics.whatsappMessage, expectedCta.message)
          assertions += 25
        } else {
          assert.equal(metrics.configured, 'false')
          assert.equal(metrics.tag, 'BUTTON')
          assert.equal(metrics.href, null)
          assert.equal(metrics.disabled, 'true')
          assertions += 26
        }

        if ((width === 390 && locale === 'en') || (width === 1440 && locale === 'ar')) {
          const capture = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
          await writeFile(path.join(outputDirectory, `${locale}-${width}-slide-${index + 1}.png`), Buffer.from(capture.data, 'base64'))
          screenshots += 1
        }
      }
    }
  }

  await navigate('en', 1440)
  const shineBefore = await evaluate("getComputedStyle(document.querySelector('[data-hero-slide][aria-hidden=\"false\"] .hero-cta')).backgroundPosition")
  const ctaCenter = await evaluate(`(() => { const box = document.querySelector('[data-hero-slide][aria-hidden="false"] .hero-cta').getBoundingClientRect(); return { x: box.left + box.width / 2, y: box.top + box.height / 2 }; })()`)
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ctaCenter.x, y: ctaCenter.y })
  await delay(160)
  const hoverShine = await evaluate(`(() => { const cta = document.querySelector('[data-hero-slide][aria-hidden="false"] .hero-cta'); const style = getComputedStyle(cta); return { position: style.backgroundPosition, duration: style.transitionDuration, animation: style.animationName }; })()`)
  assert.notEqual(hoverShine.position, shineBefore)
  assert.ok(hoverShine.duration.split(', ').includes('0.62s'))
  assert.equal(hoverShine.animation, 'none')
  assertions += 3

  await navigate('en', 390)
  await evaluate(`(() => {
    const hero = document.querySelector('#top')
    hero.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: 330, clientY: 420 }))
    hero.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', clientX: 70, clientY: 425 }))
    return true
  })()`)
  await waitFor(`document.querySelector('#top')?.dataset.transitionState === 'idle' && (${activeIndexExpression}) === 1`)
  await evaluate(`document.querySelector('#top').dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' })); true`)
  await waitFor(`document.querySelector('#top')?.dataset.transitionState === 'idle' && (${activeIndexExpression}) === 2`)
  assertions += 2

  await navigate('en', 360, 640)
  const compactViewport = await evaluate(`(() => {
    const active = document.querySelector('[data-hero-slide][aria-hidden="false"]')
    const actions = active.querySelector('[data-hero-actions]').getBoundingClientRect()
    const navigation = document.querySelector('[data-hero-navigation]').getBoundingClientRect()
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewport: { width: innerWidth, height: innerHeight },
      actionBottom: actions.bottom,
      navigationTop: navigation.top,
      ctas: [...active.querySelectorAll('.hero-cta')].map((node) => node.getBoundingClientRect().height),
    }
  })()`)
  assert.equal(compactViewport.documentWidth, 360)
  assert.deepEqual(compactViewport.viewport, { width: 360, height: 640 })
  assert.ok(compactViewport.actionBottom <= compactViewport.navigationTop)
  assert.ok(compactViewport.ctas.every((height) => height >= 44))
  assertions += 4

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await client.send('Page.navigate', { url: `${base}/en/` })
  await waitFor("document.readyState === 'complete' && document.querySelector('#root')?.dataset.clientReady === 'true'")
  await waitFor("Boolean(document.querySelector('[data-hero-slide][aria-hidden=\"false\"] [data-hero-actions]'))")
  const reducedMotion = await evaluate(`(() => {
    const actions = document.querySelector('[data-hero-slide][aria-hidden="false"] [data-hero-actions]')
    const controls = [...actions.querySelectorAll('.hero-cta')]
    return {
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      visible: controls.every((control) => {
        const style = getComputedStyle(control)
        return style.visibility === 'visible' && Number(style.opacity) === 1 && control.getBoundingClientRect().height >= 44
      }),
      autoplayDisabled: document.querySelector('[data-hero-autoplay]')?.disabled,
    }
  })()`)
  assert.deepEqual(reducedMotion, { reduced: true, visible: true, autoplayDisabled: true })
  assertions += 3

  console.log(`Verified ${assertions} hero CTA assertions across all 4 slides in EN/AR at mobile, tablet, and desktop widths; captured ${screenshots} review screenshots.`)
} finally {
  if (client) {
    try { await client.send('Browser.close') } catch { /* Browser may already be closed. */ }
  }
  browser.kill()
  await delay(250)
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 })
}
