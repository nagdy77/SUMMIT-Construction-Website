import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Container } from '../ui/Container'
import { assetSrcSet, assetUrl } from '../../lib/assets'
import { useHomeCopy, useLocale } from '../../content/site'

gsap.registerPlugin(ScrollTrigger)

export function ParallaxStory() {
  const locale = useLocale()
  const copy = useHomeCopy().story
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const context = gsap.context(() => {
      const media = gsap.matchMedia()
      const field = section.querySelector<HTMLElement>('[data-story-field]')
      const frame = section.querySelector<HTMLElement>('[data-story-frame]')
      const image = section.querySelector<HTMLElement>('[data-story-foreground-image]')
      const copy = section.querySelectorAll<HTMLElement>('[data-story-copy]')

      media.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
        if (field) {
          gsap.fromTo(
            field,
            { yPercent: -5 },
            {
              yPercent: 5,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.8,
              },
            },
          )
        }

        if (image) {
          gsap.fromTo(
            image,
            { yPercent: -4, scale: 1.08 },
            {
              yPercent: 4,
              scale: 1.02,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.9,
              },
            },
          )
        }

        if (frame) {
          gsap.fromTo(
            frame,
            { clipPath: 'inset(0 0 100% 0)' },
            {
              clipPath: 'inset(0 0 0% 0)',
              duration: 1.15,
              ease: 'power3.inOut',
              scrollTrigger: { trigger: frame, start: 'top 78%', once: true },
            },
          )
        }

        gsap.from(copy, {
          y: 28,
          autoAlpha: 0,
          duration: 0.85,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: section, start: 'top 72%', once: true },
        })
      })

      media.add('(prefers-reduced-motion: no-preference) and (max-width: 767px)', () => {
        if (frame) {
          gsap.fromTo(
            frame,
            { clipPath: 'inset(0 0 100% 0)' },
            {
              clipPath: 'inset(0 0 0% 0)',
              duration: 0.9,
              ease: 'power3.inOut',
              scrollTrigger: { trigger: frame, start: 'top 82%', once: true },
            },
          )
        }

        gsap.from(copy, {
          y: 20,
          autoAlpha: 0,
          duration: 0.7,
          stagger: 0.06,
          ease: 'power3.out',
          scrollTrigger: { trigger: section, start: 'top 82%', once: true },
        })
      })
    }, section)

    return () => context.revert()
  }, [])

  return (
    <section ref={sectionRef} aria-label={copy.eyebrow} className="story-section relative isolate overflow-hidden py-section-lg text-summit-ivory">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <picture>
          <source media="(max-width: 767px)" srcSet={assetUrl('/assets/projects/featured/real-media/story-wide-mobile-720.webp')} type="image/webp" />
          <img
            data-story-field
            src={assetUrl('/assets/projects/featured/real-media/story-wide-wide-1916.webp')}
            srcSet={assetSrcSet('/assets/projects/featured/real-media/story-wide-wide-960.webp 960w, /assets/projects/featured/real-media/story-wide-wide-1440.webp 1440w, /assets/projects/featured/real-media/story-wide-wide-1916.webp 1916w')}
            sizes="100vw"
            alt=""
            width="1916"
            height="821"
            loading="lazy"
            decoding="async"
            className="absolute -top-[6%] h-[112%] w-full object-cover opacity-45"
            onError={(event) => {
              event.currentTarget.hidden = true
            }}
          />
        </picture>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,0.94)_0%,rgba(10,10,10,0.58)_52%,rgba(10,10,10,0.42)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.32)_0%,transparent_45%,rgba(10,10,10,0.88)_100%)]" />
      </div>

      <div className="pointer-events-none absolute inset-x-[var(--page-gutter)] top-8 h-px bg-summit-gold/35 lg:top-12" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-10 left-[12%] hidden size-40 rotate-45 border border-summit-gold/30 sm:block lg:size-64" aria-hidden="true" />

      <Container className="relative grid gap-10 lg:min-h-[38rem] lg:grid-cols-12 lg:items-center lg:gap-6">
        <div className="story-copy relative z-20 order-2 max-w-[48rem] lg:order-1 lg:col-span-7">
          <p data-story-copy className="flex items-center gap-3 font-body text-[0.625rem] font-bold uppercase tracking-[0.22em] text-summit-gold sm:text-[0.6875rem]">
            <span className="h-px w-8 bg-summit-gold sm:w-12" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h2 data-story-copy className="mt-6 max-w-[13ch] font-display text-[clamp(2.8rem,6.2vw,6rem)] font-medium leading-[0.98] tracking-[-0.055em]">
            {copy.title[0]} <span className="editorial-accent text-summit-gold">{copy.title[1]}</span>
          </h2>
          <p data-story-copy className="mt-7 max-w-[34rem] font-body text-sm leading-7 text-summit-stone sm:mt-9 sm:text-base sm:leading-8">
            Projects are shaped through proportion, material, and light — from the language of heritage to the precision of contemporary construction.
          </p>
        </div>

        <figure data-story-frame className="relative z-10 order-1 ml-auto h-[22rem] w-[78%] overflow-hidden border border-summit-gold/45 bg-summit-black sm:h-[30rem] sm:w-[62%] lg:order-2 lg:col-span-5 lg:h-[36rem] lg:w-full">
          <picture>
            <source media="(max-width: 767px)" srcSet={assetUrl('/assets/projects/featured/real-media/story-portrait-portrait-640.webp')} type="image/webp" />
            <img
              data-story-foreground-image
              src={assetUrl('/assets/projects/featured/real-media/story-portrait-portrait-1122.webp')}
              srcSet={assetSrcSet('/assets/projects/featured/real-media/story-portrait-portrait-640.webp 640w, /assets/projects/featured/real-media/story-portrait-portrait-960.webp 960w, /assets/projects/featured/real-media/story-portrait-portrait-1122.webp 1122w')}
              sizes="(max-width: 767px) 68vw, 30vw"
              alt={locale === 'en' ? 'Restored wooden stair and window inside Beit Al-Razzaz' : 'سلم خشبي ونافذة مرممان داخل بيت الرزاز'}
              width="1122"
              height="1403"
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
              onError={(event) => {
                event.currentTarget.hidden = true
              }}
            />
          </picture>
          <figcaption className="absolute inset-x-4 bottom-4 hidden border-t border-white/30 pt-3 font-body text-[0.5625rem] font-bold uppercase tracking-[0.18em] text-summit-ivory sm:inset-x-6 sm:bottom-6 sm:block sm:pt-4">
            {copy.caption}
          </figcaption>
        </figure>
      </Container>
    </section>
  )
}
