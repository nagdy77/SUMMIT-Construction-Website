import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ButtonLink } from '../ui/Button'
import { Container } from '../ui/Container'
import { Icon } from '../ui/Icon'
import { assetSrcSet, assetUrl } from '../../lib/assets'
import { useHomeCopy, useLocale } from '../../content/site'

gsap.registerPlugin(ScrollTrigger)

export function ContactCTA() {
  const locale = useLocale()
  const copy = useHomeCopy().contact
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const context = gsap.context(() => {
      const media = gsap.matchMedia()
      const image = section.querySelector<HTMLElement>('[data-contact-image]')
      const content = section.querySelectorAll<HTMLElement>('[data-contact-copy]')

      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(content, {
          y: 24,
          autoAlpha: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: section, start: 'top 78%', once: true },
        })

        if (image) {
          gsap.fromTo(
            image,
            { clipPath: 'inset(0 0 0 100%)', scale: 1.04 },
            {
              clipPath: 'inset(0 0 0 0%)',
              scale: 1,
              duration: 1.25,
              ease: 'power3.inOut',
              scrollTrigger: { trigger: section, start: 'top 78%', once: true },
            },
          )
        }
      })
    }, section)

    return () => context.revert()
  }, [])

  return (
    <section ref={sectionRef} id="contact" aria-label={locale === 'en' ? 'Contact SUMMIT Construction' : 'تواصل مع سوميت للإنشاءات'} className="relative isolate min-h-[clamp(38rem,80svh,60rem)] overflow-hidden bg-summit-black text-summit-ivory">
      <picture className="absolute inset-0" aria-hidden="true">
        <source media="(max-width: 767px)" srcSet={assetUrl('/assets/projects/featured/real-media/contact-work-mobile-720.webp')} type="image/webp" />
        <img
          data-contact-image
          src={assetUrl('/assets/projects/featured/real-media/contact-work-wide-1914.webp')}
          srcSet={assetSrcSet('/assets/projects/featured/real-media/contact-work-wide-960.webp 960w, /assets/projects/featured/real-media/contact-work-wide-1440.webp 1440w, /assets/projects/featured/real-media/contact-work-wide-1914.webp 1914w')}
          sizes="100vw"
          alt=""
          width="1914"
          height="822"
          loading="lazy"
          decoding="async"
          className="size-full object-cover object-[58%_center] opacity-65"
          onError={(event) => {
            event.currentTarget.hidden = true
          }}
        />
      </picture>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,0.96)_0%,rgba(10,10,10,0.8)_44%,rgba(10,10,10,0.34)_100%)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.3)_0%,transparent_48%,rgba(10,10,10,0.88)_100%)]" aria-hidden="true" />

      <div className="pointer-events-none absolute inset-y-0 right-[13%] hidden w-px bg-white/15 lg:block" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-1/2 size-72 -translate-y-1/2 rotate-45 border border-summit-gold/35 sm:size-[28rem]" aria-hidden="true" />
      <div className="pointer-events-none absolute left-[var(--page-gutter)] top-8 h-px w-24 bg-summit-gold sm:top-12 sm:w-40" aria-hidden="true" />

      <Container className="relative flex min-h-[clamp(38rem,80svh,60rem)] flex-col justify-end py-20 sm:py-28 lg:py-36">
        <div className="max-w-[56rem]">
          <p data-contact-copy className="flex items-center gap-3 font-body text-[0.625rem] font-bold uppercase tracking-[0.22em] text-summit-gold sm:text-[0.6875rem]">
            <span className="h-px w-8 bg-summit-gold sm:w-12" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h2 data-contact-copy className="mt-7 max-w-[12ch] font-display text-[clamp(2.85rem,8vw,7.5rem)] font-medium leading-[0.91] tracking-[-0.06em] sm:mt-9">{copy.title[0]} <span className="editorial-accent text-summit-gold">{copy.title[1]}</span></h2>
          <p data-contact-copy className="mt-7 max-w-[37rem] font-body text-sm leading-7 text-summit-stone sm:mt-9 sm:text-base sm:leading-8">
            {copy.body}
          </p>
          <p data-contact-copy className="mt-7 font-body text-xs uppercase tracking-[0.14em] text-summit-ivory sm:mt-9 sm:text-sm">
            <a className="inline-flex min-h-11 max-w-full items-center gap-3 border-b border-summit-gold/70 pb-2 transition-colors hover:border-summit-gold hover:text-summit-gold" href="mailto:Projects@Summit-constructions.com">
              <Icon name="mail" size={18} className="shrink-0" /><span className="min-w-0">Projects@Summit-constructions.com</span>
            </a>
          </p>
          <div data-contact-copy className="mt-8 sm:mt-10">
            <ButtonLink href="mailto:Projects@Summit-constructions.com">{copy.cta}</ButtonLink>
          </div>
        </div>

        <p className="pointer-events-none absolute bottom-7 right-[var(--page-gutter)] hidden max-w-[14rem] text-right font-body text-[0.5625rem] font-bold uppercase tracking-[0.18em] text-summit-stone/80 lg:block">
          {locale === 'en' ? 'We Build the Future with the Spirit of Heritage.' : 'نبني المستقبل بروح التراث.'}
        </p>
      </Container>
    </section>
  )
}
