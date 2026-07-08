import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const I18N_DIR = resolve('public/content/i18n')
const MANIFEST_FILE = resolve(I18N_DIR, 'locales.json')
const RTL_LOCALES = new Set(['ar', 'fa', 'he', 'ur'])

function localeFiles() {
  return readdirSync(I18N_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.json') && name !== 'locales.json')
    .sort((left, right) => {
      if (left === 'fr.json') return -1
      if (right === 'fr.json') return 1
      return left.localeCompare(right)
    })
}

function parseJson(file) {
  const path = resolve(I18N_DIR, file)
  try {
    const payload = JSON.parse(readFileSync(path, 'utf8'))
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Le fichier doit contenir un objet JSON clé → texte.')
    }
    return payload
  } catch (error) {
    throw new Error(`${path}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function displayName(code, locale) {
  try {
    const formatter = new Intl.DisplayNames([locale], { type: 'language' })
    const label = formatter.of(code)
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

function localeFromFile(file) {
  return basename(file, '.json').toLowerCase()
}

const locales = localeFiles().map((file) => {
  parseJson(file)
  const code = localeFromFile(file)
  const base = code.split('-')[0]

  return {
    code,
    label: displayName(code, 'en'),
    nativeLabel: displayName(code, code),
    direction: RTL_LOCALES.has(base) ? 'rtl' : 'ltr',
  }
})

if (!locales.some((locale) => locale.code === 'fr')) {
  throw new Error('public/content/i18n/fr.json est requis comme langue de référence et fallback.')
}

writeFileSync(`${MANIFEST_FILE}`, `${JSON.stringify({ locales }, null, 2)}\n`, 'utf8')
console.log(`Manifest i18n généré : ${locales.map((locale) => locale.code).join(', ')}`)
