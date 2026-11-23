import { useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import gsap from 'gsap'
import { WhatsAppAction } from '../contact/WhatsAppAction'
import { Container } from '../ui/Container'
import { Icon } from '../ui/Icon'
import { createImageCrossfade } from '../../lib/crossfade'
import { assetSrcSet, assetUrl } from '../../lib/assets'
import { routePath } from '../../lib/routes'
import { useHomeCopy, useLocale } from '../../content/site'

type HeroAction =
  | { id: 'story' | 'projects' | 'residential'; type: 'route'; page: 'about' | 'projects' | 'service-detail'; slug?: string }
  | { id: 'quote'; type: 'whatsapp' }

type HeroSlide = {
  category: string
  headline: string
  description: string
  lines: string[]
  accentLine: number
  image: {
    src: string
    srcSet: string
    mobileSrc: string
    mobileSrcSet: string
    alt: string
    width: number
    height: number
  }
  imagePosition: string
  action: HeroAction
  secondaryAction: Extract<HeroAction, { type: 'route' }>
  sketches: HeroSketchName[]
}

type HeroSketchName = 'arch' | 'blueprint' | 'compass' | 'helmet' | 'trowel'

const AUTOPLAY_SECONDS = 8
const DEFERRED_SLIDE_DELAY_MS = 1500
const IMAGE_WAIT_MS = 5000

const slides: HeroSlide[] = [
  {
    category: 'Restoration',
    headline: 'We Build the Future with the Spirit of Heritage.',
    description: 'Preserving architectural legacy and delivering enduring spaces for generations to come.',
    lines: ['We Build the Future', 'with the Spirit', 'of Heritage.'],
    accentLine: 2,
    image: {
      src: '/assets/projects/portfolio/mohamed-ali-palace/03-1565.webp',
      srcSet:
        '/assets/projects/portfolio/mohamed-ali-palace/03-720.webp 720w, /assets/projects/portfolio/mohamed-ali-palace/03-1565.webp 1565w',
      mobileSrc: '/assets/projects/featured/real-media/hero-restoration-mobile-640.webp',
      mobileSrcSet: '/assets/projects/featured/real-media/hero-restoration-mobile-480.webp 480w, /assets/projects/featured/real-media/hero-restoration-mobile-640.webp 640w',
      alt: 'Restored pool courtyard at Mohamed Ali Palace',
      width: 1565,
      height: 1005,
    },
    imagePosition: 'object-[58%_center] sm:object-center',
    action: { id: 'story', type: 'route', page: 'about' },
    secondaryAction: { id: 'projects', type: 'route', page: 'projects' },
    sketches: ['arch', 'compass', 'trowel'],
  },
  {
    category: 'Construction',
    headline: 'Monumental Ideas. Precisely Built.',
    description: 'Complex construction delivered with disciplined engineering, material clarity, and exacting execution.',
    lines: ['Monumental Ideas.', 'Precisely Built.'],
    accentLine: 1,
    image: {
      src: '/assets/projects/portfolio/new-capital-administrations-district/02-1564.webp',
      srcSet:
        '/assets/projects/portfolio/new-capital-administrations-district/02-720.webp 720w, /assets/projects/portfolio/new-capital-administrations-district/02-1564.webp 1564w',
      mobileSrc: '/assets/projects/featured/real-media/hero-construction-mobile-640.webp',
      mobileSrcSet: '/assets/projects/featured/real-media/hero-construction-mobile-480.webp 480w, /assets/projects/featured/real-media/hero-construction-mobile-640.webp 640w',
      alt: 'Administrative building under construction in the New Capital Administrations District',
      width: 1564,
      height: 1006,
    },
    imagePosition: 'object-[62%_center] sm:object-center',
    action: { id: 'projects', type: 'route', page: 'projects' },
    secondaryAction: { id: 'story', type: 'route', page: 'about' },
    sketches: ['blueprint', 'compass', 'helmet'],
  },
  {
    category: 'Residential Fit-Out',
    headline: 'Spaces Designed Around the Way You Live.',
    description: 'Considered interiors where proportion, craft, and everyday function come together.',
    lines: ['Spaces Designed', 'Around the Way', 'You Live.'],
    accentLine: 2,
    image: {
      src: '/assets/projects/portfolio/lakeview-residence/01-1570.webp',
      srcSet:
        '/assets/projects/portfolio/lakeview-residence/01-720.webp 720w, /assets/projects/portfolio/lakeview-residence/01-1570.webp 1570w',
      mobileSrc: '/assets/projects/featured/real-media/hero-residential-mobile-640.webp',
      mobileSrcSet: '/assets/projects/featured/real-media/hero-residential-mobile-480.webp 480w, /assets/projects/featured/real-media/hero-residential-mobile-640.webp 640w',
      alt: 'Completed marble kitchen at Lakeview Residence',
      width: 1570,
      height: 1001,
    },
    imagePosition: 'object-[67%_center] sm:object-center',
    action: { id: 'residential', type: 'route', page: 'service-detail', slug: 'renovation' },
    secondaryAction: { id: 'story', type: 'route', page: 'about' },
    sketches: ['blueprint', 'compass', 'trowel'],
  },
  {
    category: 'Retail Fit-Out',
    headline: 'Interiors Where Material Becomes Atmosphere.',
    description: 'Retail environments shaped through coordinated delivery, refined finishes, and lasting detail.',
    lines: ['Interiors Where', 'Material Becomes', 'Atmosphere.'],
    accentLine: 2,
    image: {
      src: '/assets/projects/portfolio/desigual/01-1600.webp',
      srcSet:
        '/assets/projects/portfolio/desigual/01-720.webp 720w, /assets/projects/portfolio/desigual/01-1600.webp 1600w',
      mobileSrc: '/assets/projects/featured/real-media/hero-retail-mobile-640.webp',
      mobileSrcSet: '/assets/projects/featured/real-media/hero-retail-mobile-480.webp 480w, /assets/projects/featured/real-media/hero-retail-mobile-640.webp 640w',
      alt: 'Completed Desigual retail fit-out',
      width: 1600,
      height: 756,
    },
    imagePosition: 'object-[58%_center] sm:object-center',
    action: { id: 'quote', type: 'whatsapp' },
    secondaryAction: { id: 'story', type: 'route', page: 'about' },
    sketches: ['compass', 'blueprint', 'arch'],
  },
]

function formatSlideNumber(index: number) {
  return String(index + 1).padStart(2, '0')
}

function HeroSketchIcon({ name }: { name: HeroSketchName }) {
  const shared = { vectorEffect: 'non-scaling-stroke' as const }

  return (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden="true" focusable="false">
      {name === 'arch' ? <>
        <path d="M16 82h64M22 82V43C22 24 34 12 48 12s26 12 26 31v39M31 82V44c0-12 7-21 17-21s17 9 17 21v38" {...shared} />
        <path d="M17 76h62M18 38h11m38 0h11M14 86h68" {...shared} />
      </> : null}
      {name === 'blueprint' ? <>
        <path d="M20 22h51v53H20zM29 31h32v34H29zM29 42h32M41 31v34M52 42v23" {...shared} />
        <path d="M20 75c-7 0-11-4-11-10s4-10 11-10m51-33c9 0 16 7 16 16S80 54 71 54" {...shared} />
      </> : null}
      {name === 'compass' ? <>
        <circle cx="48" cy="18" r="8" {...shared} />
        <path d="M45 26 27 82m24-56 18 56M33 63h30M48 10V4m-8 14H22m52 0H56" {...shared} />
        <path d="M27 82h10m22 0h10M42 18h12" {...shared} />
      </> : null}
      {name === 'helmet' ? <>
        <path d="M17 63c0-23 13-40 31-40s31 17 31 40M11 63h74v12H11zM48 23v40M31 28v35M65 28v35" {...shared} />
        <path d="M20 75c6 6 15 9 28 9s22-3 28-9" {...shared} />
      </> : null}
      {name === 'trowel' ? <>
        <path d="m13 76 47-20 16 16-63 4Z" {...shared} />
        <path d="m58 58 9-9 8 8-9 9m6-12 11-11c4-4 4-9 0-13s-9-4-13 0L59 41" {...shared} />
      </> : null}
    </svg>
  )
}

type HeroProps = {
  entranceReady?: boolean
}

export function Hero({ entranceReady = true }: HeroProps) {
  const locale = useLocale()
  const copy = useHomeCopy()
  const localizedSlides = slides.map((slide, index) => ({ ...slide, ...copy.hero[index], image: { ...slide.image, alt: copy.hero[index].alt } }))
  const rootRef = useRef<HTMLElement>(null)
  const navigateRef = useRef<(direction: 1 | -1) => void>(() => undefined)
  const toggleAutoplayRef = useRef<() => void>(() => undefined)
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [autoplayPaused, setAutoplayPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const slideElements = Array.from(root.querySelectorAll<HTMLElement>('[data-hero-slide]'))
    const progressElement = root.querySelector<HTMLElement>('[data-hero-progress]')

    let currentIndex = 0
    let isTransitioning = false
    let requestedIndex = 0
    let transitionTarget: number | null = null
    let navigationVersion = 0
    let userPaused = false
    let prefersReducedMotion = motionQuery.matches
    let progressTween: gsap.core.Tween | null = null
    let imageDriftTween: gsap.core.Tween | null = null
    let transitionTimeline: gsap.core.Timeline | null = null
    let openingTimeline: gsap.core.Timeline | null = null
    let deferredImageTimer: number | undefined
    let effectActive = true
    const pendingImages = new Map<number, Promise<boolean>>()
    const imageCleanups = new Set<() => void>()
    const failedImages = new Set<number>()

    const getImage = (slide: HTMLElement) => slide.querySelector<HTMLImageElement>('[data-hero-image]')
    const getCopy = (slide: HTMLElement) => slide.querySelectorAll<HTMLElement>('[data-hero-copy]')
    const getLines = (slide: HTMLElement) => slide.querySelectorAll<HTMLElement>('[data-hero-line]')

    function prepareSlideImage(index: number) {
      const image = getImage(slideElements[index])
      if (!image) return Promise.resolve(false)
      if (image.dataset.ready === 'true' && image.complete && image.naturalWidth > 0) return Promise.resolve(true)

      const pending = pendingImages.get(index)
      if (pending) return pending

      const source = image.dataset.src
      if (!source) return Promise.resolve(false)

      const request = new Promise<boolean>((resolve) => {
        let settled = false
        let decoding = false

        const finish = (loaded: boolean) => {
          if (settled) return
          settled = true
          window.clearTimeout(timeout)
          image.removeEventListener('load', handleLoad)
          image.removeEventListener('error', handleError)
          imageCleanups.delete(cancel)
          pendingImages.delete(index)
          if (loaded && effectActive) {
            image.dataset.ready = 'true'
            image.hidden = false
            // A <picture> can retain inherited visibility for a paint while its
            // article settles from GSAP autoAlpha. Pin the decoded photo plane
            // explicitly; inactive articles remain safely hidden by opacity: 0.
            image.style.visibility = 'visible'
            if (image.parentElement?.tagName === 'PICTURE') image.parentElement.style.visibility = 'visible'
            failedImages.delete(index)
          }
          resolve(loaded)
        }

        const handleLoad = async () => {
          if (decoding || settled) return
          decoding = true
          try {
            // The actual displayed element must be decoded before its mask opens.
            // A second probe does not guarantee that this element has a paintable frame.
            await image.decode()
          } catch {
            finish(false)
            return
          }
          finish(effectActive && image.complete && image.naturalWidth > 0)
        }
        const handleError = () => {
          image.hidden = true
          finish(false)
        }
        const cancel = () => finish(false)
        const timeout = window.setTimeout(() => finish(false), IMAGE_WAIT_MS)
        imageCleanups.add(cancel)
        image.addEventListener('load', handleLoad)
        image.addEventListener('error', handleError)

        if (!image.getAttribute('src')) {
          image.loading = 'eager'
          // Activate the existing picture candidates together. The browser picks
          // only the matching source now and can change crops after rotation.
          const mobileSource = image.parentElement?.querySelector('source')
          if (mobileSource && image.dataset.mobileSrc) mobileSource.srcset = image.dataset.mobileSrcset ?? image.dataset.mobileSrc
          image.srcset = image.dataset.srcset ?? ''
          image.src = source
        }

        if (image.complete && image.naturalWidth > 0) void handleLoad()
        else if (image.complete && image.currentSrc) handleError()
      })

      pendingImages.set(index, request)
      void request.then(() => {
        if (pendingImages.get(index) === request) pendingImages.delete(index)
      })
      return request
    }

    function nextAvailableIndex() {
      for (let offset = 1; offset < localizedSlides.length; offset += 1) {
        const candidate = (currentIndex + offset) % localizedSlides.length
        const image = getImage(slideElements[candidate])
        if (image?.complete && image.naturalWidth > 0) failedImages.delete(candidate)
        if (!failedImages.has(candidate)) return candidate
      }
      return currentIndex
    }

    function scheduleNextImage() {
      window.clearTimeout(deferredImageTimer)
      if (!entranceReady || prefersReducedMotion || document.hidden) return

      const nextIndex = nextAvailableIndex()
      if (nextIndex === currentIndex) return
      deferredImageTimer = window.setTimeout(() => {
        void prepareSlideImage(nextIndex)
      }, DEFERRED_SLIDE_DELAY_MS)
    }

    function stopTimedMotion() {
      progressTween?.kill()
      imageDriftTween?.kill()
      window.clearTimeout(deferredImageTimer)
      progressTween = null
      imageDriftTween = null
    }

    function setStaticSlide(targetIndex: number) {
      slideElements.forEach((slide, index) => {
        gsap.set(slide, {
          opacity: index === targetIndex ? 1 : 0,
          visibility: 'visible',
          clipPath: 'none',
          zIndex: index === targetIndex ? 2 : 0,
        })
        gsap.set(getImage(slide), { clearProps: 'transform' })
        const image = getImage(slide)
        if (image?.dataset.ready === 'true') {
          image.style.visibility = 'visible'
          if (image.parentElement?.tagName === 'PICTURE') image.parentElement.style.visibility = 'visible'
        }
        gsap.set(getCopy(slide), { clearProps: 'transform,opacity,visibility' })
        gsap.set(getLines(slide), { clearProps: 'transform,opacity,visibility' })
      })
      if (progressElement) gsap.set(progressElement, { scaleX: 1 })
      root!.dataset.transitionState = 'idle'
    }

    function startAutoplay() {
      stopTimedMotion()
      if (!isTransitioning) root!.dataset.transitionState = 'idle'

      if (!entranceReady || prefersReducedMotion || userPaused || document.hidden) {
        if (progressElement) gsap.set(progressElement, { scaleX: prefersReducedMotion ? 1 : 0 })
        return
      }

      scheduleNextImage()
      const nextIndex = nextAvailableIndex()
      if (nextIndex === currentIndex) return

      const activeImage = getImage(slideElements[currentIndex])
      if (activeImage) {
        imageDriftTween = gsap.to(activeImage, {
          scale: 1,
          duration: AUTOPLAY_SECONDS,
          ease: 'none',
        })
      }

      if (progressElement) {
        gsap.set(progressElement, { scaleX: 0, transformOrigin: 'left center' })
        progressTween = gsap.to(progressElement, {
          scaleX: 1,
          duration: AUTOPLAY_SECONDS,
          ease: 'none',
          onComplete: () => {
            requestedIndex = nextAvailableIndex()
            void processNavigation()
          },
        })
      }
    }

    async function processNavigation() {
      if (isTransitioning || requestedIndex === currentIndex || !entranceReady) return
      const targetIndex = requestedIndex
      const version = ++navigationVersion
      isTransitioning = true
      root!.dataset.transitionState = 'loading'
      stopTimedMotion()
      openingTimeline?.kill()
      openingTimeline = null
      gsap.set(getCopy(slideElements[currentIndex]), { autoAlpha: 1, y: 0 })
      gsap.set(getLines(slideElements[currentIndex]), { autoAlpha: 1, yPercent: 0 })
      const ready = await prepareSlideImage(targetIndex)

      if (!effectActive || version !== navigationVersion) return

      // While a request is loading, rapid clicks update a single destination.
      // Finish the current request safely, then use the most recent intent.
      if (requestedIndex !== targetIndex) {
        isTransitioning = false
        if (requestedIndex !== currentIndex) void processNavigation()
        else startAutoplay()
        return
      }

      if (!ready) {
        failedImages.add(targetIndex)
        requestedIndex = currentIndex
        isTransitioning = false
        root!.dataset.imageStatus = 'unavailable'
        root!.dataset.transitionState = 'idle'
        // Keep the complete outgoing photograph and its readable copy in place.
        // Autoplay can continue to another available image on its next cycle.
        startAutoplay()
        return
      }

      root!.dataset.imageStatus = 'ready'
      root!.dataset.transitionState = 'animating'
      transitionTarget = targetIndex

      const outgoingSlide = slideElements[currentIndex]
      const incomingSlide = slideElements[targetIndex]
      const incomingImage = getImage(incomingSlide)
      const incomingCopy = getCopy(incomingSlide)
      const incomingLines = getLines(incomingSlide)

      if (prefersReducedMotion) {
        currentIndex = targetIndex
        setActiveIndex(targetIndex)
        setStaticSlide(targetIndex)
        transitionTarget = null
        isTransitioning = false
        if (requestedIndex !== currentIndex) void processNavigation()
        return
      }

      setActiveIndex(targetIndex)

      gsap.set(incomingCopy, { opacity: 0, visibility: 'visible', y: 10 })
      gsap.set(incomingLines, { opacity: 0, visibility: 'visible', yPercent: 12 })

      transitionTimeline = createImageCrossfade({
        outgoing: outgoingSlide,
        incoming: incomingSlide,
        image: incomingImage,
        paused: document.hidden,
        onComplete: () => {
          if (!effectActive || version !== navigationVersion) return
          currentIndex = targetIndex
          transitionTarget = null
          isTransitioning = false
          root!.dataset.transitionState = 'idle'
          transitionTimeline = null
          if (requestedIndex !== currentIndex) void processNavigation()
          else startAutoplay()
        },
      })

      transitionTimeline
        .to(getCopy(outgoingSlide), { opacity: 0, y: -8, duration: 0.25, stagger: 0.025, ease: 'power1.inOut' }, 0)
        .to(getLines(outgoingSlide), { opacity: 0, yPercent: -8, duration: 0.25, stagger: 0.025, ease: 'power1.inOut' }, 0)
        .to(incomingCopy, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out' }, 0.36)
        .to(incomingLines, { opacity: 1, yPercent: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out' }, 0.34)
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        window.clearTimeout(deferredImageTimer)
        progressTween?.pause()
        imageDriftTween?.pause()
        transitionTimeline?.pause()
        openingTimeline?.pause()
        return
      }

      transitionTimeline?.resume()
      openingTimeline?.resume()
      if (!isTransitioning && !userPaused && !prefersReducedMotion) {
        if (progressTween) {
          progressTween.resume()
          imageDriftTween?.resume()
        } else {
          startAutoplay()
        }
      }
    }

    function handleMotionPreference(event: MediaQueryListEvent) {
      prefersReducedMotion = event.matches
      setReducedMotion(event.matches)
      userPaused = event.matches
      setAutoplayPaused(event.matches)
      navigationVersion += 1
      openingTimeline?.kill()
      openingTimeline = null
      transitionTimeline?.kill()
      transitionTimeline = null
      if (transitionTarget !== null) currentIndex = transitionTarget
      transitionTarget = null
      requestedIndex = currentIndex
      setActiveIndex(currentIndex)
      isTransitioning = false
      stopTimedMotion()
      setStaticSlide(currentIndex)

      if (!event.matches && entranceReady) {
        startAutoplay()
      }
    }

    navigateRef.current = (direction) => {
      if (!entranceReady) return
      let candidate = requestedIndex
      for (let offset = 0; offset < localizedSlides.length; offset += 1) {
        candidate = (candidate + direction + localizedSlides.length) % localizedSlides.length
        const image = getImage(slideElements[candidate])
        if (image?.complete && image.naturalWidth > 0) failedImages.delete(candidate)
        if (!failedImages.has(candidate)) break
      }
      requestedIndex = candidate
      void processNavigation()
    }
    toggleAutoplayRef.current = () => {
      if (prefersReducedMotion) return

      userPaused = !userPaused
      setAutoplayPaused(userPaused)

      if (userPaused) {
        progressTween?.pause()
        imageDriftTween?.pause()
      } else if (progressTween) {
        progressTween.resume()
        imageDriftTween?.resume()
      } else {
        if (!isTransitioning) startAutoplay()
      }
    }

    const context = gsap.context(() => {
      setReducedMotion(prefersReducedMotion)
      setAutoplayPaused(prefersReducedMotion)
      userPaused = prefersReducedMotion

      root.dataset.transitionState = 'idle'
      void prepareSlideImage(0)

      slideElements.forEach((slide, index) => {
        gsap.set(slide, {
          opacity: index === 0 ? 1 : 0,
          visibility: 'visible',
          clipPath: 'none',
          zIndex: index === 0 ? 2 : 0,
        })
      })

      if (prefersReducedMotion) {
        setStaticSlide(0)
        return
      }

      const openingSlide = slideElements[0]
      const openingImage = getImage(openingSlide)
      const openingCopy = getCopy(openingSlide)
      const openingLines = getLines(openingSlide)

      gsap.set(openingImage, { scale: 1.065 })
      gsap.set(openingCopy, { autoAlpha: 0, y: 20 })
      gsap.set(openingLines, { autoAlpha: 1, yPercent: 115 })

      if (!entranceReady) return

      openingTimeline = gsap
        .timeline({
          paused: document.hidden,
          onComplete: () => {
            openingTimeline = null
            startAutoplay()
          },
        })
        .to(openingImage, { scale: 1.045, duration: 1.8, ease: 'power3.out' }, 0)
        .to(openingCopy, { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.08, ease: 'power3.out' }, 0.15)
        .to(openingLines, { yPercent: 0, duration: 1, stagger: 0.1, ease: 'power3.out' }, 0.2)
    }, root)

    // A very slow opening image may arrive after its bounded wait. The intro has
    // already handed off to readable CSS; allow that late photograph to recover.
    const firstImage = getImage(slideElements[0])
    const handleFirstImageLoad = () => void prepareSlideImage(0)
    firstImage?.addEventListener('load', handleFirstImageLoad)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    motionQuery.addEventListener('change', handleMotionPreference)

    return () => {
      effectActive = false
      navigationVersion += 1
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      firstImage?.removeEventListener('load', handleFirstImageLoad)
      motionQuery.removeEventListener('change', handleMotionPreference)
      window.clearTimeout(deferredImageTimer)
      stopTimedMotion()
      imageCleanups.forEach((cancel) => cancel())
      transitionTimeline?.kill()
      openingTimeline?.kill()
      gsap.killTweensOf(slideElements.flatMap((slide) => [slide, ...Array.from(slide.querySelectorAll('*'))]))
      navigateRef.current = () => undefined
      toggleAutoplayRef.current = () => undefined
      context.revert()
    }
  }, [entranceReady, locale])

  const showPreviousSlide = () => {
    navigateRef.current(-1)
  }

  const showNextSlide = () => {
    navigateRef.current(1)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch' || (event.target as HTMLElement).closest('a, button')) return
    swipeStartRef.current = { x: event.clientX, y: event.clientY }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const start = swipeStartRef.current
    swipeStartRef.current = null
    if (!start || event.pointerType !== 'touch') return

    const deltaX = event.clientX - start.x
    const deltaY = event.clientY - start.y
    if (Math.abs(deltaX) < 52 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) return
    navigateRef.current(deltaX < 0 ? 1 : -1)
  }

  const handleHeroKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      showPreviousSlide()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      showNextSlide()
    }
  }

  return (
    <section
      ref={rootRef}
      id="top"
      aria-roledescription="carousel"
      aria-label={locale === 'en' ? 'SUMMIT Construction highlights' : 'أبرز أعمال سوميت للإنشاءات'}
      onKeyDown={handleHeroKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { swipeStartRef.current = null }}
      className="cinematic-hero relative isolate -mt-[5.25rem] h-[100svh] min-h-[35rem] overflow-hidden bg-summit-black text-[var(--color-photo-text)] [@media(max-height:640px)]:min-h-[30rem]"
    >
      <div className="absolute inset-0">
        {localizedSlides.map((slide, index) => {
          const Heading = index === 0 ? 'h1' : 'h2'
          const isActive = activeIndex === index

          return (
            <article
              key={slide.image.src}
              data-hero-slide
              aria-hidden={!isActive}
              aria-roledescription="slide"
              aria-label={locale === 'en' ? `${index + 1} of ${localizedSlides.length}` : `${index + 1} من ${localizedSlides.length}`}
              className="absolute inset-0 overflow-hidden"
              style={{ opacity: index === 0 ? 1 : 0, zIndex: index === 0 ? 1 : 0 }}
            >
              <div className="absolute inset-0 bg-summit-black" aria-hidden="true">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_30%,rgba(213,180,82,0.13),transparent_38%)]" />
                <div className="absolute inset-y-0 right-[18%] w-px bg-summit-gold/10" />
                <div className="absolute bottom-[18%] right-[8%] size-[42vw] max-h-[34rem] max-w-[34rem] rotate-45 border border-white/[0.055]" />
              </div>
              <picture>
                <source media="(max-width: 640px)" srcSet={index === 0 ? assetSrcSet(slide.image.mobileSrcSet) : undefined} sizes="100vw" type="image/webp" />
                <img
                  id={index === 0 ? 'summit-first-hero-image' : undefined}
                  data-hero-image
                  data-src={assetUrl(slide.image.src)}
                  data-srcset={assetSrcSet(slide.image.srcSet)}
                  data-mobile-src={assetUrl(slide.image.mobileSrc)}
                  data-mobile-srcset={assetSrcSet(slide.image.mobileSrcSet)}
                  data-ready="false"
                  src={index === 0 ? assetUrl(slide.image.src) : undefined}
                  srcSet={index === 0 ? assetSrcSet(slide.image.srcSet) : undefined}
                  sizes="100vw"
                  alt={slide.image.alt}
                  width={slide.image.width}
                  height={slide.image.height}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'low'}
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.hidden = true
                  }}
                  className={`absolute inset-0 size-full object-cover opacity-0 data-[ready=true]:opacity-100 ${slide.imagePosition}`}
                />
              </picture>
              <div className="hero-content-contrast absolute inset-0" />
              <div className="hero-vignette absolute inset-0" />

              <div className="hero-sketch-layer" aria-hidden="true">
                {slide.sketches.map((sketch, sketchIndex) => (
                  <span key={`${sketch}-${sketchIndex}`} className={`hero-sketch hero-sketch--${sketchIndex + 1}`}>
                    <HeroSketchIcon name={sketch} />
                  </span>
                ))}
              </div>

              <Container className="hero-content-shell relative z-10 flex h-full flex-col">
                <div className="hero-copy-panel">
                  <p data-hero-copy className="hero-category">
                    <span aria-hidden="true" />
                    {slide.category}
                  </p>

                  <Heading
                    aria-label={slide.headline}
                    className="hero-headline"
                  >
                    {slide.lines.map((line, lineIndex) => (
                      <span key={line} aria-hidden="true" className="block overflow-hidden pb-[0.08em]">
                        <span
                          data-hero-line
                          className={`block ${lineIndex === slide.accentLine ? 'hero-headline__accent' : ''}`}
                        >
                          {line}
                        </span>
                      </span>
                    ))}
                  </Heading>

                  <p data-hero-copy className="hero-description">{slide.description}</p>

                  <div data-hero-actions className="hero-actions">
                    {slide.action.type === 'whatsapp' ? (
                      <span data-hero-cta={slide.action.id} className="hero-cta-slot">
                        <WhatsAppAction
                          intent="quote"
                          className="hero-cta hero-cta--primary"
                          tabIndex={isActive ? 0 : -1}
                        >
                          <span className="hero-cta__label">{slide.cta}</span>
                          <span className="hero-cta__arrow" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
                        </WhatsAppAction>
                      </span>
                    ) : (
                      <a
                        data-magnetic
                        data-hero-cta={slide.action.id}
                        className="hero-cta hero-cta--primary"
                        href={routePath(locale, slide.action.page, slide.action.slug)}
                        tabIndex={isActive ? 0 : -1}
                      >
                        <span className="hero-cta__label">{slide.cta}</span>
                        <span className="hero-cta__arrow" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
                      </a>
                    )}
                    <a
                      data-magnetic
                      data-hero-secondary={slide.secondaryAction.id}
                      className="hero-cta hero-cta--secondary"
                      href={routePath(locale, slide.secondaryAction.page, slide.secondaryAction.slug)}
                      tabIndex={isActive ? 0 : -1}
                    >
                      <span className="hero-cta__label">{slide.secondaryCta}</span>
                      <span className="hero-cta__secondary-mark" aria-hidden="true" />
                    </a>
                  </div>

                  <ul data-hero-copy className="hero-capabilities" aria-label={locale === 'en' ? 'SUMMIT areas of expertise' : 'مجالات خبرة سوميت'}>
                    <li><Icon name="restoration" size={21} /><span>{locale === 'en' ? 'Heritage Restoration' : 'ترميم التراث'}</span></li>
                    <li><Icon name="construction" size={21} /><span>{locale === 'en' ? 'Construction' : 'الإنشاءات'}</span></li>
                    <li><Icon name="renovation" size={21} /><span>{locale === 'en' ? 'Fit-Out' : 'التشطيبات'}</span></li>
                    <li><Icon name="construction" size={21} /><span>{locale === 'en' ? 'Turnkey Delivery' : 'التسليم المتكامل'}</span></li>
                  </ul>
                </div>
              </Container>
            </article>
          )
        })}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 hidden grid-cols-12 px-[var(--page-gutter)] opacity-20 lg:grid" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index} className="border-l border-white/20 last:border-r" />
        ))}
      </div>

      <Container data-hero-navigation className="pointer-events-none absolute inset-x-0 bottom-0 z-30 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-8 [@media(max-height:640px)]:pb-3">
        <div className="grid grid-cols-[auto_minmax(1rem,1fr)_auto] items-end gap-3 border-t border-white/25 pt-5 sm:gap-8 [@media(max-height:640px)]:pt-3">
          <div className="flex items-baseline gap-2 font-display tabular-nums">
            <span className="text-xl font-medium text-summit-gold sm:text-2xl">{formatSlideNumber(activeIndex)}</span>
            <span className="text-[0.625rem] tracking-[0.12em] text-summit-stone">/ {String(localizedSlides.length).padStart(2, '0')}</span>
          </div>

          <div className="h-px self-center overflow-hidden bg-white/25">
            <span data-hero-progress className="block h-full w-full origin-left scale-x-0 bg-summit-gold" />
          </div>

          <div className="pointer-events-auto flex items-center gap-1 sm:gap-2">
            <button
              data-hero-autoplay
              data-magnetic
              type="button"
              onClick={() => toggleAutoplayRef.current()}
              disabled={reducedMotion}
              aria-label={reducedMotion
                ? (locale === 'en' ? 'Autoplay disabled by reduced motion preference' : 'تم تعطيل التشغيل التلقائي وفق تفضيل تقليل الحركة')
                : autoplayPaused
                  ? (locale === 'en' ? 'Resume carousel autoplay' : 'استئناف التشغيل التلقائي')
                  : (locale === 'en' ? 'Pause carousel autoplay' : 'إيقاف التشغيل التلقائي')}
              className="icon-control grid size-11 place-items-center border border-white/25 text-[var(--color-photo-text)] transition-colors hover:border-summit-gold hover:text-summit-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name={autoplayPaused ? 'play' : 'pause'} size={16} />
            </button>
            <button
              data-hero-previous
              data-magnetic
              type="button"
              onClick={showPreviousSlide}
              aria-label={locale === 'en' ? 'Show previous slide' : 'عرض الشريحة السابقة'}
              className="icon-control grid size-11 place-items-center border border-white/25 text-[var(--color-photo-text)] transition-colors hover:border-summit-gold hover:text-summit-gold"
            >
              <Icon name="arrow-left" size={18} />
            </button>
            <button
              data-hero-next
              data-magnetic
              type="button"
              onClick={showNextSlide}
              aria-label={locale === 'en' ? 'Show next slide' : 'عرض الشريحة التالية'}
              className="icon-control grid size-11 place-items-center border border-white/25 text-[var(--color-photo-text)] transition-colors hover:border-summit-gold hover:text-summit-gold"
            >
              <Icon name="arrow-right" size={18} />
            </button>
          </div>
        </div>
      </Container>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {locale === 'ar' ? `الشريحة ${activeIndex + 1} من ${localizedSlides.length}: ${localizedSlides[activeIndex].headline}` : `Slide ${activeIndex + 1} of ${localizedSlides.length}: ${localizedSlides[activeIndex].headline}`}
      </p>
    </section>
  )
}
