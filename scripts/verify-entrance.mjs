import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const siteUrl = process.argv[2] ?? 'http://127.0.0.1:4173/'
const scenarioFilter = process.argv[3]
const outputDirectory = path.resolve('references', 'qa')

await mkdir(outputDirectory, { recursive: true })

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
      const request = this.pending.get(message.id)
      if (!request) return
      this.pending.delete(message.id)
      if (message.error) request.reject(new Error(message.error.message))
      else request.resolve(message.result)
    })
  }

  send(method, params = {}) {
    const id = this.nextId++
    this.socket.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? []
    listeners.push(listener)
    this.listeners.set(method, listeners)
  }
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function connectToPage(port) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
      const page = targets.find((target) => target.type === 'page')
      if (page?.webSocketDebuggerUrl) {
        const socket = new WebSocket(page.webSocketDebuggerUrl)
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

  throw new Error(`Could not connect to Edge on port ${port}.`)
}

async function runScenario({
  name,
  width,
  height,
  imageDelayMs = 0,
  blockFirstImage = false,
  reducedMotion = false,
  reload = false,
  skipIntro = false,
  scrollStory = false,
}) {
  const port = 9300 + Math.floor(Math.random() * 500)
  const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-entrance-audit-'))
  const browser = spawn(
    edgePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDirectory}`,
      'about:blank',
    ],
    { stdio: 'ignore', windowsHide: true },
  )

  let client
  try {
    client = await connectToPage(port)
    await Promise.all([client.send('Page.enable'), client.send('Runtime.enable'), client.send('Network.enable')])
    await client.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: width <= 430 ? 3 : 1,
      mobile: width <= 430,
    })

    if (reducedMotion) {
      await client.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      })
    }

    if (imageDelayMs > 0) {
      await client.send('Fetch.enable', {
        patterns: [{ urlPattern: '*hero-01-heritage*.webp', requestStage: 'Request' }],
      })
      client.on('Fetch.requestPaused', ({ requestId }) => {
        setTimeout(() => {
          client.send('Fetch.continueRequest', { requestId }).catch(() => undefined)
        }, imageDelayMs)
      })
    }

    if (blockFirstImage) {
      await client.send('Network.setBlockedURLs', { urls: ['*hero-01-heritage*.webp'] })
    }

    await client.send('Page.navigate', { url: siteUrl })

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const mounted = await client.send('Runtime.evaluate', {
        returnByValue: true,
        expression: "Boolean(document.querySelector('#top'))",
      })
      if (mounted.result.value) break
      await delay(50)
    }

    const entranceObservedAt = Date.now()
    let introWasPresent = false
    let introDurationMs = 0

    if (skipIntro) {
      await client.send('Runtime.evaluate', {
        expression: "document.querySelector('[data-skip-intro]')?.click()",
      })
    }

    for (let attempt = 0; attempt < 70; attempt += 1) {
      const intro = await client.send('Runtime.evaluate', {
        returnByValue: true,
        expression: 'Boolean(document.querySelector(\'[data-skip-intro]\'))',
      })
      if (intro.result.value) {
        introWasPresent = true
        await delay(50)
        continue
      }
      introDurationMs = introWasPresent ? Date.now() - entranceObservedAt : 0
      break
    }

    await delay(reducedMotion ? 150 : 250)

    if (scrollStory) {
      await client.send('Runtime.evaluate', {
        expression: "window.scrollTo(0, document.querySelector('[aria-label=\\\"Architectural perspective\\\"]')?.offsetTop ?? 0)",
      })
      await delay(850)
      const storyScreenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      await writeFile(path.join(outputDirectory, `${name}-story.png`), Buffer.from(storyScreenshot.data, 'base64'))
      await client.send('Runtime.evaluate', {
        expression: "window.scrollTo(0, document.querySelector('#contact')?.offsetTop ?? document.body.scrollHeight)",
      })
      await delay(850)
    }

    const evaluate = async () => {
      const response = await client.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const intro = document.querySelector('[aria-label="SUMMIT Construction introduction"]');
          const bootShell = document.querySelector('.summit-boot-shell');
          const hero = document.querySelector('#top');
          const heading = hero?.querySelector('h1');
          const firstImage = document.querySelector('#summit-first-hero-image');
          const story = document.querySelector('[aria-label="Architectural perspective"]');
          const contact = document.querySelector('#contact');
          const storyImage = story?.querySelector('img[data-story-field]');
          const storyForeground = story?.querySelector('img[data-story-foreground-image]');
          const contactImage = contact?.querySelector('img[data-contact-image]');
          const mailto = contact?.querySelector('a[href="mailto:Projects@Summit-constructions.com"]');
          const heroImages = performance.getEntriesByType('resource')
            .filter((entry) => entry.name.includes('/assets/generated/hero-'))
            .map((entry) => ({ name: entry.name.split('/').pop(), startTime: Math.round(entry.startTime), bytes: entry.transferSize }));
          return {
            viewport: [innerWidth, innerHeight],
            introPresent: Boolean(intro),
            bootShellPresent: Boolean(bootShell),
            bodyOverflow: getComputedStyle(document.body).overflow,
            htmlOverflow: getComputedStyle(document.documentElement).overflow,
            heroHeight: Math.round(hero?.getBoundingClientRect().height ?? 0),
            headingVisible: Boolean(heading && heading.getBoundingClientRect().height > 0 && getComputedStyle(heading).visibility !== 'hidden'),
            firstImageReady: firstImage?.dataset.ready === 'true',
            firstImageHidden: Boolean(firstImage?.hidden),
            firstImageNaturalWidth: firstImage?.naturalWidth ?? 0,
            storyPresent: Boolean(story),
            storyHeight: Math.round(story?.getBoundingClientRect().height ?? 0),
            storyImageReady: Boolean(storyImage && storyImage.naturalWidth > 0),
            storyForegroundReady: Boolean(storyForeground && storyForeground.naturalWidth > 0),
            contactHeight: Math.round(contact?.getBoundingClientRect().height ?? 0),
            contactImageReady: Boolean(contactImage && contactImage.naturalWidth > 0),
            contactMailto: Boolean(mailto),
            scrollY: Math.round(scrollY),
            heroImages,
          };
        })()`,
      })
      return response.result.value
    }

    const result = { ...(await evaluate()), introWasPresent, introDurationMs }
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile(path.join(outputDirectory, `${name}.png`), Buffer.from(screenshot.data, 'base64'))

    if (reload) {
      await client.send('Page.reload', { ignoreCache: false })
      await delay(450)
      result.sessionReload = await evaluate()
    }

    return { name, ...result }
  } finally {
    if (client) {
      try {
        await client.send('Browser.close')
      } catch {
        // The process is closed below if CDP has already disconnected.
      }
    }
    browser.kill()
    await delay(150)
    const resolvedProfile = path.resolve(profileDirectory)
    if (resolvedProfile.startsWith(path.resolve(os.tmpdir()) + path.sep)) {
      await rm(resolvedProfile, { recursive: true, force: true })
    }
  }
}

const scenarios = [
  { name: 'entrance-mobile-390x844', width: 390, height: 844, reload: true },
  { name: 'entrance-desktop-1440x900', width: 1440, height: 900 },
  { name: 'entrance-mobile-slow-network', width: 390, height: 844, imageDelayMs: 3200 },
  { name: 'entrance-mobile-failed-image', width: 390, height: 844, blockFirstImage: true },
  { name: 'entrance-mobile-reduced-motion', width: 390, height: 844, reducedMotion: true },
  { name: 'entrance-mobile-skip', width: 390, height: 844, skipIntro: true },
  { name: 'phase4c-mobile-scroll', width: 390, height: 844, skipIntro: true, scrollStory: true },
  { name: 'phase4c-desktop-scroll', width: 1440, height: 900, skipIntro: true, scrollStory: true },
]

const results = []
for (const scenario of scenarios.filter((item) => !scenarioFilter || item.name.includes(scenarioFilter))) results.push(await runScenario(scenario))

console.log(JSON.stringify(results, null, 2))
