import { describe, expect, it, vi } from 'vitest'

import { getMissingI18nKeys, loadRuntimeCatalog, normalizeLocale, t } from '@/i18n'

describe('front i18n', () => {
  it('normalizes supported locales and interpolates labels', () => {
    expect(normalizeLocale('en-US')).toBe('en')
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
})
