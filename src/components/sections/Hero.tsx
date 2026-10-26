import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ButtonLink } from '../ui/Button'
import { Container } from '../ui/Container'
import { Icon } from '../ui/Icon'
import { createImageCrossfade } from '../../lib/crossfade'
import { assetSrcSet, assetUrl } from '../../lib/assets'
import { useHomeCopy, useLocale } from '../../content/site'

type HeroSlide = {
  category: string
  headline: string
  lines: string[]
  accentLine: number
  cta: string
  href: string
  image: {
    src: string
    srcSet: string
    mobileSrc: string
    alt: string
  }
  imagePosition: string
}

const AUTOPLAY_SECONDS = 8
const DEFERRED_SLIDE_DELAY_MS = 1500
const IMAGE_WAIT_MS = 5000

const slides: HeroSlide[] = [
  {
    category: 'Heritage Restoration',
    headline: 'We Build the Future with the Spirit of Heritage.',
    lines: ['We Build the Future', 'with the Spirit', 'of Heritage.'],
    accentLine: 2,
    cta: 'Discover our story',
    href: '#about',
    image: {
      src: '/assets/projects/featured/real-media/hero-heritage-wide-1916.webp',
      srcSet:
        '/assets/projects/featured/real-media/hero-heritage-wide-960.webp 960w, /assets/projects/featured/real-media/hero-heritage-wide-1440.webp 1440w, /assets/projects/featured/real-media/hero-heritage-wide-1916.webp 1916w',
      mobileSrc: '/assets/projects/featured/real-media/hero-heritage-mobile-720.webp',
      alt: 'Restored marble hall at Mohamed Ali Palace',
    },
    imagePosition: 'object-[58%_center] sm:object-center',
  },
  {
    category: 'Construction',
    headline: 'Monumental Ideas. Precisely Built.',
    lines: ['Monumental Ideas.', 'Precisely Built.'],
    accentLine: 1,
    cta: 'Explore our services',
    href: '#services',
    image: {
      src: '/assets/projects/featured/real-media/hero-construction-wide-1916.webp',
      srcSet:
        '/assets/projects/featured/real-media/hero-construction-wide-960.webp 960w, /assets/projects/featured/real-media/hero-construction-wide-1440.webp 1440w, /assets/projects/featured/real-media/hero-construction-wide-1916.webp 1916w',
      mobileSrc: '/assets/projects/featured/real-media/hero-construction-mobile-720.webp',
      alt: 'SUMMIT workers installing overhead services at the New Capital Downtown Mall site',
    },
    imagePosition: 'object-[62%_center] sm:object-center',
  },
  {
    category: 'Residential Fit-Out',
    headline: 'Spaces Designed Around the Way You Live.',
    lines: ['Spaces Designed', 'Around the Way', 'You Live.'],
    accentLine: 2,
    cta: 'View selected work',
    href: '#projects',
    image: {
      src: '/assets/projects/featured/real-media/hero-residential-wide-1916.webp',
      srcSet:
        '/assets/projects/featured/real-media/hero-residential-wide-960.webp 960w, /assets/projects/featured/real-media/hero-residential-wide-1440.webp 1440w, /assets/projects/featured/real-media/hero-residential-wide-1916.webp 1916w',
      mobileSrc: '/assets/projects/featured/real-media/hero-residential-mobile-720.webp',
      alt: 'Residential villas photographed at Oriana CFC',
    },
    imagePosition: 'object-[67%_center] sm:object-center',
  },
  {
    category: 'Retail Fit-Out',
    headline: 'Interiors Where Material Becomes Atmosphere.',
    lines: ['Interiors Where', 'Material Becomes', 'Atmosphere.'],
    accentLine: 2,
    cta: 'Start a conversation',
    href: '#contact',
    image: {
      src: '/assets/projects/featured/real-media/hero-fitout-wide-1916.webp',
      srcSet:
        '/assets/projects/featured/real-media/hero-fitout-wide-960.webp 960w, /assets/projects/featured/real-media/hero-fitout-wide-1440.webp 1440w, /assets/projects/featured/real-media/hero-fitout-wide-1916.webp 1916w',
      mobileSrc: '/assets/projects/featured/real-media/hero-fitout-mobile-720.webp',
      alt: 'Interior ceiling installation in progress at Marvel',
    },
    imagePosition: 'object-[58%_center] sm:object-center',
  },
]

function formatSlideNumber(index: number) {
  return String(index + 1).padStart(2, '0')
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
          if (mobileSource && image.dataset.mobileSrc) mobileSource.srcset = image.dataset.mobileSrc
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

  return (
    <section
      ref={rootRef}
      id="top"
      aria-roledescription="carousel"
      aria-label="SUMMIT Construction highlights"
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
              aria-label={`${index + 1} of ${localizedSlides.length}`}
              className="absolute inset-0 overflow-hidden"
              style={{ opacity: index === 0 ? 1 : 0, zIndex: index === 0 ? 1 : 0 }}
            >
              <div className="absolute inset-0 bg-summit-black" aria-hidden="true">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_30%,rgba(213,180,82,0.13),transparent_38%)]" />
                <div className="absolute inset-y-0 right-[18%] w-px bg-summit-gold/10" />
                <div className="absolute bottom-[18%] right-[8%] size-[42vw] max-h-[34rem] max-w-[34rem] rotate-45 border border-white/[0.055]" />
              </div>
              <picture>
                <source media="(max-width: 640px)" srcSet={index === 0 ? assetUrl(slide.image.mobileSrc) : undefined} type="image/webp" />
                <img
                  id={index === 0 ? 'summit-first-hero-image' : undefined}
                  data-hero-image
                  data-src={assetUrl(slide.image.src)}
                  data-srcset={assetSrcSet(slide.image.srcSet)}
                  data-mobile-src={assetUrl(slide.image.mobileSrc)}
                  data-ready="false"
                  src={index === 0 ? assetUrl(slide.image.src) : undefined}
                  srcSet={index === 0 ? assetSrcSet(slide.image.srcSet) : undefined}
                  sizes="100vw"
                  alt={slide.image.alt}
                  width={1916}
                  height={821}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'low'}
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.hidden = true
                  }}
                  className={`absolute inset-0 size-full object-cover opacity-0 data-[ready=true]:opacity-100 ${slide.imagePosition}`}
                />
              </picture>
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,0.94)_0%,rgba(10,10,10,0.72)_46%,rgba(10,10,10,0.18)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.2)_0%,transparent_28%,rgba(10,10,10,0.72)_100%)]" />

              <Container className="relative z-10 flex h-full flex-col justify-end pb-28 pt-[calc(5.25rem+2rem)] sm:pb-32 lg:pb-36 lg:pt-[calc(5.25rem+4rem)] [@media(max-height:640px)]:pb-20 [@media(max-height:640px)]:pt-[5.75rem]">
                <div className="max-w-[76rem]">
                  <p data-hero-copy className="mb-5 flex items-center gap-3 font-body text-[0.625rem] font-bold uppercase tracking-[0.22em] text-summit-gold sm:mb-7 sm:text-[0.6875rem] [@media(max-height:640px)]:mb-3">
                    <span className="h-px w-8 bg-summit-gold sm:w-12" aria-hidden="true" />
                    {slide.category}
                  </p>

                  <Heading
                    aria-label={slide.headline}
                    className="max-w-[13ch] font-display text-[clamp(2.5rem,7.1vw,7rem)] font-medium leading-[0.98] tracking-[-0.055em] [@media(max-height:640px)]:text-[clamp(1.85rem,6vw,3rem)]"
                  >
                    {slide.lines.map((line, lineIndex) => (
                      <span key={line} aria-hidden="true" className="block overflow-hidden pb-[0.08em]">
                        <span
                          data-hero-line
                          className={`block ${lineIndex === slide.accentLine ? 'font-[family-name:var(--font-editorial)] text-[1.12em] italic tracking-[-0.025em] text-[var(--color-photo-accent)]' : ''}`}
                        >
                          {line}
                        </span>
                      </span>
                    ))}
                  </Heading>

                  <div data-hero-copy className="mt-7 sm:mt-9 [@media(max-height:640px)]:mt-4">
                    <ButtonLink href={slide.href} tabIndex={isActive ? 0 : -1}>
                      {slide.cta}
                    </ButtonLink>
                  </div>
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

      <Container className="pointer-events-none absolute inset-x-0 bottom-0 z-30 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-8 [@media(max-height:640px)]:pb-3">
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
              type="button"
              onClick={() => toggleAutoplayRef.current()}
              disabled={reducedMotion}
              aria-label={reducedMotion ? 'Autoplay disabled by reduced motion preference' : autoplayPaused ? 'Resume carousel autoplay' : 'Pause carousel autoplay'}
              className="grid size-11 place-items-center border border-white/25 text-[var(--color-photo-text)] transition-colors hover:border-summit-gold hover:text-summit-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name={autoplayPaused ? 'play' : 'pause'} size={16} />
            </button>
            <button
              type="button"
              onClick={showPreviousSlide}
              aria-label="Show previous slide"
              className="grid size-11 place-items-center border border-white/25 text-[var(--color-photo-text)] transition-colors hover:border-summit-gold hover:text-summit-gold"
            >
              <Icon name="arrow-left" size={18} />
            </button>
            <button
              type="button"
              onClick={showNextSlide}
              aria-label="Show next slide"
              className="grid size-11 place-items-center border border-white/25 text-[var(--color-photo-text)] transition-colors hover:border-summit-gold hover:text-summit-gold"
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
