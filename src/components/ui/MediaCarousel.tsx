import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { assetSrcSet, assetUrl } from '../../lib/assets'

export type CarouselMedia = {
  id: string
  src: string
  srcSet?: string
  alt: string
  width?: number
  height?: number
  fit?: 'cover' | 'contain'
  position?: string
}

type MediaCarouselProps = {
  images: CarouselMedia[]
  locale: 'en' | 'ar'
  label: string
  className?: string
  onSelect?: (index: number) => void
}

type CarouselCopy = { image: CarouselMedia; logicalIndex: number; copy: 'prefix' | 'main' | 'suffix'; key: string }

const mod = (value: number, length: number) => ((value % length) + length) % length

export function MediaCarousel({ images, locale, label, className = '', onSelect }: MediaCarouselProps) {
  const rootRef = useRef<HTMLElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const stepRef = useRef(0)
  const mainStartRef = useRef(0)
  const currentRef = useRef(0)
  const normalizeTimerRef = useRef<number | null>(null)
  const resumeTimerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const dragRef = useRef({ pointerId: -1, startX: 0, startScroll: 0, moved: false })
  const holdsRef = useRef(new Set<string>())
  const eligibilityRef = useRef(false)
  const resumeImmediatelyRef = useRef(false)
  const [current, setCurrent] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [interactionPaused, setInteractionPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const [tabVisible, setTabVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible')
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const rtl = locale === 'ar'
  const imageSignature = images.map((image) => image.id).join('|')
  const cloneCount = Math.min(4, images.length)
  const prefix = images.slice(-cloneCount).map((image, index) => ({ image, logicalIndex: images.length - cloneCount + index, copy: 'prefix' as const, key: `prefix-${image.id}-${index}` }))
  const main = images.map((image, index) => ({ image, logicalIndex: index, copy: 'main' as const, key: `main-${image.id}-${index}` }))
  const suffix = images.slice(0, cloneCount).map((image, index) => ({ image, logicalIndex: index, copy: 'suffix' as const, key: `suffix-${image.id}-${index}` }))
  const carouselItems: CarouselCopy[] = images.length > 1 ? [...prefix, ...main, ...suffix] : main

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = null
  }, [])

  const scheduleResume = useCallback(() => {
    clearResumeTimer()
    if (holdsRef.current.size) return
    resumeTimerRef.current = window.setTimeout(() => {
      resumeTimerRef.current = null
      resumeImmediatelyRef.current = eligibilityRef.current
      setInteractionPaused(false)
    }, 5000)
  }, [clearResumeTimer])

  const beginInteraction = useCallback((kind?: string) => {
    if (kind) holdsRef.current.add(kind)
    clearResumeTimer()
    resumeImmediatelyRef.current = false
    setInteractionPaused(true)
  }, [clearResumeTimer])

  const endInteraction = useCallback((kind?: string) => {
    if (kind) holdsRef.current.delete(kind)
    scheduleResume()
  }, [scheduleResume])

  const interruptBriefly = useCallback(() => {
    beginInteraction()
    scheduleResume()
  }, [beginInteraction, scheduleResume])

  const measure = useCallback((preserveCurrent = true) => {
    const viewport = viewportRef.current
    if (!viewport || !images.length) return
    const track = viewport.querySelector<HTMLElement>('.media-carousel__track')
    const mainItems = [...viewport.querySelectorAll<HTMLElement>('[data-carousel-copy="main"]')]
    const first = mainItems[0]
    if (!track || !first) return
    const next = mainItems[1]
    const styles = window.getComputedStyle(track)
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0
    const step = next ? next.offsetLeft - first.offsetLeft : first.getBoundingClientRect().width + gap
    const mainStart = first.offsetLeft - track.offsetLeft
    stepRef.current = step
    mainStartRef.current = mainStart
    const logicalIndex = preserveCurrent ? currentRef.current : 0
    viewport.scrollTo({ left: mainStart + logicalIndex * step, behavior: 'auto' })
  }, [images.length])

  const updateCurrentFromScroll = useCallback(() => {
    const viewport = viewportRef.current
    const step = stepRef.current
    if (!viewport || !step || !images.length) return
    const physical = Math.round((viewport.scrollLeft - mainStartRef.current) / step)
    const logical = mod(physical, images.length)
    if (currentRef.current !== logical) {
      currentRef.current = logical
      setCurrent(logical)
    }
  }, [images.length])

  const normalizeLoop = useCallback(() => {
    const viewport = viewportRef.current
    const step = stepRef.current
    if (!viewport || !step || images.length <= 1) return
    const mainStart = mainStartRef.current
    const mainEnd = mainStart + images.length * step
    if (viewport.scrollLeft < mainStart - step * .25) {
      viewport.scrollTo({ left: viewport.scrollLeft + images.length * step, behavior: 'auto' })
    } else if (viewport.scrollLeft >= mainEnd - step * .25) {
      viewport.scrollTo({ left: viewport.scrollLeft - images.length * step, behavior: 'auto' })
    }
    updateCurrentFromScroll()
  }, [images.length, updateCurrentFromScroll])

  const handleScroll = useCallback(() => {
    updateCurrentFromScroll()
    if (normalizeTimerRef.current !== null) window.clearTimeout(normalizeTimerRef.current)
    normalizeTimerRef.current = window.setTimeout(normalizeLoop, 120)
  }, [normalizeLoop, updateCurrentFromScroll])

  const move = useCallback((direction: number) => {
    const viewport = viewportRef.current
    const step = stepRef.current
    if (!viewport || !step || images.length <= 1) return
    const physical = Math.round((viewport.scrollLeft - mainStartRef.current) / step)
    viewport.scrollTo({ left: mainStartRef.current + (physical + direction) * step, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [images.length, reducedMotion])

  useLayoutEffect(() => {
    currentRef.current = 0
    setCurrent(0)
    measure(false)
    const frame = window.requestAnimationFrame(() => measure(false))
    return () => window.cancelAnimationFrame(frame)
  }, [imageSignature, measure])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= .15), { threshold: [.15] })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(() => measure())
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [measure])

  useEffect(() => {
    const handleVisibility = () => setTabVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleMotion = () => setReducedMotion(query.matches)
    query.addEventListener('change', handleMotion)
    return () => query.removeEventListener('change', handleMotion)
  }, [])

  const eligible = visible && tabVisible && !reducedMotion && images.length > 1
  eligibilityRef.current = eligible
  useEffect(() => {
    if (!eligible || interactionPaused) return
    if (resumeImmediatelyRef.current) {
      resumeImmediatelyRef.current = false
      move(1)
    }
    const interval = window.setInterval(() => move(1), 4000)
    return () => window.clearInterval(interval)
  }, [eligible, interactionPaused, move])

  useEffect(() => () => {
    clearResumeTimer()
    if (normalizeTimerRef.current !== null) window.clearTimeout(normalizeTimerRef.current)
  }, [clearResumeTimer])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    beginInteraction('pointer')
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
    const viewport = event.currentTarget
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScroll: viewport.scrollLeft, moved: false }
    viewport.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag.pointerId !== event.pointerId || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const delta = event.clientX - drag.startX
    if (Math.abs(delta) > 5) drag.moved = true
    event.currentTarget.scrollLeft = drag.startScroll - delta
  }

  const finishPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget
    const drag = dragRef.current
    if (drag.pointerId === event.pointerId && viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId)
    suppressClickRef.current = drag.moved
    dragRef.current = { pointerId: -1, startX: 0, startScroll: 0, moved: false }
    setDragging(false)
    endInteraction('pointer')
    window.setTimeout(() => { suppressClickRef.current = false }, 0)
  }

  const select = (index: number) => {
    if (suppressClickRef.current) return
    interruptBriefly()
    onSelect?.(index)
  }

  const status = reducedMotion ? 'disabled' : eligible && !interactionPaused ? 'running' : 'paused'
  const previousLabel = locale === 'en' ? 'Previous photographs' : 'الصور السابقة'
  const nextLabel = locale === 'en' ? 'Next photographs' : 'الصور التالية'

  return <section ref={rootRef} className={`media-carousel ${className}`.trim()} dir={rtl ? 'rtl' : 'ltr'} role="region" aria-roledescription="carousel" aria-label={label} data-carousel-current={current + 1} data-carousel-autoplay={status} data-carousel-visible={visible ? 'true' : 'false'}>
    <div className="media-carousel__toolbar">
      <p className="media-carousel__counter" aria-live={interactionPaused ? 'polite' : 'off'}><span>{String(current + 1).padStart(2, '0')}</span><i aria-hidden="true">/</i><b>{String(images.length).padStart(2, '0')}</b></p>
      {images.length > 1 ? <div className="media-carousel__controls">
        <button type="button" onClick={() => { interruptBriefly(); move(-1) }} aria-label={previousLabel}>{rtl ? '→' : '←'}</button>
        <button type="button" onClick={() => { interruptBriefly(); move(1) }} aria-label={nextLabel}>{rtl ? '←' : '→'}</button>
      </div> : null}
    </div>
    <div
      ref={viewportRef}
      className={`media-carousel__viewport${dragging ? ' is-dragging' : ''}`}
      dir="ltr"
      tabIndex={0}
      onScroll={handleScroll}
      onWheel={interruptBriefly}
      onMouseEnter={() => beginInteraction('hover')}
      onMouseLeave={() => endInteraction('hover')}
      onFocusCapture={() => beginInteraction('focus')}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) endInteraction('focus') }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        interruptBriefly()
        const direction = event.key === 'ArrowRight' ? (rtl ? -1 : 1) : (rtl ? 1 : -1)
        move(direction)
      }}
    >
      <div className="media-carousel__track">
        {carouselItems.map(({ image, logicalIndex, copy, key }) => <div className="media-carousel__item" data-carousel-copy={copy} data-carousel-index={logicalIndex} aria-hidden={copy === 'main' ? undefined : true} key={key}>
          {onSelect ? <button type="button" className="media-carousel__frame" tabIndex={copy === 'main' ? 0 : -1} onClick={() => select(logicalIndex)} aria-label={image.alt}>
            <img src={assetUrl(image.src)} srcSet={image.srcSet ? assetSrcSet(image.srcSet) : undefined} sizes="(max-width: 560px) 78vw, (max-width: 980px) 46vw, 31vw" alt={copy === 'main' ? image.alt : ''} width={image.width ?? 1400} height={image.height ?? 933} loading="lazy" fetchPriority="low" decoding="async" draggable="false" style={{ objectFit: image.fit ?? 'cover', objectPosition: image.position ?? 'center' }} />
          </button> : <figure className="media-carousel__frame">
            <img src={assetUrl(image.src)} srcSet={image.srcSet ? assetSrcSet(image.srcSet) : undefined} sizes="(max-width: 560px) 78vw, (max-width: 980px) 46vw, 31vw" alt={copy === 'main' ? image.alt : ''} width={image.width ?? 1400} height={image.height ?? 933} loading="lazy" fetchPriority="low" decoding="async" draggable="false" style={{ objectFit: image.fit ?? 'cover', objectPosition: image.position ?? 'center' }} />
          </figure>}
        </div>)}
      </div>
    </div>
  </section>
}
