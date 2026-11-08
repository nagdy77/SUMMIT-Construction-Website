import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projects as allProjects } from '../../data/projects'
import { createImageCrossfade } from '../../lib/crossfade'
import { assetUrl } from '../../lib/assets'
import { Container } from '../ui/Container'
import { Icon } from '../ui/Icon'
import { SectionHeading } from '../ui/SectionHeading'
import { useHomeCopy, useLocale } from '../../content/site'
import { publishedProjects as allPortfolioProjects } from '../../data/portfolio'
import { routePath } from '../../lib/routes'

gsap.registerPlugin(ScrollTrigger)

const featuredProjectIds = ['mohamed-ali-palace', 'oriana-cairo-festival-city', 'marvel', 'desigual']
const projects = featuredProjectIds.map((id) => allProjects.find((project) => project.id === id)).filter((project): project is (typeof allProjects)[number] => Boolean(project))
const publishedProjects = projects.map((project) => allPortfolioProjects.find((item) => item.id === project.id)).filter((project): project is (typeof allPortfolioProjects)[number] => Boolean(project))
const featuredCategoryLabels = {
  'Heritage Restoration': 'ترميم التراث',
  Construction: 'الإنشاءات',
  'Residential Fit-Out': 'التشطيبات السكنية',
  'Retail Fit-Out': 'التشطيبات التجارية',
} as const

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
    timeout = window.setTimeout(() => finish(false), 3000)
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
        x: locale === 'ar' ? 28 : -28,
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
  }, [locale])

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
        duration: 0.62,
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

  useEffect(() => {
    const currentProject = projects[copySelection.projectIndex]
    const nextImage = currentProject.images[(copySelection.imageIndex + 1) % currentProject.images.length]
    const nextProject = projects[(copySelection.projectIndex + 1) % projects.length]
    const candidates = [nextImage, nextProject.images[0]]
    const preloads = candidates.map((image) => {
      const preload = new Image()
      const smallestSource = image.srcSet?.split(', ')[0]?.split(' ')[0] ?? image.src
      preload.decoding = 'async'
      preload.src = assetUrl(smallestSource)
      return preload
    })

    return () => preloads.forEach((preload) => preload.removeAttribute('src'))
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
          {!readyImages.has(image.src) || unavailable ? <span className="max-w-xs font-display text-2xl">{publishedProjects[selection.projectIndex].title[locale]}</span> : null}
        </div>
        {!unavailable ? <img
          data-project-image
          src={assetUrl(image.src)}
          srcSet={image.srcSet?.split(', ').map((item) => `${assetUrl(item.split(' ')[0])} ${item.split(' ')[1]}`).join(', ')}
          sizes="(max-width: 1023px) 100vw, 65vw"
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
      className="featured-projects relative overflow-hidden bg-[var(--color-panel)] py-[clamp(3.75rem,6vw,6rem)] text-[var(--color-ink)]"
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

        <div className="featured-projects__showcase mt-10 grid gap-6 sm:mt-12 sm:gap-8 lg:mt-14 lg:grid-cols-[minmax(16rem,0.35fr)_minmax(0,0.65fr)] lg:items-start lg:gap-8 xl:gap-10">
          <div className="featured-projects__navigation-column lg:flex lg:flex-col lg:justify-between">
            <nav data-projects-navigation aria-label={locale === 'en' ? 'Choose a featured project' : 'اختر مشروعًا'} className="featured-project-navigation">
              {projects.map((project, projectIndex) => {
                const isActive = activeProjectIndex === projectIndex

                return (
                  <button
                    key={project.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => selectProject(projectIndex)}
                    className={`featured-project-navigation__item group relative grid w-full grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-b border-[var(--color-border)] py-4 text-start transition-colors sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-5 ${
                      isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <span className={`pt-1 font-body text-[0.625rem] font-bold tracking-[0.18em] transition-colors ${isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)] group-hover:text-[var(--color-accent)]'}`}>
                      {formatNumber(projectIndex)}
                    </span>
                    <span>
                      <span className="featured-project-navigation__category block font-body text-[0.5625rem] font-bold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        {locale === 'ar' ? featuredCategoryLabels[project.category] : project.category}
                      </span>
                      <span className="featured-project-navigation__title mt-2 block font-display text-[clamp(1.35rem,2.2vw,2.25rem)] font-medium leading-[1.05] tracking-[-0.045em]">
                        {publishedProjects[projectIndex].title[locale]}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0 start-0 w-0.5 origin-top bg-summit-gold transition-transform duration-500 ease-summit ${isActive ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'}`}
                    />
                  </button>
                )
              })}
            </nav>

            <div className="featured-projects__note mt-7 hidden max-w-xs border-s border-summit-gold ps-5 lg:block">
              <p className="font-body text-[0.625rem] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">{copy.explore}</p>
              <p className="mt-3 font-body text-xs leading-6 text-[var(--color-muted)]">
                {copy.note}
              </p>
            </div>
          </div>

          <div className="featured-projects__preview min-w-0">
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
              className="featured-project-gallery group/gallery relative aspect-[16/10] overflow-hidden bg-summit-black [clip-path:polygon(0_0,100%_0,100%_92%,94%_100%,0_100%)]"
            >
              {renderImage(gallery.layers[0], 0)}
              {renderImage(gallery.layers[1], 1)}

              <div className="pointer-events-none absolute inset-0 z-10 border border-white/15 transition-colors duration-500 group-hover/gallery:border-summit-gold/60" aria-hidden="true" />
              <div className="pointer-events-none absolute left-0 top-0 z-10 h-px w-1/3 bg-summit-gold" aria-hidden="true" />
              <div className="pointer-events-none absolute right-5 top-5 z-10 w-16 opacity-55 sm:right-8 sm:top-8 sm:w-24" aria-hidden="true">
                <img src={assetUrl('/assets/brand/summit-mountain-symbol.webp')} width="480" height="388" alt="" loading="lazy" decoding="async" />
              </div>
              <div className="featured-project-gallery__controls absolute inset-x-0 bottom-0 z-20 flex items-center justify-end gap-2 p-4 text-summit-ivory sm:p-5">
                <button
                  data-magnetic
                  type="button"
                  onClick={showPreviousImage}
                  aria-label={locale === 'en' ? `Show previous photograph of ${activePortfolioProject.title.en}` : `عرض الصورة السابقة لمشروع ${activePortfolioProject.title.ar}`}
                  className="featured-project-gallery__button icon-control grid size-9 place-items-center border border-white/35 bg-black/20 text-white backdrop-blur-sm transition-colors hover:border-summit-gold hover:bg-summit-gold hover:text-summit-black"
                >
                  <Icon name="arrow-left" size={15} />
                </button>
                <button
                  data-magnetic
                  type="button"
                  onClick={showNextImage}
                  aria-label={locale === 'en' ? `Show next photograph of ${activePortfolioProject.title.en}` : `عرض الصورة التالية لمشروع ${activePortfolioProject.title.ar}`}
                  className="featured-project-gallery__button icon-control grid size-9 place-items-center border border-white/35 bg-black/20 text-white backdrop-blur-sm transition-colors hover:border-summit-gold hover:bg-summit-gold hover:text-summit-black"
                >
                  <Icon name="arrow-right" size={15} />
                </button>
                <p className="font-display text-sm tabular-nums sm:text-base" aria-hidden="true">
                  <span className="text-summit-gold">{formatNumber(activeImageIndex)}</span>
                  <span className="mx-2 text-white/50">/</span>
                  {formatNumber(activeProject.images.length - 1)}
                </p>
              </div>
            </div>

            <div className="featured-project-summary grid gap-4 border-b border-[var(--color-border)] py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-6">
              <div className="min-w-0">
                <p data-project-active-copy className="flex items-center gap-2 font-body text-[0.625rem] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  <Icon name={activeProjectIndex === 0 ? 'restoration' : activeProjectIndex === 1 ? 'construction' : 'renovation'} size={16} />
                  {locale === 'ar' ? featuredCategoryLabels[activeProject.category] : activeProject.category}
                </p>
                <h3 data-project-active-copy className="featured-project-summary__title project-title mt-2 max-w-3xl font-display text-[clamp(1.65rem,3vw,2.8rem)] font-medium leading-[1.02] tracking-[-0.045em] text-[var(--color-ink)]">
                  {activePortfolioProject.title[locale]}
                </h3>
                <p data-project-active-copy className="featured-project-summary__description mt-3 max-w-2xl font-body text-sm leading-6 text-[var(--color-muted)]">
                  {activePortfolioProject.description?.[locale]}
                </p>
              </div>

              <a data-project-active-copy data-magnetic className="text-link featured-project-summary__link" href={routePath(locale, 'project-detail', activePortfolioProject.slug)}>
                {copy.explore}<span aria-hidden="true">↗</span>
              </a>
            </div>

            <div className="featured-project-thumbnails mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${activeProject.images.length}, minmax(0, 1fr))` }} aria-label={locale === 'en' ? `Choose a photograph of ${activePortfolioProject.title.en}` : `اختر صورة لمشروع ${activePortfolioProject.title.ar}`}>
              {activeProject.images.map((image, imageIndex) => {
                const isActive = activeImageIndex === imageIndex
                return (
                  <button
                    key={image.src}
                    type="button"
                    onClick={() => selectImage(imageIndex)}
                    aria-label={locale === 'en' ? `Show photograph ${imageIndex + 1}` : `عرض الصورة ${imageIndex + 1}`}
                    aria-pressed={isActive}
                    className={`group relative min-h-9 border-t pt-2 text-start transition-colors ${isActive ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)] hover:border-[var(--color-ink)]'}`}
                  >
                    <span className={`font-body text-[0.5625rem] font-bold tracking-[0.16em] ${isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
                      {formatNumber(imageIndex)}
                    </span>
                    <span className="sr-only">
                      {locale === 'en' ? `Photograph ${formatNumber(imageIndex)}` : `صورة ${formatNumber(imageIndex)}`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Container>

      <Container className="relative z-10 mt-6 flex justify-end">
        <a data-magnetic className="text-link" href={routePath(locale, 'projects')}>{copy.all}<span aria-hidden="true">↗</span></a>
      </Container>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {activeProject.title.en}, photograph {activeImageIndex + 1} of {activeProject.images.length}.
      </p>
      <p role="status" aria-live="polite" className={loadMessage ? 'mx-auto mt-5 max-w-xl px-5 text-center font-body text-sm text-[var(--color-muted)]' : 'sr-only'}>
        {loadMessage || (isLoading ? 'Preparing photograph. Your current view remains visible.' : '')}
      </p>
    </section>
  )
}
