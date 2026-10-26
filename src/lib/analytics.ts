const measurementId = import.meta.env.VITE_GA4_ID?.trim()

function hasAnalyticsConsent() {
  try { return window.localStorage.getItem('summit-analytics-consent') === 'granted' } catch { return false }
}

function validMeasurementId(value: string | undefined): value is string {
  return Boolean(value && /^G-[A-Z0-9]+$/i.test(value))
}

export function initializeAnalytics() {
  if (typeof window === 'undefined' || !validMeasurementId(measurementId) || !hasAnalyticsConsent()) return false
  if (window.gtag) return true
  window.dataLayer = window.dataLayer || []
  window.gtag = (...args: unknown[]) => { window.dataLayer?.push(args) }
  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false, anonymize_ip: true })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  script.dataset.summitAnalytics = 'true'
  document.head.append(script)
  return true
}

export function trackPageView(path: string) {
  if (!initializeAnalytics()) return
  window.gtag?.('event', 'page_view', { page_path: path, page_location: window.location.href, page_title: document.title })
}

export function trackEvent(name: string, parameters: Record<string, string | number | boolean>) {
  if (!initializeAnalytics()) return
  window.gtag?.('event', name, parameters)
}
