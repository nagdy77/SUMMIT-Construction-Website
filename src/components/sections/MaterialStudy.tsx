import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Container } from '../ui/Container'
import { assetSrcSet, assetUrl } from '../../lib/assets'

gsap.registerPlugin(ScrollTrigger)

export function MaterialStudy() {
  const rootRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(root.querySelector('[data-material-frame]'), {
        clipPath: 'polygon(0 0,85% 0,65% 100%,0 100%)',
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: { trigger: root, start: 'top 80%', once: true },
      })
    })
    media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(root.querySelector('[data-material-image]'), { yPercent: -4 }, {
        yPercent: 4, ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
      })
    })
    return () => media.revert()
  }, [])

  return (
    <section ref={rootRef} aria-label="A study in materials" className="material-study relative overflow-hidden border-t border-[var(--color-border)] py-14 lg:py-20">
      <Container className="grid items-center gap-9 lg:grid-cols-12 lg:gap-14">
        <div className="relative lg:col-span-5">
          <p className="mb-5 text-[0.625rem] font-semibold uppercase tracking-[0.23em] text-[var(--color-accent)]">A study in materials</p>
          <h2 className="max-w-[11ch] text-[clamp(2.8rem,4.8vw,5rem)] font-medium leading-[0.98] tracking-[-0.05em]">The quiet power of <span className="editorial-accent text-[var(--color-accent)]">detail.</span></h2>
          <p className="mt-6 max-w-sm text-sm leading-7 text-[var(--color-muted)]">Heritage, structure, and the finishing touch. Three perspectives that meet in the spaces we build.</p>
        </div>
        <figure data-material-frame className="relative h-[17rem] overflow-hidden bg-summit-charcoal [clip-path:polygon(0_0,100%_0,100%_100%,0_100%)] sm:h-[24rem] lg:col-span-7 lg:h-[26rem]">
          <picture>
            <source media="(max-width: 767px)" srcSet={assetUrl('/assets/generated/parallax-02-materials-mobile.webp')} />
            <img data-material-image src={assetUrl('/assets/generated/parallax-02-materials-1440.webp')} srcSet={assetSrcSet('/assets/generated/parallax-02-materials-640.webp 640w, /assets/generated/parallax-02-materials-960.webp 960w, /assets/generated/parallax-02-materials-1440.webp 1440w, /assets/generated/parallax-02-materials.webp 1916w')} sizes="(max-width: 767px) 100vw, 60vw" alt="" width="1916" height="821" loading="lazy" decoding="async" className="absolute -top-[5%] h-[110%] w-full object-cover object-[70%_center]" />
          </picture>
          <div className="absolute inset-0 border border-summit-gold/40" aria-hidden="true" />
          <div className="absolute bottom-5 left-5 right-5 flex justify-between border-t border-white/40 pt-3 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white" aria-hidden="true"><span>Light / texture / form</span><span>SUMMIT</span></div>
        </figure>
      </Container>
    </section>
  )
}
