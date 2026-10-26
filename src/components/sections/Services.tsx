import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Container } from '../ui/Container'
import { assetSrcSet, assetUrl } from '../../lib/assets'
import { SectionHeading } from '../ui/SectionHeading'
import { Icon } from '../ui/Icon'
import { useHomeCopy, useLocale } from '../../content/site'

gsap.registerPlugin(ScrollTrigger)

type Service = {
  name: string
  image: string
  srcSet: string
  alt: string
  imagePosition: string
  description: string
  portfolioScope: string
  offset: string
}

const services: Service[] = [
  {
    name: 'Construction',
    image: '/assets/projects/featured/real-media/service-construction-portrait-960.webp',
    srcSet: '/assets/projects/featured/real-media/service-construction-portrait-640.webp 640w, /assets/projects/featured/real-media/service-construction-portrait-960.webp 960w, /assets/projects/featured/real-media/service-construction-portrait-1122.webp 1122w',
    alt: 'Ceiling and interior construction work in progress at New Capital Downtown Mall',
    imagePosition: 'object-center',
    description: 'Construction delivery across administrative and residential settings, including marble installation, full finishing, and external finishing works.',
    portfolioScope: 'Marble installation · Full finishing · External finishes',
    offset: 'lg:mt-0',
  },
  {
    name: 'Restoration',
    image: '/assets/projects/featured/real-media/service-restoration-portrait-960.webp',
    srcSet: '/assets/projects/featured/real-media/service-restoration-portrait-640.webp 640w, /assets/projects/featured/real-media/service-restoration-portrait-960.webp 960w, /assets/projects/featured/real-media/service-restoration-portrait-1122.webp 1122w',
    alt: 'SUMMIT worker polishing the marble entrance at Mohamed Ali Palace',
    imagePosition: 'object-[66%_center]',
    description: 'Heritage work spanning marble restoration, structural repair, adaptive reuse, rehabilitation, and specialist dewatering systems.',
    portfolioScope: 'Heritage restoration · Structural repair · Rehabilitation',
    offset: 'lg:mt-16',
  },
  {
    name: 'Renovation',
    image: '/assets/projects/featured/real-media/service-renovation-portrait-640.webp',
    srcSet: '/assets/projects/featured/real-media/service-renovation-portrait-480.webp 480w, /assets/projects/featured/real-media/service-renovation-portrait-640.webp 640w, /assets/projects/featured/real-media/service-renovation-portrait-847.webp 847w',
    alt: 'Finished bathroom interior at Lakeview Residence',
    imagePosition: 'object-center',
    description: 'Renovation and finishing work shaped for heritage, residential, and commercial environments, with coordinated architectural and MEP scopes.',
    portfolioScope: 'Residential fit-out · Retail fit-out · Finishing works',
    offset: 'lg:mt-6',
  },
]

export function Services() {
  const copy = useHomeCopy().services
  const locale = useLocale()
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const media = gsap.matchMedia()

    media.add('(prefers-reduced-motion: no-preference)', () => {
      const intro = section.querySelector<HTMLElement>('[data-services-intro]')
      const panels = gsap.utils.toArray<HTMLElement>('[data-service-panel]', section)
      const note = section.querySelector<HTMLElement>('[data-services-note]')

      if (intro) {
        const introItems = intro.querySelectorAll<HTMLElement>('header > p, header > div > *')
        gsap.from(introItems, {
          autoAlpha: 0,
          y: 38,
          duration: 0.95,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: intro,
            start: 'top 78%',
            once: true,
          },
        })
      }

      panels.forEach((panel, index) => {
        const reveal = panel.querySelector<HTMLElement>('[data-service-reveal]')
        const imageMotion = panel.querySelector<HTMLElement>('[data-service-image-motion]')
        const copy = panel.querySelectorAll<HTMLElement>('[data-service-copy]')

        if (!reveal || !imageMotion) return

        gsap
          .timeline({
            delay: index * 0.08,
            scrollTrigger: {
              trigger: panel,
              start: 'top 84%',
              once: true,
            },
          })
          .from(reveal, { yPercent: 101, duration: 1.2, ease: 'power4.inOut' })
          .from(imageMotion, { yPercent: -101, scale: 1.1, duration: 1.2, ease: 'power4.inOut' }, 0)
          .from(copy, { autoAlpha: 0, y: 24, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.5)
      })

      if (note) {
        gsap.from(note, {
          autoAlpha: 0,
          y: 20,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: note,
            start: 'top 92%',
            once: true,
          },
        })
      }
    })

    return () => media.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="services"
      aria-label="Services"
      className="services-section relative overflow-hidden bg-[var(--color-panel)] py-section-lg text-[var(--color-ink)]"
    >
      <div className="absolute left-[var(--page-gutter)] top-0 hidden h-full w-px bg-white/5 lg:block" aria-hidden="true" />

      <Container>
        <div data-services-intro>
          <SectionHeading
            eyebrow={copy.eyebrow}
            title={copy.title}
            description={copy.description}
            tone="light"
          />
        </div>

        <div className="mt-16 grid gap-6 pb-8 sm:mt-20 lg:mt-24 lg:grid-cols-3 lg:items-start lg:gap-5 lg:pb-16 xl:gap-8">
          {services.map((service, index) => (
            <article
              key={service.name}
              data-service-panel
              className={`group relative min-h-[38rem] overflow-hidden [clip-path:polygon(0_0,100%_0,100%_94%,94%_100%,0_100%)] sm:min-h-[44rem] lg:min-h-[42rem] ${service.offset}`}
            >
              <div className="absolute inset-0 overflow-hidden bg-summit-black">
                <div data-service-reveal className="size-full">
                  <div data-service-image-motion className="size-full">
                    <img
                      src={assetUrl(service.image)}
                      srcSet={assetSrcSet(service.srcSet)}
                      sizes="(max-width: 767px) 100vw, 33vw"
                      width={1122}
                      height={1753}
                      alt={service.alt}
                      loading="lazy"
                      decoding="async"
                      className={`size-full object-cover transition-transform duration-700 ease-summit group-hover:scale-[1.055] ${service.imagePosition}`}
                    />
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-summit-black via-summit-black/30 to-summit-black/5 transition-colors duration-700 group-hover:via-summit-black/20" />
              <div className="absolute inset-0 border border-white/15 transition-colors duration-500 group-hover:border-summit-gold/70" />
              <div className="absolute inset-y-0 left-0 w-px origin-bottom scale-y-0 bg-summit-gold transition-transform duration-700 ease-summit group-hover:scale-y-100" aria-hidden="true" />

              <div className="absolute right-5 top-5 size-20 text-summit-gold/50 transition-all duration-700 ease-summit group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-summit-gold sm:right-7 sm:top-7 sm:size-24" aria-hidden="true">
                <svg viewBox="0 0 100 90" fill="none" className="size-full">
                  <path d="M4 84 39 8l35 76H4Z" stroke="currentColor" />
                  <path d="m39 84 25-51 25 51H39Z" stroke="currentColor" />
                </svg>
              </div>

              <div className="relative z-10 flex min-h-[38rem] flex-col justify-between p-6 sm:min-h-[44rem] sm:p-8 lg:min-h-[42rem]">
                <span data-service-copy className="flex items-center gap-3 font-body text-[0.625rem] font-bold tracking-[0.2em] text-summit-gold"><Icon name={index === 0 ? 'construction' : index === 1 ? 'restoration' : 'renovation'} size={23} />0{index + 1}</span>

                <div>
                  <p data-service-copy className="mb-4 font-body text-[0.5625rem] font-bold uppercase tracking-[0.2em] text-summit-stone">{copy.formal}</p>
                  <h3 data-service-copy className="font-display text-[clamp(2rem,3.2vw,3.5rem)] font-medium leading-none tracking-[-0.05em] text-summit-ivory">
                    {copy.cards[index].name}
                  </h3>
                  <p data-service-copy className="mt-5 max-w-sm font-body text-xs leading-6 text-summit-stone sm:text-sm">
                    {copy.cards[index].description}
                  </p>
                  <p data-service-copy className="mt-6 border-t border-white/20 pt-4 font-body text-[0.5625rem] font-bold uppercase leading-5 tracking-[0.13em] text-summit-gold">
                    {copy.cards[index].scope}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div
          data-services-note
          className="mt-10 grid gap-3 border-t border-[var(--color-border)] pt-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8 lg:mt-16"
        >
          <span className="font-body text-[0.625rem] font-bold uppercase tracking-[0.18em] text-summit-gold">{copy.specialization}</span>
          <p className="font-display text-xl font-medium tracking-[-0.03em] text-[var(--color-ink)] sm:text-right sm:text-2xl">
            {locale === 'en' ? 'Residential Fit-Out' : 'التشطيب السكني'}
            <span className="mx-2 text-summit-gold">/</span>
            {locale === 'en' ? 'Retail Fit-Out' : 'التشطيب التجاري'}
          </p>
        </div>
      </Container>
    </section>
  )
}
