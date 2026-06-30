import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory()
      ? vueFiles(path)
      : path.endsWith('.vue') ? [path] : []
  })
}

describe('static accessibility audit', () => {
  it('keeps respondent critical controls keyboard and screen-reader friendly', () => {
    const source = readFileSync(join(process.cwd(), 'src/views/RespondentView.vue'), 'utf8')

    expect(source).toContain('role="radiogroup"')
    expect(source).toContain('role="radio"')
    expect(source).toContain(':aria-checked=')
    expect(source).toContain('aria-describedby')
    expect(source).toContain('aria-modal="true"')
    expect(source).toContain('visually-hidden')
  })

  it('does not introduce unlabeled form controls in Vue screens', () => {
    const offenders = vueFiles(join(process.cwd(), 'src'))
      .map((file) => ({ file, source: readFileSync(file, 'utf8') }))
      .filter(({ source }) => /<(input|textarea|select)\b/.test(source))
      .filter(({ source }) => !(/<label\b/.test(source) || /aria-label=/.test(source) || /aria-labelledby=/.test(source)))
      .map(({ file }) => file.replace(`${process.cwd()}/`, ''))

    expect(offenders).toEqual([])
  })

  it('defines a global focus-visible style', () => {
    const css = readFileSync(join(process.cwd(), 'src/assets/demo.css'), 'utf8')
    expect(css).toContain(':focus-visible')
    expect(css).toContain('outline-offset')
  })
})
