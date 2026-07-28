import { readonly, ref } from 'vue'

import { fallbackMessages } from './fallback-catalogs.generated'

export const fallbackLocale = 'fr'
export const builtInLocales = ['fr', 'en'] as const
export const supportedLocales = builtInLocales
export type FrontLocale = string

type Params = Record<string, string | number | boolean | null | undefined>
type TranslationCatalog = Record<string, string>

export interface FrontLocaleInfo {
  code: FrontLocale
  label: string
  nativeLabel: string
  direction: 'ltr' | 'rtl'
}

type ImportMetaEnvLike = Record<string, string | boolean | undefined>



export type TranslationKey = keyof typeof fallbackMessages.fr

const defaultLocaleOptions: FrontLocaleInfo[] = [
  { code: 'fr', label: 'French', nativeLabel: 'Français', direction: 'ltr' },
  { code: 'en', label: 'English', nativeLabel: 'English', direction: 'ltr' },
]

const fallbackCatalogs: Record<string, TranslationCatalog> = fallbackMessages
const runtimeMessages: Record<FrontLocale, TranslationCatalog> = {}
const missingKeys = new Set<string>()
const availableLocalesState = ref<FrontLocaleInfo[]>(defaultLocaleOptions)
const activeLocaleState = ref<FrontLocale>(fallbackLocale)

export const i18nState = {
  activeLocale: readonly(activeLocaleState),
  availableLocales: readonly(availableLocalesState),
}

export function normalizeLocale(locale: string | undefined | null): FrontLocale {
  const requested = normalizeLocaleCode(locale)
  const available = availableLocalesState.value.map((entry) => entry.code)

  if (!requested) {
    return fallbackLocale
  }

  const exact = available.find((code) => code.toLowerCase() === requested)
  if (exact) {
    return exact
  }

  const [base = ''] = requested.split('-')
  const baseMatch = available.find((code) => code.toLowerCase() === base)
  return baseMatch ?? fallbackLocale
}

export function getActiveLocale(): FrontLocale {
  return activeLocaleState.value
}

export function getAvailableLocales(): FrontLocaleInfo[] {
  return [...availableLocalesState.value]
}

export function setLocale(locale: string | undefined | null): FrontLocale {
  const normalized = normalizeLocale(locale)
  activeLocaleState.value = normalized
  persistLocale(normalized)
  applyLocaleToDocument(normalized)
  return normalized
}

export async function switchLocale(locale: string | undefined | null): Promise<FrontLocale> {
  const normalized = normalizeLocale(locale)
  await loadRuntimeCatalog(normalized)
  return setLocale(normalized)
}

export async function initializeI18n(locale = getDefaultLocale()): Promise<void> {
  await loadLocaleManifest()

  const normalized = normalizeLocale(locale)
  await Promise.all([
    loadRuntimeCatalog(fallbackLocale),
    normalized === fallbackLocale ? undefined : loadRuntimeCatalog(normalized),
  ])

  setLocale(normalized)
}

export async function loadLocaleManifest(): Promise<FrontLocaleInfo[]> {
  if (typeof fetch === 'undefined') {
    availableLocalesState.value = defaultLocaleOptions
    return getAvailableLocales()
  }

  try {
    const response = await fetch(runtimeManifestUrl(), { cache: 'no-cache' })
    if (!response.ok) {
      availableLocalesState.value = defaultLocaleOptions
      return getAvailableLocales()
    }

    const manifest = sanitizeLocaleManifest(await response.json())
    availableLocalesState.value = manifest.length ? manifest : defaultLocaleOptions
  } catch {
    availableLocalesState.value = defaultLocaleOptions
  }

  return getAvailableLocales()
}

export async function loadRuntimeCatalog(locale: FrontLocale): Promise<void> {
  if (typeof fetch === 'undefined') {
    return
  }

  const normalized = normalizeLocale(locale)
  const url = runtimeCatalogUrl(normalized)

  try {
    const response = await fetch(url, { cache: 'no-cache' })
    if (!response.ok) {
      return
    }

    const payload = await response.json()
    runtimeMessages[normalized] = sanitizeCatalog(payload)
  } catch {
    // Fallback messages keep the app usable when the optional editable content pack is absent.
  }
}

export function t(
  key: TranslationKey | string,
  params: Params = {},
  locale = activeLocaleState.value,
): string {
  const normalized = normalizeLocale(locale)
  const template = resolveMessage(key, normalized)

  if (!template) {
    missingKeys.add(key)
    return key
  }

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name: string) =>
    String(params[name] ?? ''),
  )
}


export function tp(
  baseKey: string,
  count: number,
  params: Params = {},
  locale = activeLocaleState.value,
): string {
  const normalized = normalizeLocale(locale)
  const category = new Intl.PluralRules(normalized).select(count)
  const categoryKey = `${baseKey}.${category}`
  const fallbackKey = `${baseKey}.other`
  const selectedKey = resolveMessage(categoryKey, normalized) ? categoryKey : fallbackKey
  return t(selectedKey, { ...params, count }, normalized)
}

export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
  locale = activeLocaleState.value,
): string {
  return new Intl.NumberFormat(normalizeLocale(locale), options).format(value)
}

export function formatPercent(
  value: number,
  maximumFractionDigits = 0,
  locale = activeLocaleState.value,
): string {
  return new Intl.NumberFormat(normalizeLocale(locale), {
    style: 'percent',
    maximumFractionDigits,
  }).format(value)
}

export function formatDate(
  value: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'short' },
  locale = activeLocaleState.value,
): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat(normalizeLocale(locale), options).format(date)
}

export function roleText(
  role: string,
  field: 'label' | 'short' | 'description' | 'scope' = 'label',
): string {
  return t(`role.${role}.${field}`)
}

export function languageText(language: string): string {
  const key = `language.${language.toLowerCase()}`
  const translated = t(key)
  return translated === key ? language.toUpperCase() : translated
}

export function questionTypeText(type?: string | null): string {
  if (!type) {
    return t('questionType.unknown')
  }

  const key = `questionType.${type}`
  const translated = t(key)
  return translated === key ? type : translated
}

export function getMissingI18nKeys(): string[] {
  return [...missingKeys].sort()
}

export function fallbackCatalog(locale: FrontLocale): TranslationCatalog {
  const normalized = normalizeLocale(locale)
  return { ...(fallbackCatalogs[normalized] ?? fallbackCatalogs[fallbackLocale]) }
}

function resolveMessage(key: string, locale: FrontLocale): string | undefined {
  return (
    runtimeMessages[locale]?.[key] ??
    fallbackCatalogs[locale]?.[key] ??
    runtimeMessages[fallbackLocale]?.[key] ??
    fallbackCatalogs[fallbackLocale]?.[key]
  )
}

function runtimeCatalogUrl(locale: FrontLocale): string {
  return `${runtimeContentBaseUrl()}/${locale}.json`
}

function runtimeManifestUrl(): string {
  return `${runtimeContentBaseUrl()}/locales.json`
}

function runtimeContentBaseUrl(): string {
  const env = import.meta.env as ImportMetaEnvLike
  const configuredBase =
    typeof env.VITE_I18N_CONTENT_BASE_URL === 'string' ? env.VITE_I18N_CONTENT_BASE_URL.trim() : ''
  const base = configuredBase || `${env.BASE_URL || '/'}content/i18n`
  return base.replace(/\/$/, '')
}

function sanitizeCatalog(payload: unknown): TranslationCatalog {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }

  return Object.entries(payload as Record<string, unknown>).reduce<TranslationCatalog>(
    (catalog, [key, value]) => {
      if (typeof value === 'string') {
        catalog[key] = value
      }
      return catalog
    },
    {},
  )
}

function sanitizeLocaleManifest(payload: unknown): FrontLocaleInfo[] {
  const rawLocales = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as { locales?: unknown }).locales)
      ? (payload as { locales: unknown[] }).locales
      : []

  const seen = new Set<string>()
  return rawLocales.flatMap((entry): FrontLocaleInfo[] => {
    if (!entry || typeof entry !== 'object') {
      return []
    }

    const candidate = entry as Record<string, unknown>
    const code = normalizeLocaleCode(typeof candidate.code === 'string' ? candidate.code : '')
    if (!code || seen.has(code)) {
      return []
    }

    seen.add(code)
    return [
      {
        code,
        label: stringOrFallback(candidate.label, code.toUpperCase()),
        nativeLabel: stringOrFallback(
          candidate.nativeLabel,
          stringOrFallback(candidate.label, code.toUpperCase()),
        ),
        direction: candidate.direction === 'rtl' ? 'rtl' : 'ltr',
      },
    ]
  })
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeLocaleCode(locale: string | undefined | null): string {
  const [primary = ''] = String(locale ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .split(',')

  return primary.replace(/[^a-z0-9-]/g, '')
}

function getDefaultLocale(): string {
  const stored = readStoredLocale()
  if (stored) {
    return stored
  }

  const configured = (import.meta.env as ImportMetaEnvLike).VITE_DEFAULT_LOCALE
  if (typeof configured === 'string' && configured.trim()) {
    return configured
  }

  if (typeof navigator !== 'undefined') {
    return navigator.languages?.[0] ?? navigator.language ?? fallbackLocale
  }

  return fallbackLocale
}

function readStoredLocale(): string | null {
  try {
    return typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem('chpm.interface.locale')
  } catch {
    return null
  }
}

function persistLocale(locale: FrontLocale): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('chpm.interface.locale', locale)
    }
  } catch {
    // Storage may be unavailable in hardened browsers or tests.
  }
}

function applyLocaleToDocument(locale: FrontLocale): void {
  if (typeof document === 'undefined') {
    return
  }

  const direction =
    availableLocalesState.value.find((entry) => entry.code === locale)?.direction ?? 'ltr'
  document.documentElement.lang = locale
  document.documentElement.dir = direction
}
