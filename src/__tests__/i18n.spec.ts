import { describe, expect, it } from 'vitest'

import { normalizeLocale, t } from '@/i18n'

describe('front i18n', () => {
  it('normalizes supported locales and interpolates labels', () => {
    expect(normalizeLocale('en-US')).toBe('en')
    expect(t('respondent.likert.group', { points: 5, label: 'Q1' }, 'fr')).toContain('5 points')
  })
})
