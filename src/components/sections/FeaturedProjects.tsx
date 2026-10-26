import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projects } from '../../data/projects'
import { createImageCrossfade } from '../../lib/crossfade'
import { assetUrl } from '../../lib/assets'
import { Container } from '../ui/Container'
import { Icon } from '../ui/Icon'
import { SectionHeading } from '../ui/SectionHeading'
import { useHomeCopy, useLocale } from '../../content/site'
import { publishedProjects } from '../../data/portfolio'
import { routePath } from '../../lib/routes'

gsap.registerPlugin(ScrollTrigger)

type Selection = {
  projectIndex: number
  imageIndex: number
}

type LayerIndex = 0 | 1

type PendingTransition = {
  selection: Selection
  layer: LayerIndex
}

type GalleryState = {
  layers: [Selection | null, Selection | null]
  activeLayer: LayerIndex
  pending: PendingTransition | null
}

const firstSelection: Selection = { projectIndex: 0, imageIndex: 0 }

function formatNumber(index: number) {
  return String(index + 1).padStart(2, '0')
}

function isSameSelection(first: Selection, second: Selection) {
  return first.projectIndex === second.projectIndex && first.imageIndex === second.imageIndex
}

/** Decode the exact element that will be composited, while keeping the old layer visible. */
function decodePhotograph(image: HTMLImageElement, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    let timeout = 0

    const finish = (ready: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      image.removeEventListener('load', decode)
      image.removeEventListener('error', fail)
      signal.removeEventListener('abort', abort)
      resolve(ready)
    }
    const abort = () => finish(false)
    const fail = () => finish(false)
    const decode = async () => {
      try {
        await image.decode()
        finish(image.naturalWidth > 0 && image.naturalHeight > 0)
      } catch {
        finish(false)
      }
    }
    image.addEventListener('load', decode, { once: true })
    image.addEventListener('error', fail, { once: true })
    signal.addEventListener('abort', abort, { once: true })
    timeout = window.setTimeout(() => finish(false), 6500)
    if (signal.aborted) {
      finish(false)
      return
    }
    // decode() also waits for a pending request, including a cached photograph.
    void decode()
  })
}

export function FeaturedProjects() {
  const locale = useLocale()
  const copy = useHomeCopy().featured
  const sectionRef = useRef<HTMLElement>(null)
  const layerRefs = useRef<[HTMLElement | null, HTMLElement | null]>([null, null])
  const transitionRef = useRef<gsap.core.Timeline | null>(null)
  const copyTransitionRef = useRef<gsap.core.Tween | null>(null)
  const copyRevealPendingRef = useRef(false)
  const reducedMotionRef = useRef(false)
  const requestedSelectionRef = useRef<Selection>(firstSelection)
  const decodedImagesRef = useRef(new Set<string>())
  const [gallery, setGallery] = useState<GalleryState>({
    layers: [firstSelection, null],
    activeLayer: 0,
    pending: null,
  })
  const [copySelection, setCopySelection] = useState<Selection>(firstSelection)
  const [requestVersion, setRequestVersion] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [loadMessage, setLoadMessage] = useState('')
  const [unavailableImages, setUnavailableImages] = useState<Set<string>>(new Set())
  const [readyImages, setReadyImages] = useState<Set<string>>(new Set())

  const displayedSelection = gallery.layers[gallery.activeLayer] ?? firstSelection
  const activeProjectIndex = copySelection.projectIndex
  const activeImageIndex = copySelection.imageIndex
  const activeProject = projects[activeProjectIndex]
  const activePortfolioProject = publishedProjects[activeProjectIndex]
  const activeImage = activeProject.images[activeImageIndex]

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = motionQuery.matches

    function handleMotionPreference(event: MediaQueryListEvent) {
      reducedMotionRef.current = event.matches
      if (event.matches) {
        // Finish, rather than kill, the handoff so both layers and navigation agree.
        transitionRef.current?.progress(1)
        copyTransitionRef.current?.progress(1)
        context.revert()
      }
    }

    const context = gsap.context(() => {
      if (motionQuery.matches) return

      const intro = section.querySelector<HTMLElement>('[data-projects-intro]')
      const navigation = section.querySelector<HTMLElement>('[data-projects-navigation]')
      const gallery = section.querySelector<HTMLElement>('[data-projects-gallery]')

      gsap.from(intro?.querySelectorAll('header > p, header > div > *') ?? [], {
        autoAlpha: 0,
        y: 36,
        duration: 0.9,
        stagger: 0.09,
        ease: 'power3.out',
        scrollTrigger: { trigger: intro, start: 'top 80%', once: true },
      })

      gsap.from(navigation, {
        autoAlpha: 0,
        x: -28,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: navigation, start: 'top 82%', once: true },
      })

      gsap.from(gallery, {
        autoAlpha: 0,
        clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
        duration: 1.25,
        ease: 'power4.inOut',
        scrollTrigger: { trigger: gallery, start: 'top 82%', once: true },
      })
    }, section)

    motionQuery.addEventListener('change', handleMotionPreference)

    return () => {
      motionQuery.removeEventListener('change', handleMotionPreference)
      transitionRef.current?.kill()
      copyTransitionRef.current?.kill()
      context.revert()
    }
  }, [])

  // One handoff runs at a time. Navigation records the latest intent and this
  // effect stages it only after the previous handoff has fully committed.
  useEffect(() => {
    if (gallery.pending) return
    const target = requestedSelectionRef.current
    const current = gallery.layers[gallery.activeLayer] ?? firstSelection
    if (isSameSelection(target, current)) {
      setIsLoading(false)
      return
    }

    const layer: LayerIndex = gallery.activeLayer === 0 ? 1 : 0
    setIsLoading(true)
    setLoadMessage('')
    const source = projects[target.projectIndex].images[target.imageIndex].src
    setUnavailableImages((previous) => {
      if (!previous.has(source)) return previous
      const next = new Set(previous)
      next.delete(source)
      return next
    })
    setGallery((previous) => {
      const layers: GalleryState['layers'] = [...previous.layers]
      layers[layer] = target
      return { ...previous, layers, pending: { selection: target, layer } }
    })
  }, [requestVersion, gallery.activeLayer, gallery.pending])

  useLayoutEffect(() => {
    const pending = gallery.pending
    if (!pending) return
    const targetSelection = pending.selection
    const outgoing = layerRefs.current[gallery.activeLayer]
    const incoming = layerRefs.current[pending.layer]
    const incomingImage = incoming?.querySelector<HTMLImageElement>('img[data-project-image]')
    if (!outgoing || !incoming || !incomingImage) return
    const outgoingLayer = outgoing
    const incomingLayer = incoming
    const photograph = incomingImage
    const controller = new AbortController()
    let cancelled = false
    let timeline: gsap.core.Timeline | null = null
    const copy = sectionRef.current?.querySelectorAll<HTMLElement>('[data-project-active-copy]') ?? []

    const complete = () => {
      if (cancelled) return
      gsap.set(incoming, { opacity: 1, visibility: 'visible', zIndex: 1, willChange: 'auto' })
      gsap.set(outgoing, { opacity: 0, visibility: 'hidden', zIndex: 0, willChange: 'auto' })
      gsap.set(photograph, { scale: 1 })
      transitionRef.current = null
      setIsLoading(false)
      setGallery((previous) => ({ ...previous, activeLayer: pending.layer, pending: null }))
    }

    // Explicit ordering makes slot 0 -> 1 and slot 1 -> 0 identical. Opacity
    // belongs to GSAP during the handoff; React agrees with these end states.
    gsap.set(outgoing, { opacity: 1, visibility: 'visible', zIndex: 1 })
    gsap.set(incoming, { opacity: 0, visibility: 'visible', zIndex: 2 })

    async function revealDecodedPhotograph() {
      const ready = await decodePhotograph(photograph, controller.signal)
      if (cancelled) return
      if (!ready) {
        if (isSameSelection(requestedSelectionRef.current, targetSelection)) {
          requestedSelectionRef.current = gallery.layers[gallery.activeLayer] ?? firstSelection
        }
        gsap.set(incoming, { opacity: 0, visibility: 'hidden', zIndex: 0 })
        setIsLoading(false)
        setGallery((previous) => ({ ...previous, pending: null }))
        setLoadMessage('This photograph could not be displayed. Your current view has been kept.')
        return
      }

      setIsLoading(false)
      decodedImagesRef.current.add(photograph.src)
      copyTransitionRef.current?.kill()
      if (reducedMotionRef.current) {
        copyRevealPendingRef.current = false
        setCopySelection(targetSelection)
        gsap.set(copy, { opacity: 1, y: 0 })
        complete()
        return
      }

      const targetImage = projects[targetSelection.projectIndex].images[targetSelection.imageIndex]
      timeline = createImageCrossfade({
        outgoing: outgoingLayer,
        incoming: incomingLayer,
        image: photograph,
        scale: targetImage.fit === 'contain' ? 1 : 1.025,
        paused: true,
        onComplete: complete,
      })
      transitionRef.current = timeline
      timeline
        .to(copy, { opacity: 0, y: -8, duration: 0.22, ease: 'power1.inOut' }, 0)
        .call(() => {
          if (cancelled) return
          // The DOM receives new words only while every copy node is invisible.
          copyRevealPendingRef.current = true
          setCopySelection(targetSelection)
        }, [], 0.24)
      timeline.play()
    }

    void revealDecodedPhotograph()
    return () => {
      cancelled = true
      controller.abort()
      timeline?.kill()
      if (transitionRef.current === timeline) transitionRef.current = null
    }
  }, [gallery.pending, gallery.activeLayer])

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section || !copyRevealPendingRef.current) return
    copyRevealPendingRef.current = false

    const copy = section.querySelectorAll<HTMLElement>('[data-project-active-copy]')
    if (reducedMotionRef.current) {
      gsap.set(copy, { opacity: 1, y: 0 })
      return
    }
    gsap.set(copy, { opacity: 0, y: 12 })
    const tween = gsap.to(copy, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.055, ease: 'power2.out',
    })
    copyTransitionRef.current = tween
    return () => { tween.kill(); if (copyTransitionRef.current === tween) copyTransitionRef.current = null }
  }, [copySelection])

  const navigateTo = (projectIndex: number, imageIndex: number) => {
    const target = { projectIndex, imageIndex }

    requestedSelectionRef.current = target
    setRequestVersion((version) => version + 1)
  }

  const selectProject = (projectIndex: number) => {
    navigateTo(projectIndex, 0)
  }

  const selectImage = (imageIndex: number) => {
    navigateTo(activeProjectIndex, imageIndex)
  }

  const showPreviousImage = () => {
    const requested = requestedSelectionRef.current
    const imageIndex = (requested.imageIndex - 1 + projects[requested.projectIndex].images.length) % projects[requested.projectIndex].images.length
    navigateTo(requested.projectIndex, imageIndex)
  }

  const showNextImage = () => {
    const requested = requestedSelectionRef.current
    const imageIndex = (requested.imageIndex + 1) % projects[requested.projectIndex].images.length
    navigateTo(requested.projectIndex, imageIndex)
  }

  const handleGalleryKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    if (event.key === 'ArrowLeft') showPreviousImage()
    else showNextImage()
  }

  const renderImage = (selection: Selection | null, layer: LayerIndex) => {
    // Both slots remain mounted for the lifetime of the gallery. Only the hidden
    // slot receives a new source, after its previous outgoing motion has ended.
    if (!selection) return (
      <figure
        key={`project-layer-${layer}`}
        ref={(element) => { layerRefs.current[layer] = element }}
        aria-hidden="true"
        data-project-layer={layer}
        data-layer-active="false"
        className="absolute inset-0 overflow-hidden"
        style={{ opacity: 0, visibility: 'hidden', zIndex: 0 }}
      />
    )
    const project = projects[selection.projectIndex]
    const image = project.images[selection.imageIndex]
    const galleryAlt = publishedProjects[selection.projectIndex].gallery[selection.imageIndex]?.alt[locale] ?? image.alt
    const isPortrait = image.fit === 'contain'
    const isActive = gallery.activeLayer === layer
    const isIncoming = gallery.pending?.layer === layer
    const unavailable = unavailableImages.has(image.src)

    return (
      <figure
        key={`project-layer-${layer}`}
        ref={(element) => { layerRefs.current[layer] = element }}
        aria-hidden={!isActive}
        data-project-layer={layer}
        data-layer-active={isActive ? 'true' : 'false'}
        data-selection={`${selection.projectIndex}:${selection.imageIndex}`}
        className="absolute inset-0 overflow-hidden"
        style={{ opacity: isActive ? 1 : 0, visibility: isActive || isIncoming ? 'visible' : 'hidden', zIndex: isIncoming ? 2 : isActive ? 1 : 0 }}
      >
        <div className="project-image-fallback absolute inset-0 grid place-items-center bg-gradient-to-br from-summit-charcoal via-summit-black to-summit-charcoal p-8 text-center text-summit-ivory" aria-hidden="true">
          {!readyImages.has(image.src) || unavailable ? <span className="max-w-xs font-display text-2xl">{publishedProjects[selection.projectIndex].title[locale]}<span className="mt-3 block font-body text-xs uppercase tracking-[0.16em] text-summit-gold">{image.label}</span></span> : null}
        </div>
        {!unavailable ? <img
          data-project-image
          src={assetUrl(image.src)}
          alt={galleryAlt}
          loading={isIncoming ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={(event) => {
            const photograph = event.currentTarget
            void photograph.decode().then(() => {
              decodedImagesRef.current.add(image.src)
              setReadyImages((previous) => new Set(previous).add(image.src))
            }).catch(() => { /* A failed decode is handled by the incoming-layer gate. */ })
          }}
          onError={() => {
            decodedImagesRef.current.delete(image.src)
            setUnavailableImages((previous) => new Set(previous).add(image.src))
          }}
          className={`relative size-full ${
            isPortrait ? 'object-contain p-5 sm:p-8 lg:p-10' : `object-cover ${image.position ?? 'object-center'}`
          }`}
        /> : <div data-project-image className="relative size-full" />}
        <div className="absolute inset-0 bg-gradient-to-t from-summit-black/70 via-transparent to-summit-black/15" aria-hidden="true" />
      </figure>
    )
  }

  return (
    <section
      ref={sectionRef}
      id="projects"
      aria-label={locale === 'en' ? 'Featured projects' : 'مشروعات مختارة'}
      className="featured-projects relative overflow-hidden bg-[var(--color-panel)] py-section-lg text-[var(--color-ink)]"
    >
      <div className="pointer-events-none absolute inset-0 hidden grid-cols-12 px-[var(--page-gutter)] opacity-60 lg:grid" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index} className="border-l border-[var(--color-border)] last:border-r" />
        ))}
      </div>

      <Container className="relative z-10">
        <div data-projects-intro>
          <SectionHeading
            eyebrow={copy.eyebrow}
            title={copy.title}
            description={copy.description}
          />
        </div>

        <div className="mt-16 grid gap-10 sm:mt-20 lg:mt-28 lg:grid-cols-12 lg:gap-8 xl:gap-12">
          <div className="lg:col-span-4 lg:flex lg:flex-col lg:justify-between">
            <nav data-projects-navigation aria-label={locale === 'en' ? 'Choose a featured project' : 'اختر مشروعًا'} className="border-t border-[var(--color-border)]">
              {projects.map((project, projectIndex) => {
                const isActive = activeProjectIndex === projectIndex

                return (
                  <button
                    key={project.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => selectProject(projectIndex)}
                    className={`group relative grid w-full grid-cols-[2.25rem_1fr] gap-3 border-b border-[var(--color-border)] py-5 text-left transition-colors sm:grid-cols-[3rem_1fr] sm:gap-4 sm:py-6 ${
                      isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <span className={`pt-1 font-body text-[0.625rem] font-bold tracking-[0.18em] transition-colors ${isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)] group-hover:text-[var(--color-accent)]'}`}>
                      {formatNumber(projectIndex)}
                    </span>
                    <span>
                      <span className="block font-body text-[0.5625rem] font-bold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        {locale === 'ar' ? ['ترميم التراث', 'الإنشاءات', 'التشطيبات السكنية'][projectIndex] : project.category}
                      </span>
                      <span className="mt-2 block font-display text-[clamp(1.35rem,2.2vw,2.25rem)] font-medium leading-[1.05] tracking-[-0.045em]">
                        {publishedProjects[projectIndex].title[locale]}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0 left-0 w-0.5 origin-top bg-summit-gold transition-transform duration-500 ease-summit ${isActive ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'}`}
                    />
                  </button>
                )
              })}
            </nav>

            <div className="mt-8 hidden max-w-xs border-l border-summit-gold pl-5 lg:block">
              <p className="font-body text-[0.625rem] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">{copy.explore}</p>
              <p className="mt-3 font-body text-xs leading-6 text-[var(--color-muted)]">
                {copy.note}
              </p>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-8">
            <div
              data-projects-gallery
              role="group"
              aria-roledescription="image gallery"
              aria-label={locale === 'en' ? `${activePortfolioProject.title[locale]} photography` : `صور ${activePortfolioProject.title[locale]}`}
              aria-busy={isLoading || gallery.pending !== null}
              tabIndex={0}
              onKeyDown={handleGalleryKeyDown}
              data-gallery-state={isLoading ? 'loading' : gallery.pending ? 'transitioning' : 'idle'}
              data-active-project={projects[displayedSelection.projectIndex].id}
              data-active-image={displayedSelection.imageIndex}
              className="group/gallery relative aspect-[4/5] overflow-hidden bg-summit-black sm:aspect-[16/11] lg:aspect-[16/10] [clip-path:polygon(0_0,100%_0,100%_92%,94%_100%,0_100%)]"
            >
              {renderImage(gallery.layers[0], 0)}
              {renderImage(gallery.layers[1], 1)}

              <div className="pointer-events-none absolute inset-0 z-10 border border-white/15 transition-colors duration-500 group-hover/gallery:border-summit-gold/60" aria-hidden="true" />
              <div className="pointer-events-none absolute left-0 top-0 z-10 h-px w-1/3 bg-summit-gold" aria-hidden="true" />
              <div className="pointer-events-none absolute right-5 top-5 z-10 size-20 text-summit-gold/80 sm:right-8 sm:top-8 sm:size-28" aria-hidden="true">
                <svg viewBox="0 0 100 90" fill="none" className="size-full">
                  <path d="M5 84 40 8l35 76H5Z" stroke="currentColor" />
                  <path d="m40 84 24-51 25 51H40Z" stroke="currentColor" />
                </svg>
              </div>
              <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-5 text-summit-ivory sm:p-7 lg:p-8">
                <div data-project-active-copy>
                  <p className="font-body text-[0.5625rem] font-bold uppercase tracking-[0.18em] text-summit-gold">View</p>
                  <p className="mt-2 font-display text-lg font-medium tracking-[-0.03em] sm:text-2xl">{activeImage.label}</p>
                </div>
                <p className="font-display text-sm tabular-nums sm:text-base" aria-hidden="true">
                  <span className="text-summit-gold">{formatNumber(activeImageIndex)}</span>
                  <span className="mx-2 text-white/50">/</span>
                  {formatNumber(activeProject.images.length - 1)}
                </p>
              </div>
            </div>

            <div className="grid gap-8 border-b border-[var(--color-border)] pb-8 pt-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:pb-10 sm:pt-9">
              <div>
                <p data-project-active-copy className="flex items-center gap-2 font-body text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  <Icon name={activeProjectIndex === 0 ? 'restoration' : activeProjectIndex === 1 ? 'construction' : 'renovation'} size={16} />
                  {locale === 'ar' ? ['ترميم التراث', 'الإنشاءات', 'التشطيبات السكنية'][activeProjectIndex] : activeProject.category}
                </p>
                <h3 data-project-active-copy className="project-title mt-3 max-w-3xl font-display text-[clamp(2.5rem,5.7vw,6rem)] font-medium leading-[0.95] tracking-[-0.05em] text-[var(--color-ink)]">
                  {activePortfolioProject.title[locale]}
                </h3>
                <p data-project-active-copy className="mt-5 max-w-xl font-body text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                  {activePortfolioProject.description?.[locale]}
                </p>
              </div>

              <div className="flex items-center gap-2 sm:pb-1">
                <button
                  type="button"
                  onClick={showPreviousImage}
                  aria-label={`Show previous photograph of ${activeProject.name}`}
                  className="grid size-11 place-items-center border border-[var(--color-border)] text-[var(--color-ink)] transition-colors hover:border-summit-gold hover:bg-summit-gold hover:text-summit-black sm:size-12"
                >
                  <Icon name="arrow-left" size={18} />
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  aria-label={`Show next photograph of ${activeProject.name}`}
                  className="grid size-11 place-items-center border border-[var(--color-border)] text-[var(--color-ink)] transition-colors hover:border-summit-gold hover:bg-summit-gold hover:text-summit-black sm:size-12"
                >
                  <Icon name="arrow-right" size={18} />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3" aria-label={`Choose a photograph of ${activeProject.name}`}>
              {activeProject.images.map((image, imageIndex) => {
                const isActive = activeImageIndex === imageIndex
                return (
                  <button
                    key={image.src}
                    type="button"
                    onClick={() => selectImage(imageIndex)}
                    aria-label={`Show ${image.label.toLowerCase()}`}
                    aria-pressed={isActive}
                    className={`group relative min-h-14 border-t pt-3 text-left transition-colors ${isActive ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)] hover:border-[var(--color-ink)]'}`}
                  >
                    <span className={`font-body text-[0.5625rem] font-bold tracking-[0.16em] ${isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
                      {formatNumber(imageIndex)}
                    </span>
                    <span className={`mt-1 block truncate font-body text-[0.625rem] font-bold uppercase tracking-[0.1em] transition-colors sm:text-xs ${isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)] group-hover:text-[var(--color-ink)]'}`}>
                      {image.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Container>

      <Container className="relative z-10 mt-6 flex justify-end">
        <a className="text-link" href={routePath(locale, 'projects')}>{copy.all}<span aria-hidden="true">↗</span></a>
      </Container>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {activeProject.name}, photograph {activeImageIndex + 1} of {activeProject.images.length}: {activeImage.label}.
      </p>
      <p role="status" aria-live="polite" className={loadMessage ? 'mx-auto mt-5 max-w-xl px-5 text-center font-body text-sm text-[var(--color-muted)]' : 'sr-only'}>
        {loadMessage || (isLoading ? 'Preparing photograph. Your current view remains visible.' : '')}
      </p>
    </section>
  )
}
