import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PREVIEW_DISCLAIMER, PREVIEW_EXPIRES_AT } from '../../config/preview'
import { Icon } from '../ui/Icon'

const COMPANY_EMAIL = 'Projects@Summit-constructions.com'
const focusStyle = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]'

function useDockPlacement() {
  const [placement, setPlacement] = useState({ phone: false, heroVisible: true, galleryVisible: false, navigationOpen: false })

  useLayoutEffect(() => {
    const phoneQuery = window.matchMedia('(max-width: 767px)')
    const hero = document.querySelector('#top')
    const gallery = document.querySelector('[data-projects-gallery]')
    const menuButton = document.querySelector('[aria-controls="mobile-navigation"]')
    const inViewport = (element: Element | null) => {
      if (!element) return false
      const bounds = element.getBoundingClientRect()
      return bounds.bottom > 0 && bounds.top < window.innerHeight
    }
    let heroVisible = inViewport(hero)
    let galleryVisible = inViewport(gallery)
    const update = () => {
      const next = { phone: phoneQuery.matches, heroVisible, galleryVisible, navigationOpen: menuButton?.getAttribute('aria-expanded') === 'true' }
      setPlacement((previous) => Object.keys(next).every((key) => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next)
    }
    update()

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === hero) heroVisible = entry.isIntersecting
        if (entry.target === gallery) galleryVisible = entry.isIntersecting
      })
      update()
    }, { threshold: 0 })
    if (hero) observer.observe(hero)
    if (gallery) observer.observe(gallery)
    const menuObserver = new MutationObserver(update)
    if (menuButton) menuObserver.observe(menuButton, { attributes: true, attributeFilter: ['aria-expanded'] })
    phoneQuery.addEventListener('change', update)
    return () => {
      observer.disconnect()
      menuObserver.disconnect()
      phoneQuery.removeEventListener('change', update)
    }
  }, [])

  return {
    atHero: placement.heroVisible,
    withdrawn: placement.navigationOpen || placement.galleryVisible,
  }
}

function usePreviewTime() {
  const expiration = PREVIEW_EXPIRES_AT ? Date.parse(PREVIEW_EXPIRES_AT) : Number.NaN
  const configured = Number.isFinite(expiration)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!configured) return
    const update = () => setNow(Date.now())
    const timer = window.setInterval(update, 30_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
    }
  }, [configured])

  if (!configured) return null
  const remaining = Math.max(0, expiration - now)
  if (remaining === 0) return 'Review period ended. This preview remains available.'
  const minutes = Math.ceil(remaining / 60_000)
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${String(minutes % 60).padStart(2, '0')}m remaining in the review period.`
}

/** Two separate touch-safe controls and a native, keyboard-accessible preview dialog. */
export function FloatingControls() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previewButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const previewTime = usePreviewTime()
  const { atHero, withdrawn } = useDockPlacement()

  useEffect(() => {
    const dialog = dialogRef.current
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  const closePreview = () => dialogRef.current?.close()
  const openPreview = () => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    returnFocusRef.current = previewButtonRef.current
    dialog.showModal()
    closeButtonRef.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    // Header navigation can expose the same dialog while the mobile gallery
    // deliberately withdraws the floating dock.
    const handleOpen = () => {
      const dialog = dialogRef.current
      if (!dialog || dialog.open) return
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
      closeButtonRef.current?.focus({ preventScroll: true })
    }
    window.addEventListener('summit:open-preview', handleOpen)
    return () => window.removeEventListener('summit:open-preview', handleOpen)
  }, [])

  return (
    <>
      <div
        data-floating-controls
        data-dock-position={atHero ? 'hero-top' : 'bottom'}
        data-dock-hidden={withdrawn ? 'true' : 'false'}
        aria-hidden={withdrawn || undefined}
        inert={withdrawn}
        className={`pointer-events-none fixed inset-x-3 z-40 flex items-end justify-between gap-3 sm:inset-x-6 ${atHero ? 'top-[calc(5.25rem+env(safe-area-inset-top,0px)+0.5rem)]' : 'bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]'} ${withdrawn ? 'invisible opacity-0' : 'visible opacity-100'}`}
      >
        <button
          ref={previewButtonRef}
          type="button"
          onClick={openPreview}
          aria-haspopup="dialog"
          aria-controls="summit-preview-dialog"
          className={`pointer-events-auto inline-flex min-h-11 shrink-0 items-center gap-2 border border-[var(--color-accent)]/55 bg-[var(--color-elevated)] px-3 py-2.5 text-[0.56rem] font-semibold tracking-[0.13em] text-[var(--color-ink)] shadow-[0_4px_22px_#00000018] transition-[color,border-color,transform] duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] md:hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none sm:px-4 sm:text-[0.6rem] ${focusStyle}`}
        >
          <Icon name="clock" size={15} className="text-[var(--color-accent)]" />
          <span>48-HOUR PREVIEW</span>
        </button>

        <a
          href={`mailto:${COMPANY_EMAIL}`}
          aria-label={`Contact SUMMIT Construction by email at ${COMPANY_EMAIL}`}
          className={`pointer-events-auto group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border border-[var(--color-accent)]/65 bg-[var(--color-elevated)] px-3 text-[var(--color-ink)] shadow-[0_4px_22px_#00000018] transition-[background-color,color,border-color,transform] duration-200 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-ink)] motion-reduce:transform-none motion-reduce:transition-none md:gap-0 md:px-0 md:hover:-translate-y-0.5 ${focusStyle}`}
        >
          <span className="inline-flex items-center justify-center md:h-13 md:w-13"><Icon name="mail" size={20} /></span>
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] md:max-w-0 md:overflow-hidden md:whitespace-nowrap md:opacity-0 md:transition-[max-width,opacity,padding] md:duration-300 md:group-hover:max-w-32 md:group-hover:pr-5 md:group-hover:opacity-100 md:group-focus-visible:max-w-32 md:group-focus-visible:pr-5 md:group-focus-visible:opacity-100 motion-reduce:transition-none">
            Contact Us
          </span>
        </a>
      </div>

      <dialog
        ref={dialogRef}
        id="summit-preview-dialog"
        aria-labelledby="summit-preview-title"
        aria-describedby="summit-preview-description"
        onClose={() => {
          const opener = returnFocusRef.current
          if (opener?.isConnected && !opener.closest('[inert]')) opener.focus({ preventScroll: true })
          else if (!withdrawn) previewButtonRef.current?.focus({ preventScroll: true })
          else document.querySelector<HTMLButtonElement>('[aria-controls="mobile-navigation"]')?.focus({ preventScroll: true })
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return
          const bounds = event.currentTarget.getBoundingClientRect()
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closePreview()
        }}
        className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-[34rem] overflow-visible border border-[var(--color-border)] bg-[var(--color-panel)] p-0 text-[var(--color-ink)] shadow-[0_24px_100px_#00000045] backdrop:bg-black/70"
      >
        <div className="relative p-6 pt-7 sm:p-10">
          <span aria-hidden="true" className="absolute left-0 top-0 h-px w-24 bg-[var(--color-accent)]" />
          <div className="mb-8 flex items-start justify-between gap-4">
            <span className="inline-flex items-center gap-2 pt-3 text-[0.6rem] font-semibold uppercase tracking-[0.17em] text-[var(--color-accent)]"><Icon name="clock" size={16} />Private design preview</span>
            <button ref={closeButtonRef} type="button" onClick={closePreview} aria-label="Close preview notice" className={`-mr-2 -mt-2 inline-flex h-11 w-11 items-center justify-center text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent)] motion-reduce:transition-none ${focusStyle}`}><Icon name="close" size={21} /></button>
          </div>
          <h2 id="summit-preview-title" className="font-display text-[clamp(2rem,7vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.035em]">A vision in progress.</h2>
          <p id="summit-preview-description" className="mt-6 text-sm leading-[1.85] text-[var(--color-muted)] sm:text-base">{PREVIEW_DISCLAIMER}</p>
          {previewTime && <p className="mt-5 border-t border-[var(--color-border)] pt-4 text-xs leading-relaxed text-[var(--color-muted)]">{previewTime}</p>}
          <button type="button" onClick={closePreview} className={`mt-8 inline-flex min-h-12 items-center justify-center gap-8 border border-[var(--color-accent)] bg-[var(--color-accent)] px-6 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-[var(--color-accent-ink)] transition-colors hover:bg-transparent hover:text-[var(--color-ink)] motion-reduce:transition-none ${focusStyle}`}>
            Close <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </dialog>
    </>
  )
}
