export const COMPANY_EMAIL = 'Projects@Summit-constructions.com'

/**
 * Add the approved business WhatsApp number here in international format.
 * Example format only: +20 1XX XXX XXXX
 */
export const WHATSAPP_NUMBER: string | null = null
export const WHATSAPP_PLACEHOLDER = '+20 1XX XXX XXXX'

export type ContactLocale = 'en' | 'ar'
export type WhatsAppIntent = 'quote' | 'general' | 'project'

const messages: Record<ContactLocale, Record<Exclude<WhatsAppIntent, 'project'>, string>> = {
  en: {
    quote: 'Hello SUMMIT Construction, I would like to request a quotation for my project.',
    general: 'Hello SUMMIT Construction, I would like to discuss my project requirements and request a quotation.',
  },
  ar: {
    quote: 'مرحبًا سوميت، أرغب في طلب عرض سعر لمشروعي.',
    general: 'مرحبًا سوميت، أرغب في مناقشة متطلبات مشروعي وطلب عرض سعر.',
  },
}

export const whatsappUnavailableCopy: Record<ContactLocale, string> = {
  en: `WhatsApp number pending — ${WHATSAPP_PLACEHOLDER}`,
  ar: `رقم واتساب قيد الإضافة — ${WHATSAPP_PLACEHOLDER}`,
}

function normalizedWhatsAppNumber(number: string | null) {
  if (!number) return null
  const digits = number.replace(/\D/g, '').replace(/^00/, '')
  return /^\d{8,15}$/.test(digits) ? digits : null
}

export function whatsappMessage(intent: WhatsAppIntent, locale: ContactLocale, projectTitle?: string) {
  if (intent !== 'project') return messages[locale][intent]
  const title = projectTitle?.trim()
  if (!title) return messages[locale].general
  return locale === 'en'
    ? `Hello SUMMIT Construction, I would like to discuss the ${title} project and request a quotation.`
    : `مرحبًا سوميت، أرغب في مناقشة مشروع ${title} وطلب عرض سعر.`
}

export function whatsappHref(intent: WhatsAppIntent, locale: ContactLocale, projectTitle?: string) {
  const number = normalizedWhatsAppNumber(WHATSAPP_NUMBER)
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(whatsappMessage(intent, locale, projectTitle))}`
}
