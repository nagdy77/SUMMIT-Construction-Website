type SectionHeadingProps = {
  eyebrow: string
  title: string
  description?: string
  tone?: 'dark' | 'light'
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = 'dark',
  className = '',
}: SectionHeadingProps) {
  const titleColor = 'text-[var(--color-ink)]'
  const bodyColor = 'text-[var(--color-muted)]'

  return (
    <header data-tone={tone} className={`section-heading grid gap-8 lg:grid-cols-12 lg:gap-6 ${className}`}>
      <p className="flex items-center gap-3 self-start font-body text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)] lg:col-span-3">
        <span className="h-px w-8 bg-summit-gold" aria-hidden="true" />
        {eyebrow}
      </p>
      <div className="lg:col-span-9">
        <h2 className={`max-w-5xl font-display text-[clamp(2.35rem,6vw,6rem)] font-medium leading-[0.98] tracking-[-0.045em] ${titleColor}`}>
          {title}
        </h2>
        {description ? (
          <p className={`mt-7 max-w-[var(--measure)] font-body text-sm leading-7 sm:text-base ${bodyColor}`}>{description}</p>
        ) : null}
      </div>
    </header>
  )
}
