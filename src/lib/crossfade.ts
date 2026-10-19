import gsap from 'gsap'

type CrossfadeOptions = {
  outgoing: HTMLElement
  incoming: HTMLElement
  image?: HTMLImageElement | null
  duration?: number
  scale?: number
  paused?: boolean
  onComplete: () => void
}

/** The decoded incoming plane fades over a full-opacity, mounted backdrop. */
export function createImageCrossfade({
  outgoing,
  incoming,
  image,
  duration = 1.08,
  scale = 1.04,
  paused = false,
  onComplete,
}: CrossfadeOptions): gsap.core.Timeline {
  gsap.set(outgoing, { opacity: 1, visibility: 'visible', clipPath: 'none', zIndex: 1 })
  gsap.set(incoming, { opacity: 0, visibility: 'visible', clipPath: 'none', zIndex: 2, willChange: 'opacity' })
  if (image) gsap.set(image, { scale, xPercent: 0, visibility: 'visible' })

  const timeline = gsap.timeline({
    paused,
    onComplete: () => {
      gsap.set(incoming, { opacity: 1, willChange: 'auto' })
      gsap.set(outgoing, { opacity: 0, zIndex: 0 })
      onComplete()
    },
  })
  timeline.to(incoming, { opacity: 1, duration, ease: 'power2.inOut' }, 0)
  if (image) timeline.to(image, { scale: 1, duration, ease: 'power2.out' }, 0)
  return timeline
}
