import { useLayoutEffect, useState } from 'react'
import { useLocale } from '../../content/site'
import { WhatsAppAction } from '../contact/WhatsAppAction'
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
  const locale = useLocale()

  return (
    <div
      data-floating-controls
      data-dock-position={atHero ? 'hero-top' : 'bottom'}
      data-dock-hidden={withdrawn ? 'true' : 'false'}
      aria-hidden={withdrawn || undefined}
      inert={withdrawn}
      className={`pointer-events-none fixed inset-x-3 z-40 flex items-end justify-end sm:inset-x-6 ${atHero ? 'top-[calc(5.25rem+env(safe-area-inset-top,0px)+0.5rem)]' : 'bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]'} ${withdrawn ? 'invisible opacity-0' : 'visible opacity-100'}`}
    >
      <WhatsAppAction
        intent="general"
        compact
        className={`floating-whatsapp-action pointer-events-auto group ${focusStyle}`}
      >
        {locale === 'en' ? 'WhatsApp' : 'واتساب'}
      </WhatsAppAction>
    </div>
  )
}
