import { useEffect } from 'react'

const MAX_OFFSET = 5

/** Small pointer-only movement for primary controls. Keyboard and touch behavior stay unchanged. */
export function useMagneticControls() {
  useEffect(() => {
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!pointer.matches || reducedMotion.matches) return

    const controls = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'))
    const cleanups = controls.map((control) => {
      const move = (event: PointerEvent) => {
        const bounds = control.getBoundingClientRect()
        const x = ((event.clientX - bounds.left) / bounds.width - .5) * MAX_OFFSET * 2
        const y = ((event.clientY - bounds.top) / bounds.height - .5) * MAX_OFFSET * 2
        control.style.setProperty('--magnetic-x', `${x.toFixed(2)}px`)
        control.style.setProperty('--magnetic-y', `${y.toFixed(2)}px`)
      }
      const reset = () => {
        control.style.setProperty('--magnetic-x', '0px')
        control.style.setProperty('--magnetic-y', '0px')
      }
      control.addEventListener('pointermove', move)
      control.addEventListener('pointerleave', reset)
      control.addEventListener('blur', reset)
      return () => {
        control.removeEventListener('pointermove', move)
        control.removeEventListener('pointerleave', reset)
        control.removeEventListener('blur', reset)
      }
    })

    return () => cleanups.forEach((cleanup) => cleanup())
  }, [])
}
