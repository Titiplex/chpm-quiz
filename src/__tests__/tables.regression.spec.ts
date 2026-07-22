import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'
import statsViewSource from '@/views/StatsView.vue?raw'

const demoCss = readFileSync(resolve(process.cwd(), 'src/assets/demo.css'), 'utf8')

const vueSources = import.meta.glob('../**/*.vue', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

describe('table regressions', () => {
  it('keeps scrollable table overflow after the generic hidden-overflow rule', () => {
    const compactCss = demoCss.replace(/\s+/g, '')
    const genericTableCardRule = compactCss.indexOf('.table-card{')
    const scrollOverrideRule = compactCss.indexOf('.table-card.table-card-scroll')

    expect(genericTableCardRule).toBeGreaterThanOrEqual(0)
    expect(scrollOverrideRule).toBeGreaterThan(genericTableCardRule)
    expect(compactCss.slice(scrollOverrideRule, scrollOverrideRule + 220)).toContain('overflow:auto')
  })

  it('wraps every application table in a vertically accessible scroll container', () => {
    const unscrollableTables: string[] = []

    for (const [path, source] of Object.entries(vueSources)) {
      if (!source.includes('<table')) continue

      const wrappers = source.matchAll(/<div\s+class="([^"]*table-card[^"]*)"[^>]*>\s*<table/g)
      const wrapperClasses = Array.from(wrappers, (match) => match[1] ?? '')
      const tableCount = (source.match(/<table\b/g) ?? []).length

      if (wrapperClasses.length !== tableCount || wrapperClasses.some((classes) => !classes.includes('table-card-scroll'))) {
        unscrollableTables.push(path)
      }
    }

    expect(unscrollableTables).toEqual([])
  })

  it('does not truncate statistics tables or free-text response lists in the view', () => {
    expect(statsViewSource).not.toContain('visibleSubmissionCount')
    expect(statsViewSource).not.toContain('visiblePopupCount')
    expect(statsViewSource).not.toContain('visibleQuestionCount')
    expect(statsViewSource).not.toContain('freeTextResponses.slice')
  })
})
