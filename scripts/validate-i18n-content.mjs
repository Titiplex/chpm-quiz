import { readdirSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const I18N_DIR = resolve('public/content/i18n')
const REFERENCE_LOCALE = 'fr'

function localeFiles() {
  return readdirSync(I18N_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.json') && name !== 'locales.json')
    .sort((left, right) => {
      if (left === `${REFERENCE_LOCALE}.json`) return -1
      if (right === `${REFERENCE_LOCALE}.json`) return 1
      return left.localeCompare(right)
    })
}

function readCatalog(file) {
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

function placeholders(value) {
  return [...String(value).matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]).sort()
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '__tests__') return []
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(?:ts|vue)$/.test(entry.name) ? [path] : []
  })
}

function usedTranslationKeys() {
  const keys = new Map()
  const patterns = [
    /\bt\(\s*['"]([^'"]+)['"]/g,
    /\b(?:labelKey|descriptionKey|titleKey)\s*:\s*['"]([^'"]+)['"]/g,
  ]

  for (const file of sourceFiles(resolve('src'))) {
    const source = readFileSync(file, 'utf8')
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        keys.set(match[1], file)
      }
    }
  }

  return keys
}

const files = localeFiles()
const locales = files.map((file) => basename(file, '.json'))
const errors = []

if (!files.includes(`${REFERENCE_LOCALE}.json`)) {
  errors.push(`${REFERENCE_LOCALE}.json est requis comme langue de référence.`)
}

const catalogs = Object.fromEntries(
  files.map((file) => [basename(file, '.json'), readCatalog(file)]),
)
const referenceCatalog = catalogs[REFERENCE_LOCALE]
const referenceKeys = referenceCatalog ? Object.keys(referenceCatalog).sort() : []
const sourceKeys = usedTranslationKeys()

for (const locale of locales) {
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

    const expectedPlaceholders = placeholders(referenceCatalog[key]).join(',')
    const actualPlaceholders = placeholders(value).join(',')
    if (expectedPlaceholders !== actualPlaceholders) {
      errors.push(
        `${locale}: placeholders incohérents pour ${key} ; attendu {${expectedPlaceholders}}, obtenu {${actualPlaceholders}}`,
      )
    }
  }

  for (const [key, sourceFile] of sourceKeys) {
    if (!(key in catalog)) {
      errors.push(`${locale}: clé utilisée mais absente ${key} (${sourceFile})`)
    }
  }
}

if (errors.length) {
  console.error('Validation i18n échouée :')
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(
    `Validation i18n OK (${referenceKeys.length} clés, ${locales.length} langues : ${locales.join(', ')}).`,
  )
}
