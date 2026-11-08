import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Container } from '../ui/Container'
import { assetSrcSet, assetUrl } from '../../lib/assets'
import { SectionHeading } from '../ui/SectionHeading'
import { Icon, type IconName } from '../ui/Icon'
import { useHomeCopy, useLocale } from '../../content/site'
import { routePath } from '../../lib/routes'

gsap.registerPlugin(ScrollTrigger)

type Service = {
  slug: 'restoration' | 'renovation' | 'fit-out' | 'construction'
  icon: IconName
  image: string
  srcSet: string
  alt: string
  imagePosition: string
  width: number
  height: number
}

const services: Service[] = [
  {
    slug: 'restoration',
    icon: 'restoration',
    image: '/assets/projects/portfolio/mohamed-ali-palace/01-1202.webp',
    srcSet: '/assets/projects/portfolio/mohamed-ali-palace/01-720.webp 720w, /assets/projects/portfolio/mohamed-ali-palace/01-1202.webp 1202w',
    alt: 'Restored interior at Mohamed Ali Palace',
    imagePosition: 'object-center',
    width: 1202,
    height: 1309,
  },
  {
    slug: 'renovation',
    icon: 'renovation',
    image: '/assets/projects/portfolio/lakeview-residence/03-1206.webp',
    srcSet: '/assets/projects/portfolio/lakeview-residence/03-720.webp 720w, /assets/projects/portfolio/lakeview-residence/03-1206.webp 1206w',
    alt: 'Completed residential interior at Lakeview Residence',
    imagePosition: 'object-center',
    width: 1206,
    height: 1304,
  },
  {
    slug: 'fit-out',
    icon: 'renovation',
    image: '/assets/projects/portfolio/bcbg/01-1231.webp',
    srcSet: '/assets/projects/portfolio/bcbg/01-720.webp 720w, /assets/projects/portfolio/bcbg/01-1231.webp 1231w',
    alt: 'Completed BCBG retail storefront and interior',
    imagePosition: 'object-center',
    width: 1231,
    height: 1277,
  },
  {
    slug: 'construction',
    icon: 'construction',
    image: '/assets/projects/portfolio/new-capital-administrations-district/01-1312.webp',
    srcSet: '/assets/projects/portfolio/new-capital-administrations-district/01-720.webp 720w, /assets/projects/portfolio/new-capital-administrations-district/01-1312.webp 1312w',
    alt: 'Administrative building under construction in the New Capital Administrations District',
    imagePosition: 'object-center',
    width: 1312,
    height: 1199,
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

        <div className="home-services-grid mt-12 pb-8 sm:mt-16 lg:mt-20 lg:pb-12">
          {services.map((service, index) => (
            <article
              key={service.slug}
              data-service-panel
              className="home-service-card group"
            >
              <a href={routePath(locale, 'service-detail', service.slug)} className="home-service-card__link" aria-label={copy.cards[index].name}>
              <div className="absolute inset-0 overflow-hidden bg-summit-black" aria-hidden="true">
                <div data-service-reveal className="size-full">
                  <div data-service-image-motion className="size-full">
                    <img
                      src={assetUrl(service.image)}
                      srcSet={assetSrcSet(service.srcSet)}
                      sizes="(max-width: 767px) 50vw, (max-width: 1199px) 50vw, 25vw"
                      width={service.width}
                      height={service.height}
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

              <div className="service-brand-mark home-service-card__brand" aria-hidden="true">
                <img
                  src={assetUrl('/assets/brand/summit-mountain-symbol.webp')}
                  width="480"
                  height="388"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <div className="home-service-card__content">
                <span data-service-copy className="home-service-card__index"><Icon name={service.icon} size={20} />0{index + 1}</span>

                <div>
                  <p data-service-copy className="home-service-card__label">{copy.formal}</p>
                  <h3 data-service-copy className="home-service-card__title">
                    {copy.cards[index].name}
                  </h3>
                  <p data-service-copy className="home-service-card__description">
                    {copy.cards[index].description}
                  </p>
                  <p data-service-copy className="home-service-card__scope">
                    {copy.cards[index].scope}
                  </p>
                </div>
              </div>
              </a>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
