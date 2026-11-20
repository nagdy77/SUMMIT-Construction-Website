import { useId, type MouseEvent, type ReactNode } from 'react'
import { useLocale } from '../../content/site'
import { whatsappHref, whatsappUnavailableCopy, type WhatsAppIntent } from '../../config/contact'

type WhatsAppActionProps = {
  children: ReactNode
  intent?: WhatsAppIntent
  projectTitle?: string
  className?: string
  showStatus?: boolean
  compact?: boolean
  tabIndex?: number
}

export function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className="shrink-0">
      <path d="M20.4 11.8a8.4 8.4 0 0 1-12.5 7.3L3.5 20.5l1.4-4.2A8.4 8.4 0 1 1 20.4 11.8Z" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.2 7.8c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.8c-.2.2-.1.4 0 .6.5.9 1.3 1.7 2.2 2.2.2.1.4.2.6 0l.9-1c.2-.2.4-.3.7-.2l1.8.9c.3.1.4.3.4.5 0 .5-.2 1.3-.7 1.7-.5.5-1.3.8-2.1.6-1.1-.2-2.7-.8-4.5-2.4-1.4-1.3-2.3-2.8-2.5-3.9-.2-.9.1-1.8.5-2.3Z" fill="currentColor" />
    </svg>
  )
}

export function WhatsAppAction({ children, intent = 'general', projectTitle, className = '', showStatus = false, compact = false, tabIndex }: WhatsAppActionProps) {
  const locale = useLocale()
  const pendingHintId = useId()
  const href = whatsappHref(intent, locale, projectTitle)
  const unavailable = whatsappUnavailableCopy[locale]
  const sharedClassName = `whatsapp-action ${compact ? 'whatsapp-action--compact' : ''} ${className}`
  const content = <><WhatsAppIcon size={compact ? 17 : 20} /><span>{children}</span></>

  if (href) {
    return (
      <a data-magnetic className={sharedClassName} href={href} target="_blank" rel="noreferrer" data-whatsapp-configured="true" tabIndex={tabIndex}>
        {content}
      </a>
    )
  }

  const preventNavigation = (event: MouseEvent<HTMLButtonElement>) => event.preventDefault()
  return (
    <span className={`whatsapp-action-state ${showStatus ? 'whatsapp-action-state--with-status' : ''}`}>
      <button
        type="button"
        className={sharedClassName}
        aria-disabled="true"
        aria-describedby={showStatus ? undefined : pendingHintId}
        data-whatsapp-configured="false"
        tabIndex={tabIndex}
        onClick={preventNavigation}
      >
        {content}
        {!showStatus ? <span id={pendingHintId} role="tooltip" className="whatsapp-action__tooltip">{unavailable}</span> : null}
      </button>
      {showStatus ? <span className="whatsapp-action__status" role="note">{unavailable}</span> : null}
    </span>
  )
}
