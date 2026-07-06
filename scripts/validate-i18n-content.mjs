import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const LOCALES = ['fr', 'en']
const I18N_DIR = resolve('public/content/i18n')

function readCatalog(locale) {
  const file = resolve(I18N_DIR, `${locale}.json`)
  try {
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Le fichier doit contenir un objet JSON clé → texte.')
    }
    return payload
  } catch (error) {
    throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function placeholders(value) {
  return [...String(value).matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]).sort()
}

const catalogs = Object.fromEntries(LOCALES.map((locale) => [locale, readCatalog(locale)]))
const referenceLocale = 'fr'
const referenceKeys = Object.keys(catalogs[referenceLocale]).sort()
const errors = []

for (const locale of LOCALES) {
  const catalog = catalogs[locale]
  const keys = Object.keys(catalog).sort()
  const missing = referenceKeys.filter((key) => !keys.includes(key))
  const extra = keys.filter((key) => !referenceKeys.includes(key))

  for (const key of missing) errors.push(`${locale}: clé manquante ${key}`)
  for (const key of extra) errors.push(`${locale}: clé inconnue ${key}`)

  for (const key of referenceKeys) {
    const value = catalog[key]
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(`${locale}: valeur vide ou non textuelle pour ${key}`)
      continue
    }

    const expectedPlaceholders = placeholders(catalogs[referenceLocale][key]).join(',')
    const actualPlaceholders = placeholders(value).join(',')
    if (expectedPlaceholders !== actualPlaceholders) {
      errors.push(`${locale}: placeholders incohérents pour ${key} ; attendu {${expectedPlaceholders}}, obtenu {${actualPlaceholders}}`)
    }
  }
}

if (errors.length) {
  console.error('Validation i18n échouée :')
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`Validation i18n OK (${referenceKeys.length} clés, ${LOCALES.length} langues).`)
}
