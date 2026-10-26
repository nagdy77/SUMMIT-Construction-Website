import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Container } from '../ui/Container'
import { assetSrcSet, assetUrl } from '../../lib/assets'
import { useHomeCopy, useLocale } from '../../content/site'

gsap.registerPlugin(ScrollTrigger)

export function AboutPreview() {
  const locale = useLocale()
  const copy = useHomeCopy().about
  const facts = locale === 'en'
    ? [{ label: 'Established', value: '2018' }, { label: 'Founders', value: 'Ahmed Elesawy & Mohamed Haron' }, { label: 'Origin', value: 'Egypt' }]
    : [{ label: 'التأسيس', value: '2018' }, { label: 'المؤسسون', value: 'أحمد العيسوي ومحمد هارون' }, { label: 'الموطن', value: 'مصر' }]
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const media = gsap.matchMedia()

    media.add('(prefers-reduced-motion: no-preference)', () => {
      const copy = gsap.utils.toArray<HTMLElement>('[data-about-copy]', section)
      const imageReveal = section.querySelector<HTMLElement>('[data-about-reveal]')
      const imageMotion = section.querySelector<HTMLElement>('[data-about-image-motion]')
      const geometry = section.querySelector<HTMLElement>('[data-about-geometry]')
      const facts = gsap.utils.toArray<HTMLElement>('[data-about-fact]', section)

      gsap.from(copy, {
        autoAlpha: 0,
        y: 42,
        duration: 1,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 72%',
          once: true,
        },
      })

      if (imageReveal && imageMotion) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: imageReveal,
              start: 'top 78%',
              once: true,
            },
          })
          .from(imageReveal, { xPercent: -101, duration: 1.35, ease: 'power4.inOut' })
          .from(imageMotion, { xPercent: 101, scale: 1.1, duration: 1.35, ease: 'power4.inOut' }, 0)
          .from(geometry, { autoAlpha: 0, scale: 0.92, x: 20, duration: 0.9, ease: 'power3.out' }, 0.65)
      }

      gsap.from(facts, {
        autoAlpha: 0,
        y: 24,
        duration: 0.75,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: facts[0],
          start: 'top 88%',
          once: true,
        },
      })
    })

    return () => media.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="about"
      aria-label={locale === 'en' ? 'About SUMMIT Construction' : 'عن شركة سوميت للإنشاءات'}
      className="about-section relative overflow-hidden bg-[var(--color-page)] py-section-lg text-[var(--color-ink)]"
    >
      <div className="absolute right-0 top-0 hidden h-full w-px bg-summit-line lg:block" aria-hidden="true" />

      <Container>
        <header className="grid gap-8 lg:grid-cols-12 lg:gap-6">
          <div data-about-copy className="lg:col-span-3">
            <p className="flex items-center gap-3 font-body text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-summit-gold">
              <span className="h-px w-8 bg-summit-gold" aria-hidden="true" />
              {copy.eyebrow}
            </p>
          </div>

          <h2
            data-about-copy
            className="max-w-[13ch] font-display text-[clamp(2.6rem,6.8vw,6.9rem)] font-medium leading-[0.98] tracking-[-0.055em] text-[var(--color-ink)] lg:col-span-9"
          >
            {copy.title[0]}
            <span className="editorial-accent block text-[var(--color-accent)]">{copy.title[1]}</span>
            <span className="block">{copy.title[2]}</span>
          </h2>
        </header>

        <div className="mt-16 grid gap-12 sm:mt-20 lg:mt-28 lg:grid-cols-12 lg:gap-6">
          <div className="relative lg:col-span-7 lg:col-start-2">
            <div className="absolute -left-4 top-10 hidden h-[72%] w-px bg-summit-gold lg:block" aria-hidden="true" />
            <div className="absolute -left-4 top-10 hidden h-px w-20 bg-summit-gold lg:block" aria-hidden="true" />

            <div className="overflow-hidden [clip-path:polygon(0_0,100%_0,100%_91%,91%_100%,0_100%)]">
              <div data-about-reveal className="h-full w-full">
                <div data-about-image-motion className="h-full w-full">
                  <img
                    src={assetUrl('/assets/projects/featured/real-media/about-workmanship-portrait-1122.webp')}
                    srcSet={assetSrcSet('/assets/projects/featured/real-media/about-workmanship-portrait-640.webp 640w, /assets/projects/featured/real-media/about-workmanship-portrait-960.webp 960w, /assets/projects/featured/real-media/about-workmanship-portrait-1122.webp 1122w')}
                    sizes="(max-width: 767px) 100vw, 54vw"
                    width="1122"
                    height="1403"
                    alt={locale === 'en' ? 'SUMMIT worker installing wall insulation at Wajha Office' : 'عامل من سوميت ينفذ أعمال العزل في مكتب وجهة'}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/5] size-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div
              data-about-geometry
              className="absolute -bottom-10 -right-4 hidden size-52 text-summit-gold lg:block xl:-right-16 xl:size-64"
              aria-hidden="true"
            >
              <svg viewBox="0 0 260 220" fill="none" className="size-full">
                <path d="M14 204 104 22l90 182H14Z" stroke="currentColor" strokeWidth="1.2" />
                <path d="m82 204 63-127 63 127H82Z" stroke="currentColor" strokeWidth="1.2" />
                <path d="m148 204 42-82 42 82h-84Z" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </div>

            <div className="absolute -bottom-6 left-5 bg-summit-charcoal px-5 py-4 text-summit-ivory sm:left-8 sm:px-7 sm:py-5">
              <span className="block font-body text-[0.5625rem] font-bold uppercase tracking-[0.2em] text-summit-gold">{copy.established}</span>
              <span className="mt-1 block font-display text-2xl font-medium tracking-[-0.04em] sm:text-3xl">2018</span>
            </div>
          </div>

          <div className="flex flex-col justify-end pt-8 lg:col-span-4 lg:col-start-9 lg:pt-28">
            <p data-about-copy className="font-display text-2xl font-medium leading-tight tracking-[-0.04em] text-[var(--color-ink)] sm:text-3xl">
              {copy.strapline}
            </p>
            <p data-about-copy className="mt-7 max-w-md font-body text-sm leading-7 text-[var(--color-muted)] sm:text-base">
              {copy.body}
            </p>

            <dl className="mt-10 border-t border-[var(--color-border)]">
              {facts.map((fact, index) => (
                <div
                  key={fact.label}
                  data-about-fact
                  className="grid grid-cols-[auto_1fr] gap-4 border-b border-[var(--color-border)] py-5"
                >
                  <dt className="font-body text-[0.625rem] font-bold uppercase tracking-[0.18em] text-summit-gold">0{index + 1} · {fact.label}</dt>
                  <dd className="justify-self-end text-right font-body text-xs font-semibold leading-5 text-[var(--color-ink)] sm:text-sm">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </section>
  )
}
