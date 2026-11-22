import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const base = (process.argv[2] ?? 'http://127.0.0.1:4173/SUMMIT-Construction-Website').replace(/\/$/, '')
const officialNumber = '201009666337'
const displayNumber = '+20 100 966 6337'
const quoteMessages = {
  en: 'Hello SUMMIT Construction, I would like to request a quotation for my project.',
  ar: 'مرحبًا سوميت، أرغب في طلب عرض سعر لمشروعي.',
}
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

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
  throw new Error('Could not connect to Edge.')
}

const profile = await mkdtemp(path.join(os.tmpdir(), 'summit-whatsapp-'))
assert.ok(path.resolve(profile).startsWith(path.resolve(os.tmpdir())))
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
  const routes = ['/', '/contact/', '/projects/', '/projects/beit-al-razzaz/']
  let checkedLinks = 0

  for (const width of [390, 1440]) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 1000, deviceScaleFactor: 1, mobile: width === 390 })
    for (const locale of ['en', 'ar']) {
      for (const route of routes) {
        await client.send('Page.navigate', { url: `${base}/${locale}${route}` })
        await waitFor("document.readyState === 'complete' && document.querySelector('#root')?.dataset.clientReady === 'true'")
        if (await evaluate("Boolean(document.querySelector('[data-skip-intro]'))")) {
          await evaluate("document.querySelector('[data-skip-intro]').click(); true")
          await waitFor("!document.querySelector('[data-skip-intro]')")
        }
        const state = await evaluate(`(() => {
          const actions = [...document.querySelectorAll('[data-whatsapp-configured]')]
          const links = [...document.querySelectorAll('a[href^="https://wa.me/"]')]
          return {
            lang: document.documentElement.lang,
            width: document.documentElement.scrollWidth,
            actions: actions.map((element) => ({
              configured: element.dataset.whatsappConfigured,
              tag: element.tagName,
              href: element.getAttribute('href'),
              target: element.getAttribute('target'),
              rel: element.getAttribute('rel'),
            })),
            waLinks: links.map((element) => element.getAttribute('href')),
            disabled: document.querySelectorAll('[data-whatsapp-configured="false"]').length,
            visibleText: document.body.innerText,
            footerNumber: document.querySelector('.footer-phone')?.textContent?.trim(),
            contactNumber: document.querySelector('.contact-whatsapp-number')?.textContent?.trim() ?? null,
            email: document.querySelector('a[href="mailto:Projects@Summit-constructions.com"]')?.textContent?.trim() ?? null,
          }
        })()`)

        assert.equal(state.lang, locale)
        assert.ok(state.width <= width, `${locale}${route} must not overflow at ${width}px`)
        assert.ok(state.actions.length >= 3, `${locale}${route} must expose shared WhatsApp actions`)
        assert.equal(state.disabled, 0, `${locale}${route} must not expose disabled WhatsApp controls`)
        assert.equal(state.waLinks.length, state.actions.length, `${locale}${route} must route every WhatsApp action through a valid link`)
        assert.equal(state.footerNumber, displayNumber)
        if (route === '/contact/') assert.equal(state.contactNumber, displayNumber)
        assert.ok(state.email?.startsWith('Projects@Summit-constructions.com'))
        assert.doesNotMatch(state.visibleText, /pending|قيد الإضافة|\+20 1XX XXX XXXX/i)

        for (const action of state.actions) {
          assert.equal(action.configured, 'true')
          assert.equal(action.tag, 'A')
          assert.equal(action.target, '_blank')
          assert.match(action.rel ?? '', /noreferrer/)
          const url = new URL(action.href)
          assert.equal(url.origin, 'https://wa.me')
          assert.equal(url.pathname, `/${officialNumber}`)
          const message = url.searchParams.get('text')
          assert.ok(message)
          assert.ok(locale === 'en' ? message.startsWith('Hello SUMMIT Construction') : message.startsWith('مرحبًا سوميت'))
          checkedLinks += 1
        }
        assert.ok(state.waLinks.some((href) => new URL(href).searchParams.get('text') === quoteMessages[locale]), `${locale}${route} must retain the approved quotation message`)
      }
    }
  }

  console.log(`Verified ${checkedLinks} centralized WhatsApp links in English and Arabic across home, contact, project listing, and project detail pages at mobile and desktop widths.`)
} finally {
  browser.kill()
  await delay(250)
  await rm(profile, { recursive: true, force: true })
}
