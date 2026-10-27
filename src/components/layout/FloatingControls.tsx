import { useLayoutEffect, useState } from 'react'
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

/** Persistent, touch-safe contact action that withdraws around interactive overlays. */
export function FloatingControls() {
  const { atHero, withdrawn } = useDockPlacement()

  return (
    <div
      data-floating-controls
      data-dock-position={atHero ? 'hero-top' : 'bottom'}
      data-dock-hidden={withdrawn ? 'true' : 'false'}
      aria-hidden={withdrawn || undefined}
      inert={withdrawn}
      className={`pointer-events-none fixed inset-x-3 z-40 flex items-end justify-end sm:inset-x-6 ${atHero ? 'top-[calc(5.25rem+env(safe-area-inset-top,0px)+0.5rem)]' : 'bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]'} ${withdrawn ? 'invisible opacity-0' : 'visible opacity-100'}`}
    >
      <a
        data-magnetic
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
  )
}
