import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { assetUrl } from '../../lib/assets'

const INTRO_SESSION_KEY = 'summit-intro-seen'
const ESSENTIAL_ASSET_WAIT_MS = 1200
const MINIMUM_INTRO_MS = 1050

type EntranceIntroProps = {
  onRevealHero: () => void
  onComplete: () => void
}

type ImageResult = 'loaded' | 'failed' | 'timeout'

export function shouldPlayEntrance() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false

  try {
    return window.sessionStorage.getItem(INTRO_SESSION_KEY) !== 'true'
  } catch {
    return true
  }
}

function waitForImage(image: HTMLImageElement | null, timeoutMs: number): Promise<ImageResult> {
  if (!image) return Promise.resolve('failed')
  if (image.complete) return Promise.resolve(image.naturalWidth > 0 ? 'loaded' : 'failed')

  return new Promise((resolve) => {
    let settled = false

    const finish = (result: ImageResult) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      image.removeEventListener('load', handleLoad)
      image.removeEventListener('error', handleError)
      resolve(result)
    }

    const handleLoad = () => finish('loaded')
    const handleError = () => finish('failed')
    const timeout = window.setTimeout(() => finish('timeout'), timeoutMs)

    image.addEventListener('load', handleLoad, { once: true })
    image.addEventListener('error', handleError, { once: true })
  })
}

export function EntranceIntro({ onRevealHero, onComplete }: EntranceIntroProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLImageElement>(null)
  const revealedRef = useRef(false)
  const completedRef = useRef(false)
  const restoreOverflowRef = useRef<() => void>(() => undefined)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) {
      onRevealHero()
      onComplete()
      return
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    let minimumElapsed = false
    let assetsSettled = false
    let exitStarted = false
    let disposed = false

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    restoreOverflowRef.current = () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }

    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, 'true')
    } catch {
      // The entrance still works when session storage is unavailable.
    }

    const revealHero = () => {
      if (revealedRef.current) return
      revealedRef.current = true
      onRevealHero()
    }

    const complete = () => {
      if (completedRef.current) return
      completedRef.current = true
      restoreOverflowRef.current()
      onComplete()
    }

    const exit = (duration = 0.55) => {
      if (exitStarted || disposed) return
      exitStarted = true
      revealHero()

      gsap.to(root, {
        autoAlpha: 0,
        duration,
        ease: 'power3.inOut',
        onComplete: complete,
      })
    }

    const attemptExit = () => {
      if (minimumElapsed && assetsSettled) exit()
    }

    const skip = () => {
      gsap.killTweensOf(root.querySelectorAll('*'))
      gsap.killTweensOf(root)
      exit(0.18)
    }

    const handleMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) skip()
    }

    const context = gsap.context(() => {
      const logoMask = root.querySelector<HTMLElement>('[data-intro-logo-mask]')
      const logo = root.querySelector<HTMLElement>('[data-intro-logo]')
      const mountainLines = root.querySelectorAll<SVGPathElement>('[data-intro-mountain-line]')
      const horizon = root.querySelector<HTMLElement>('[data-intro-horizon]')
      const label = root.querySelector<HTMLElement>('[data-intro-label]')

      gsap.set(logoMask, { clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)' })
      gsap.set(logo, { autoAlpha: 0, scale: 1.025 })
      gsap.set(mountainLines, { strokeDasharray: 420, strokeDashoffset: 420, autoAlpha: 0.75 })
      gsap.set(horizon, { scaleX: 0, transformOrigin: 'center center' })
      gsap.set(label, { autoAlpha: 0, y: 8 })

      gsap
        .timeline()
        .to(mountainLines, { strokeDashoffset: 0, duration: 0.72, stagger: 0.07, ease: 'power2.inOut' }, 0)
        .to(logoMask, { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', duration: 0.78, ease: 'power3.inOut' }, 0.12)
        .to(logo, { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'power3.out' }, 0.16)
        .to(horizon, { scaleX: 1, duration: 0.68, ease: 'power3.inOut' }, 0.28)
        .to(label, { autoAlpha: 1, y: 0, duration: 0.48, ease: 'power2.out' }, 0.48)
    }, root)

    const minimumTimer = window.setTimeout(() => {
      minimumElapsed = true
      attemptExit()
    }, MINIMUM_INTRO_MS)

    const safetyTimer = window.setTimeout(() => {
      revealHero()
      gsap.set(root, { autoAlpha: 0 })
      complete()
    }, 2200)

    Promise.all([
      waitForImage(logoRef.current, ESSENTIAL_ASSET_WAIT_MS),
      waitForImage(document.querySelector<HTMLImageElement>('#summit-first-hero-image'), ESSENTIAL_ASSET_WAIT_MS),
    ])
      .catch(() => ['failed', 'failed'] as ImageResult[])
      .then(() => {
        assetsSettled = true
        attemptExit()
      })

    const skipButton = root.querySelector<HTMLButtonElement>('[data-skip-intro]')
    skipButton?.addEventListener('click', skip)
    motionQuery.addEventListener('change', handleMotionChange)

    if (motionQuery.matches) skip()

    return () => {
      disposed = true
      window.clearTimeout(minimumTimer)
      window.clearTimeout(safetyTimer)
      skipButton?.removeEventListener('click', skip)
      motionQuery.removeEventListener('change', handleMotionChange)
      context.revert()
      gsap.killTweensOf(root)
      restoreOverflowRef.current()
    }
  }, [onComplete, onRevealHero])

  return (
    <div
      ref={rootRef}
      className="entrance-intro fixed inset-0 z-[100] grid min-h-[100svh] place-items-center overflow-hidden text-summit-ivory"
      aria-label="SUMMIT Construction introduction"
    >
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(213,180,82,0.12),transparent_38%)]" />
        <div className="absolute inset-x-[10%] inset-y-0 border-x border-white/[0.055] sm:inset-x-[20%]" />
      </div>

      <div className="relative flex w-full max-w-[32rem] flex-col items-center px-8 sm:px-12">
        <svg className="absolute left-1/2 top-1/2 h-[13rem] w-[22rem] -translate-x-1/2 -translate-y-[60%] opacity-25 sm:h-[17rem] sm:w-[30rem]" viewBox="0 0 480 280" fill="none" aria-hidden="true">
          <path data-intro-mountain-line d="M42 226 180 45l92 181" stroke="currentColor" strokeWidth="1" />
          <path data-intro-mountain-line d="m174 226 98-132 104 132" stroke="currentColor" strokeWidth="1" />
          <path data-intro-mountain-line d="m282 226 60-78 96 78" stroke="currentColor" strokeWidth="1" />
        </svg>

        <div data-intro-logo-mask className="relative w-full max-w-[15rem] overflow-hidden sm:max-w-[18rem]">
          <img
            ref={logoRef}
            data-intro-logo
            src={assetUrl('/assets/brand/summit-logo-gold-intro.webp')}
            alt="SUMMIT Construction"
            width="627"
            height="560"
            fetchPriority="high"
            decoding="async"
            className="h-auto w-full object-contain"
          />
        </div>

        <span data-intro-horizon className="mt-5 h-px w-28 bg-summit-gold/80 sm:w-36" aria-hidden="true" />
        <p data-intro-label className="mt-5 text-center font-body text-[0.56rem] font-semibold uppercase tracking-[0.3em] text-summit-stone sm:text-[0.625rem]">
          Construction · Restoration · Renovation
        </p>
      </div>

      <button
        data-skip-intro
        type="button"
        className="absolute bottom-6 right-5 min-h-11 border-b border-white/35 px-2 py-2 font-body text-[0.625rem] font-bold uppercase tracking-[0.16em] text-summit-ivory transition-colors hover:border-summit-gold hover:text-summit-gold sm:bottom-8 sm:right-8"
      >
        Skip intro
      </button>
    </div>
  )
}
