/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENQUIRY_FORM_ENDPOINT?: string
  readonly VITE_FORM_DELIVERY_VERIFIED?: string
  readonly VITE_GA4_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
}
