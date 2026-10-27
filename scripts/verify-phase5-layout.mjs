import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'node:net'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const siteUrl = process.argv[2] ?? 'http://127.0.0.1:4173/'
const desktopOnly = process.argv[3] === '--desktop-only'
const galleryOnly = process.argv[3] === '--gallery-only'
const outputDirectory = path.resolve('references', 'qa', 'phase-5')
const widths = galleryOnly ? [390] : desktopOnly ? [1440] : [320, 375, 390, 430, 768, 1440, 1920]
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const results = { startedAt: new Date().toISOString(), url: siteUrl, assertions: [], layouts: [], scenarios: [], errors: [], warnings: [] }

function check(condition, message, detail = undefined) {
  const assertion = { passed: Boolean(condition), message, ...(detail === undefined ? {} : { detail }) }
  results.assertions.push(assertion)
  if (!condition) console.log(`FAIL ${message}${detail === undefined ? '' : ` ${JSON.stringify(detail)}`}`)
  return Boolean(condition)
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
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`CDP timed out: ${method}`))
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
}

async function connectToPage(port) {
  for (let attempt = 0; attempt < 70; attempt += 1) {
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
  throw new Error('Could not connect to the temporary Edge QA browser.')
}

await mkdir(outputDirectory, { recursive: true })
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'summit-phase5-layout-'))
const port = await new Promise((resolve, reject) => {
  const listener = createServer()
  listener.on('error', reject)
  listener.listen(0, '127.0.0.1', () => {
    const address = listener.address()
    listener.close(() => resolve(address.port))
  })
})
const browser = spawn(edgePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profileDirectory}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true })
let client
let scenario = 'setup'

try {
  client = await connectToPage(port)
  await Promise.all([client.send('Page.enable'), client.send('Runtime.enable'), client.send('Network.enable'), client.send('Log.enable')])
  client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    results.errors.push({ scenario, kind: 'exception', message: exceptionDetails.exception?.description ?? exceptionDetails.text })
  })
  client.on('Runtime.consoleAPICalled', ({ type, args }) => {
    if (type !== 'error' && type !== 'warning') return
    const entry = { scenario, kind: `console-${type}`, message: args.map((argument) => argument.value ?? argument.description ?? '').join(' ') }
    if (type === 'error') results.errors.push(entry)
    else results.warnings.push(entry)
  })
  client.on('Log.entryAdded', ({ entry }) => {
    if (entry.level === 'error' && entry.source !== 'network') results.errors.push({ scenario, kind: 'browser-log', message: entry.text })
  })
  await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `window.__phase5DocumentToken = Date.now()+':'+Math.random(); window.__phase5FirstFrameTheme = null; requestAnimationFrame(() => { window.__phase5FirstFrameTheme = document.documentElement.dataset.theme || null; });`,
  })

  const evaluate = async (expression, awaitPromise = false) => {
    const response = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
    return response.result.value
  }
  const waitFor = async (expression, timeout = 7000) => {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return true
      await delay(50)
    }
    return false
  }
  const reload = async (ignoreCache = false) => {
    const previous = await evaluate('window.__phase5DocumentToken')
    await client.send('Page.reload', { ignoreCache })
    check(await waitFor(`typeof window.__phase5DocumentToken === 'string' && window.__phase5DocumentToken !== ${JSON.stringify(previous)}`, 10000), `${scenario}: reload reached a fresh document`)
  }
  const key = async (keyName, code, virtualKey, shiftKey = false) => {
    for (const type of ['keyDown', 'keyUp']) {
      await client.send('Input.dispatchKeyEvent', { type, key: keyName, code, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey, modifiers: shiftKey ? 8 : 0 })
    }
  }
  const screenshot = async (name) => {
    const image = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile(path.join(outputDirectory, `${name}.png`), Buffer.from(image.data, 'base64'))
    return `${name}.png`
  }
  const setViewport = async (width) => {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height: width === 1440 ? 900 : 844, deviceScaleFactor: 1, mobile: width <= 430 })
  }
  const setMedia = async (reduce = false) => {
    await client.send('Emulation.setEmulatedMedia', { features: [
      { name: 'prefers-color-scheme', value: 'light' },
      { name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' },
    ] })
  }
  const waitForPage = async ({ skip = false } = {}) => {
    const mounted = await waitFor("Boolean(document.querySelector('#top'))", 10000)
    check(mounted, `${scenario}: React homepage mounted`)
    if (!mounted) throw new Error('Homepage did not mount')
    // The route shell mounts the entrance in a React effect. Give that effect
    // one frame before testing for the overlay's removal.
    await delay(50)
    if (skip) await evaluate("document.querySelector('[data-skip-intro]')?.click()")
    const completed = await waitFor("!document.querySelector('[data-skip-intro]')", 3000)
    check(completed, `${scenario}: intro removed within its bound`)
    await delay(1300)
    await evaluate("document.querySelector('button[aria-label=\"Pause carousel autoplay\"]')?.click()")
  }
  const scrollTo = async (y) => {
    await evaluate(`window.scrollTo({top:${y},left:0,behavior:'instant'})`)
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))', true)
    await delay(120)
  }
  const measureViewport = async () => evaluate(`(() => {
    const visible = (element) => {
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height || bounds.bottom < 0 || bounds.top > innerHeight || bounds.right < 0 || bounds.left > innerWidth) return false;
      for (let parent = element; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (parent.hidden || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < .01) return false;
      }
      return true;
    };
    const overlap = (a,b) => Math.min(a.right,b.right) - Math.max(a.left,b.left) > 2 && Math.min(a.bottom,b.bottom) - Math.max(a.top,b.top) > 2;
    const floating = [...document.querySelectorAll('a[aria-label^="Contact SUMMIT Construction by email"]')].filter(visible);
    const controls = [...document.querySelectorAll('button[aria-label^="Show"]')].filter(visible);
    return {
      scrollY: Math.round(scrollY), viewport: [innerWidth,innerHeight],
      documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
      overlap: floating.flatMap((element) => controls.filter((control) => overlap(element.getBoundingClientRect(),control.getBoundingClientRect())).map((control) => ({floating:element.getAttribute('aria-label') || element.textContent.trim(),control:control.getAttribute('aria-label')}))),
      visibleImages: [...document.images].filter(visible).map((image) => ({src:image.currentSrc || image.src,ready:image.complete && image.naturalWidth > 0,width:image.naturalWidth,height:image.naturalHeight})),
    };
  })()`)
  const decodeVisibleImages = async () => evaluate(`(async () => {
    const visible = (image) => {
      const box = image.getBoundingClientRect();
      if (box.bottom < 0 || box.top > innerHeight || box.width === 0 || box.height === 0) return false;
      for(let node=image;node;node=node.parentElement) { const style=getComputedStyle(node); if(node.hidden || style.display==='none' || style.visibility==='hidden' || Number(style.opacity)<.01) return false; }
      return true;
    };
    const candidates=[...document.images].filter(visible);
    const intersecting=await Promise.all(candidates.map(image=>new Promise(resolve=>{
      const observer=new IntersectionObserver(([entry])=>{observer.disconnect();resolve(entry.isIntersecting&&entry.intersectionRatio>0?image:null);});observer.observe(image);
    })));
    return Promise.all(intersecting.filter(Boolean).map(async (image) => {
      try {
        if(!image.complete || image.naturalWidth===0) await new Promise((resolve,reject)=>{
          const cleanup=()=>{clearTimeout(timer);image.removeEventListener('load',loaded);image.removeEventListener('error',failed);};
          const loaded=()=>{cleanup();resolve();};const failed=()=>{cleanup();reject(new Error('image request failed'));};
          const timer=setTimeout(()=>{cleanup();reject(new Error('visible image load timeout'));},5000);
          image.addEventListener('load',loaded,{once:true});image.addEventListener('error',failed,{once:true});
          if(image.complete&&image.naturalWidth>0)loaded();
        });
        await Promise.race([image.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('decode timeout')),5000))]);
        return {src:image.currentSrc||image.src,decoded:image.naturalWidth>0};
      }
      catch(error) {return {src:image.currentSrc||image.src,decoded:false,error:String(error),complete:image.complete,naturalWidth:image.naturalWidth,loading:image.loading};}
    }));
  })()`, true)

  if (galleryOnly) {
    await setViewport(390)
    await setMedia(true)
    scenario = 'gallery-artifacts-setup'
    await client.send('Page.navigate', { url: siteUrl })
    await waitForPage()
    await evaluate('document.fonts.ready', true)

    const captureGallery = async (theme, portrait) => {
      const project = portrait ? 'lakeview-residence' : 'mohamed-ali-palace'
      const imageIndex = portrait ? '1' : '0'
      const expectedSource = portrait
        ? '/assets/projects/featured/lakeview/lakeview-bathroom-fitout.webp'
        : '/assets/projects/featured/mohamed-ali-palace/mohamed-ali-palace-restored-marble-hall.webp'
      const name = `390-${theme}-gallery${portrait ? '-lakeview' : ''}`
      scenario = name
      await evaluate(`document.querySelector('[data-projects-navigation]')?.querySelectorAll('button')[${portrait ? 2 : 0}]?.click()`)
      check(await waitFor(`document.querySelector('[data-projects-gallery]')?.dataset.activeProject === '${project}' && document.querySelector('[data-projects-gallery]')?.dataset.galleryState === 'idle'`, 10000), `${name}: project selection settles`)
      if (portrait) await evaluate("document.querySelector('button[aria-label=\"Show bathroom finish\"]')?.click()")
      const y = await evaluate("Math.max(0,document.querySelector('[data-projects-gallery]').getBoundingClientRect().top+scrollY-100)")
      await scrollTo(y)
      check(await waitFor(`document.querySelector('[data-projects-gallery]')?.dataset.activeProject === '${project}' && document.querySelector('[data-projects-gallery]')?.dataset.activeImage === '${imageIndex}' && document.querySelector('[data-projects-gallery]')?.dataset.galleryState === 'idle'`, 10000), `${name}: selected photograph settles`)
      check(await waitFor("document.querySelector('[data-floating-controls]')?.dataset.dockHidden === 'true'"), `${name}: floating dock withdraws beside gallery`)
      const photograph = await evaluate(`(async()=>{
        const gallery=document.querySelector('[data-projects-gallery]');
        const layer=gallery.querySelector('[data-layer-active="true"]');
        const image=layer?.querySelector('img[data-project-image]');
        if(!image) return {imagePresent:false};
        let decoded=false;try{await image.decode();decoded=image.naturalWidth>0;}catch{}
        const dock=document.querySelector('[data-floating-controls]');
        const bounds=gallery.getBoundingClientRect();
        return {imagePresent:true,decoded,path:new URL(image.currentSrc||image.src).pathname,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,fit:getComputedStyle(image).objectFit,imageVisibility:getComputedStyle(image).visibility,selection:layer.dataset.selection,project:gallery.dataset.activeProject,index:gallery.dataset.activeImage,galleryBounds:{top:bounds.top,bottom:bounds.bottom,width:bounds.width,height:bounds.height},dockHidden:dock.dataset.dockHidden,inert:dock.inert,dockVisibility:getComputedStyle(dock).visibility,theme:document.documentElement.dataset.theme,documentWidth:document.documentElement.scrollWidth,viewport:[innerWidth,innerHeight]};
      })()`, true)
      check(photograph.decoded && photograph.path === expectedSource && photograph.imageVisibility === 'visible', `${name}: exact approved photograph is decoded and visible`, photograph)
      check(portrait ? photograph.fit === 'contain' && photograph.naturalHeight > photograph.naturalWidth : photograph.fit === 'cover', `${name}: photograph preserves intended framing`, photograph)
      check(photograph.dockHidden === 'true' && photograph.inert === true && photograph.dockVisibility === 'hidden', `${name}: withdrawn dock cannot obscure or receive focus`, photograph)
      check(photograph.theme === theme && photograph.documentWidth <= 391 && photograph.galleryBounds.top >= 84 && photograph.galleryBounds.bottom <= 844, `${name}: complete gallery image fits portrait viewport`, photograph)
      const file = await screenshot(name)
      return { screenshot: file, ...photograph }
    }

    for (const theme of ['dark', 'light']) {
      scenario = `390-${theme}-gallery`
      if (theme === 'light') {
        await evaluate("document.querySelector('header button[aria-label=\"Switch to light theme\"]')?.click()")
        check(await waitFor("document.documentElement.dataset.theme === 'light'"), 'Gallery artifacts: light theme activates')
        await delay(300)
      }
      const palace = await captureGallery(theme, false)
      const lakeview = await captureGallery(theme, true)
      results.layouts.push({ scenario: `390-${theme}-gallery-artifacts`, width: 390, theme, palace, lakeview })
      console.log(`Captured ${theme} gallery and Lakeview portrait`)
    }
  } else {
  await setViewport(390)
  await setMedia()
  scenario = 'initial-intro-skip'
  await client.send('Page.navigate', { url: siteUrl })
  check(await waitFor("Boolean(document.querySelector('[data-skip-intro]'))", 5000), 'Fresh session: skippable intro appears')
  const introStart = Date.now()
  await waitForPage({ skip: true })
  const introResult = await evaluate(`({theme:document.documentElement.dataset.theme,firstFrame:window.__phase5FirstFrameTheme,bodyOverflow:document.body.style.overflow,htmlOverflow:document.documentElement.style.overflow,seen:sessionStorage.getItem('summit-intro-seen')})`)
  check(introResult.theme === 'dark' && introResult.firstFrame === 'dark', 'Fresh session: default dark despite emulated OS light', introResult)
  check(introResult.bodyOverflow !== 'hidden' && introResult.htmlOverflow !== 'hidden', 'Skip intro: scrolling restored', introResult)
  check(introResult.seen === null, 'Skip intro: no session gate suppresses later route entrances')
  results.scenarios.push({ name: scenario, elapsedIncludingHeroRevealMs: Date.now() - introStart, ...introResult })

  for (const width of widths) {
    await setViewport(width)
    await setMedia()
    await evaluate("localStorage.removeItem('summit-theme')")
    scenario = `${width}-dark`
    await reload()
    await waitForPage()

    for (const theme of ['dark', 'light']) {
      scenario = `${width}-${theme}`
      const initialErrors = results.errors.length
      if (theme === 'light') {
        await evaluate("document.querySelector('header button[aria-label=\"Switch to light theme\"]')?.click()")
        check(await waitFor("document.documentElement.dataset.theme === 'light'"), `${scenario}: header theme switch works`)
        await reload()
        await waitForPage()
      }
      const initialState = await evaluate(`({theme:document.documentElement.dataset.theme,firstFrame:window.__phase5FirstFrameTheme,stored:localStorage.getItem('summit-theme'),osLight:matchMedia('(prefers-color-scheme:light)').matches})`)
      check(initialState.theme === theme && initialState.firstFrame === theme && initialState.stored === theme, `${scenario}: theme persists and is correct at first paint`, initialState)
      check(initialState.osLight, `${scenario}: OS light preference was emulated`)
      const headerState = await evaluate(`(() => {const menu=document.querySelector('header button[aria-controls="mobile-navigation"]');const nav=document.querySelector('nav[aria-label="Main navigation"]');return {menuVisible:Boolean(menu&&getComputedStyle(menu).display!=='none'&&menu.getBoundingClientRect().width>0),desktopNavVisible:Boolean(nav&&getComputedStyle(nav).display!=='none'&&nav.getBoundingClientRect().width>0)};})()`)
      check(width >= 1024 ? !headerState.menuVisible && headerState.desktopNavVisible : headerState.menuVisible && !headerState.desktopNavVisible, `${scenario}: Header uses the appropriate navigation for its viewport`, headerState)
      const heroControls = await evaluate(`(() => {const row=document.querySelector('[data-hero-progress]')?.parentElement?.parentElement;return {count:document.querySelectorAll('[data-hero-slide]').length,denominator:row?.firstElementChild?.lastElementChild?.textContent.replace(/\\s+/g,''),buttons:[...document.querySelectorAll('#top button')].map(button=>({label:button.getAttribute('aria-label'),width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height}))};})()`)
      check(heroControls.denominator === '/' + String(heroControls.count).padStart(2, '0'), `${scenario}: Hero numeric denominator matches actual slides`, heroControls)
      check(heroControls.buttons.length === 3 && heroControls.buttons.every((button) => button.width >= 44 && button.height >= 44), `${scenario}: Hero controls meet 44px touch targets`, heroControls.buttons)

      const fonts = await evaluate(`(async () => {
        const specifications=['500 16px "DM Sans"','400 32px "Instrument Serif"','italic 400 32px "Instrument Serif"'];
        const loaded=await Promise.all(specifications.map(async(specification)=>({specification,count:(await document.fonts.load(specification)).length,checked:document.fonts.check(specification)})));
        return {loaded, externalRequests:performance.getEntriesByType('resource').filter(resource=>/fonts\\.(googleapis|gstatic)\\.com/.test(resource.name)).map(resource=>resource.name),localRequests:performance.getEntriesByType('resource').filter(resource=>resource.name.includes('/assets/fonts/')).map(resource=>resource.name.split('/').pop())};
      })()`, true)
      check(fonts.loaded.every((font) => font.count > 0 && font.checked), `${scenario}: all three self-hosted font faces decode`, fonts)
      check(fonts.externalRequests.length === 0, `${scenario}: no runtime Google Fonts requests`, fonts.externalRequests)
      const sectionThemes = await evaluate(`([...document.querySelectorAll('main > section')]).map(section=>{const heading=section.querySelector('h1,h2');const color=heading?getComputedStyle(heading).color:'';const channels=(color.match(/[\\d.]+/g)||[]).slice(0,3).map(Number);return {name:section.id||section.getAttribute('aria-label'),cinematic:section.id==='top'||section.id==='contact'||section.getAttribute('aria-label')==='Architectural perspective',headingColor:color,brightness:channels.reduce((sum,value)=>sum+value,0)/3,background:getComputedStyle(section).backgroundColor,heroAccent:getComputedStyle(section).getPropertyValue('--color-photo-accent').trim()};})`)
      check(sectionThemes.every((section) => section.cinematic ? section.brightness > 150 : theme === 'dark' ? section.brightness > 140 : section.brightness < 140), `${scenario}: every section heading supports its theme and photographic contrast`, sectionThemes)

      if (width < 1024) {
        await scrollTo(0)
        await evaluate("document.querySelector('button[aria-label=\"Open navigation\"]')?.click()")
        check(await waitFor("document.querySelector('button[aria-label=\"Close navigation\"]')?.getAttribute('aria-expanded') === 'true' && Boolean(document.querySelector('#mobile-navigation'))"), `${scenario}: mobile menu opens`)
        const mobileNav = await evaluate(`(() => { const nav=document.querySelector('#mobile-navigation'); return {links:[...nav.querySelectorAll('a')].map(link=>({label:link.textContent.trim(),height:link.getBoundingClientRect().height})),toggle:Boolean(nav.querySelector('button[aria-label^="Switch to"]')),width:nav.getBoundingClientRect().width}; })()`)
        check(mobileNav.links.length === 7 && mobileNav.links.every((link) => link.height >= 44), `${scenario}: all seven mobile navigation links are touch safe`, mobileNav)
        await evaluate("document.querySelector('#mobile-navigation button[aria-label^=\"Switch to\"]')?.click()")
        check(await waitFor(`document.documentElement.dataset.theme === '${theme === 'dark' ? 'light' : 'dark'}'`), `${scenario}: mobile theme toggle works`)
        await evaluate("document.querySelector('#mobile-navigation button[aria-label^=\"Switch to\"]')?.click()")
        check(await waitFor(`document.documentElement.dataset.theme === '${theme}'`), `${scenario}: mobile theme returns to current scenario`)
        if (width === 390) await screenshot(`${scenario}-menu`)
        await key('Escape', 'Escape', 27)
        check(await waitFor("document.querySelector('#mobile-navigation')?.getAttribute('aria-hidden') === 'true' && getComputedStyle(document.querySelector('#mobile-navigation')).visibility === 'hidden' && document.activeElement?.getAttribute('aria-label') === 'Open navigation'"), `${scenario}: Escape closes menu and restores focus`)
      }

      const sections = await evaluate(`([...document.querySelectorAll('main > section')]).map((section,index)=>({name:section.id || (section.getAttribute('aria-label')?.includes('perspective')?'story':section.getAttribute('aria-label')?.includes('material')?'materials':'section-'+index),top:section.getBoundingClientRect().top+scrollY,height:section.getBoundingClientRect().height}))`)
      const measured = []
      for (const section of sections) {
        const positions = [...new Set([Math.max(0,Math.round(section.top-84)),Math.max(0,Math.round(section.top+section.height/2-(width === 1440?900:844)/2)),Math.max(0,Math.round(section.top+section.height-(width === 1440?900:844)+84))])]
        for (let index = 0; index < positions.length; index += 1) {
          await scrollTo(positions[index])
          if (index === 0) await delay(1000)
          const decoded = await decodeVisibleImages()
          check(decoded.every((image) => image.decoded), `${scenario}: ${section.name} position ${index + 1} visible images decode`, decoded.filter((image) => !image.decoded))
          const measurement = await measureViewport()
          check(measurement.documentWidth <= width + 1 && measurement.bodyWidth <= width + 1, `${scenario}: ${section.name} position ${index + 1} has no horizontal overflow`, measurement)
          check(measurement.overlap.length === 0, `${scenario}: ${section.name} position ${index + 1} floating controls avoid carousel/gallery controls`, measurement.overlap)
          measured.push({ section: section.name, position: index + 1, ...measurement })
          if (index === 0 && (width === 390 || width === 1440)) await screenshot(`${scenario}-${section.name === 'top' ? 'hero' : section.name}`)
        }
      }

      await scrollTo(0)
      const contact = await evaluate(`({floating:document.querySelector('a[aria-label^="Contact SUMMIT Construction by email"]')?.getAttribute('href'),section:[...document.querySelectorAll('#contact a')].map(link=>link.getAttribute('href'))})`)
      check(contact.floating === 'mailto:Projects@Summit-constructions.com' && contact.section.length >= 1 && contact.section.every((href) => href === contact.floating), `${scenario}: all contact actions use verified email`, contact)
      check(results.errors.length === initialErrors, `${scenario}: no new JavaScript console/runtime errors`, results.errors.slice(initialErrors))
      results.layouts.push({ scenario, width, theme, initialState, fonts, sectionThemes, sections: measured, contact })
      console.log(`Completed ${scenario}: ${measured.length} scroll positions checked`)
    }
  }

  if (!desktopOnly) {
  scenario = 'reduced-motion'
  await setViewport(390)
  await setMedia(true)
  await evaluate("localStorage.removeItem('summit-theme')")
  await reload()
  await waitForPage()
  const reduced = await evaluate(`({intro:Boolean(document.querySelector('[data-skip-intro]')),reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,disabled:document.querySelector('button[aria-label="Autoplay disabled by reduced motion preference"]')?.disabled,bodyOverflow:document.body.style.overflow,htmlOverflow:document.documentElement.style.overflow,headingHeight:document.querySelector('#top h1')?.getBoundingClientRect().height})`)
  check(reduced.reduced && !reduced.intro && reduced.disabled === true && reduced.headingHeight > 0 && reduced.bodyOverflow !== 'hidden' && reduced.htmlOverflow !== 'hidden', 'Reduced motion: intro skipped, readable Hero, autoplay disabled, scrolling unlocked', reduced)
  await screenshot('390-dark-reduced-motion')
  results.scenarios.push({ name: scenario, ...reduced })

  scenario = 'first-image-failed'
  await setMedia()
  await client.send('Network.setCacheDisabled', { cacheDisabled: true })
  await client.send('Network.setBlockedURLs', { urls: ['*hero-heritage*.webp'] })
  const failedStarted = Date.now()
  await reload(true)
  await waitForPage()
  const failed = await evaluate(`(() => {const image=document.querySelector('#summit-first-hero-image');const heading=document.querySelector('#top h1');const copy=heading.querySelector('[data-hero-line]');return {intro:Boolean(document.querySelector('[data-skip-intro]')),imageReady:image.dataset.ready==='true',naturalWidth:image.naturalWidth,heading:heading.textContent.trim(),copyVisible:getComputedStyle(copy).visibility==='visible' && Number(getComputedStyle(copy).opacity)>.9,bodyOverflow:document.body.style.overflow,htmlOverflow:document.documentElement.style.overflow,cta:document.querySelector('#top article[aria-hidden="false"] a')?.getAttribute('href')};})()`)
  check(!failed.intro && !failed.imageReady && failed.naturalWidth === 0 && failed.copyVisible && failed.cta === '#about' && failed.bodyOverflow !== 'hidden' && failed.htmlOverflow !== 'hidden', 'Failed first image: complete readable CSS Hero and unlocked page', failed)
  await screenshot('390-dark-first-image-failed')
  results.scenarios.push({ name: scenario, elapsedIncludingHeroRevealMs: Date.now() - failedStarted, ...failed })
  await client.send('Network.setBlockedURLs', { urls: [] })
  await client.send('Network.setCacheDisabled', { cacheDisabled: false })
  }
  }
} catch (error) {
  results.errors.push({ scenario, kind: 'qa-script', message: error.stack ?? String(error) })
  console.error(error)
} finally {
  results.finishedAt = new Date().toISOString()
  results.summary = { assertions: results.assertions.length, passed: results.assertions.filter((assertion) => assertion.passed).length, failed: results.assertions.filter((assertion) => !assertion.passed).length, layouts: results.layouts.length, runtimeErrors: results.errors.length }
  await writeFile(path.join(outputDirectory, galleryOnly ? 'galleryscreenshots.json' : desktopOnly ? 'layout-results-desktop-followup.json' : 'layout-results.json'), `${JSON.stringify(results, null, 2)}\n`, 'utf8')
  if (client) {
    try { await client.send('Browser.close') } catch { /* Browser may already have closed. */ }
  }
  browser.kill()
  await delay(200)
  const resolvedProfile = path.resolve(profileDirectory)
  const temporaryRoot = path.resolve(os.tmpdir())
  if (resolvedProfile.startsWith(temporaryRoot + path.sep) && path.basename(resolvedProfile).startsWith('summit-phase5-layout-')) {
    await rm(resolvedProfile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 })
  }
}

console.log(JSON.stringify(results.summary, null, 2))
if (results.summary.failed > 0 || results.errors.length > 0 || results.layouts.length !== widths.length * 2) process.exitCode = 1
