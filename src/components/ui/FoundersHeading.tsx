type FoundersHeadingProps = {
  locale: 'en' | 'ar'
  id?: string
  className?: string
}

const foundersHeadingCopy = {
  en: { lead: 'Meet The', emphasis: 'Founders', full: 'Meet The Founders' },
  ar: { lead: 'تعرّف إلى', emphasis: 'المؤسسين', full: 'تعرّف إلى المؤسسين' },
} as const

export function FoundersHeading({ locale, id, className = '' }: FoundersHeadingProps) {
  const copy = foundersHeadingCopy[locale]
  return <div className={`founders-editorial-heading ${className}`.trim()} data-founders-heading>
    <span className="founders-editorial-heading__line" data-founders-heading-line aria-hidden="true" />
    <h2 id={id} className="founders-editorial-heading__title" aria-label={copy.full}>
      <span className="founders-editorial-heading__lead" data-founders-heading-part>{copy.lead}</span>
      <span className="founders-editorial-heading__emphasis" data-founders-heading-part>{copy.emphasis}</span>
    </h2>
  </div>
}
