import { describe, expect, it, vi } from 'vitest'

import { fallbackCatalog, getActiveLocale, getMissingI18nKeys, initializeI18n, loadRuntimeCatalog, normalizeLocale, setLocale, t } from '@/i18n'

describe('front i18n', () => {
  it('normalizes supported locales, switches active locale and interpolates labels', () => {
    expect(normalizeLocale('en-US')).toBe('en')
    expect(normalizeLocale('fr-CA')).toBe('fr')
    expect(setLocale('en-CA')).toBe('en')
    expect(getActiveLocale()).toBe('en')
    expect(t('respondent.likert.group', { points: 5, label: 'Q1' }, 'fr')).toContain('5 points')
  })

  it('loads optional runtime catalogs from editable public content', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ 'test.runtime': 'Runtime OK' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await loadRuntimeCatalog('fr')

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(t('test.runtime', {}, 'fr')).toBe('Runtime OK')

    vi.unstubAllGlobals()
  })

  it('tracks missing keys without breaking rendering', () => {
    expect(t('missing.key.for.test')).toBe('missing.key.for.test')
    expect(getMissingI18nKeys()).toContain('missing.key.for.test')
  })

  it('initializes fallback and runtime catalogs for the requested locale', async () => {
    const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify({ [`runtime.${url.endsWith('/en.json') ? 'en' : 'fr'}`]: 'OK' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await initializeI18n('en-US')

    expect(getActiveLocale()).toBe('en')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(t('runtime.fr', {}, 'fr')).toBe('OK')
    expect(t('runtime.en', {}, 'en')).toBe('OK')
  })

  it('ignores non-string runtime catalog values and falls back to French', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ 'nav.home': 'Home runtime', ignored: 42 }), { status: 200 })))

    await loadRuntimeCatalog('en')

    expect(t('nav.home', {}, 'en')).toBe('Home runtime')
    expect(t('ignored', {}, 'en')).toBe('ignored')
    expect(fallbackCatalog('fr')['nav.home']).toBe('Accueil')
  })

  it('keeps fallback messages when the editable runtime catalog is missing or invalid', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))

    await loadRuntimeCatalog('fr')

    expect(t('nav.home', {}, 'fr')).toBe('Accueil')

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network') }))
    await loadRuntimeCatalog('fr')
    expect(t('nav.home', {}, 'fr')).toBe('Accueil')
  })

})
