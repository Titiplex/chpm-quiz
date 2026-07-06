function readStringEnv(name: string): string {
  const value = import.meta.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

const staticPagesDemo = readStringEnv('VITE_STATIC_PAGES_DEMO') === 'true'
const demoMode = import.meta.env.DEV && readStringEnv('VITE_DEMO_MODE') === 'true'
const rawApiBaseUrl = readStringEnv('VITE_API_BASE_URL')

if (import.meta.env.PROD && !staticPagesDemo && !rawApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL est obligatoire pour un build connecté de production.')
}

export const appConfig = {
  appName: readStringEnv('VITE_APP_NAME') || 'CHPM Survey',
  apiBaseUrl: rawApiBaseUrl || 'http://localhost:3000/api',
  demoMode,
  staticPagesDemo,
  i18nContentBaseUrl: readStringEnv('VITE_I18N_CONTENT_BASE_URL') || `${import.meta.env.BASE_URL}content/i18n`,
}
