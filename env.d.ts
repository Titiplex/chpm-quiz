/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_DEMO_DEFAULT_ROLE?: string
  readonly VITE_DEMO_MODE?: string
  readonly VITE_STATIC_PAGES_DEMO?: string
  readonly VITE_ROUTER_MODE?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_I18N_CONTENT_BASE_URL?: string
  readonly VITE_DEFAULT_LOCALE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
