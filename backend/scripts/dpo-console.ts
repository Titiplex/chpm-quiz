import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { userInfo } from 'node:os'
import { join, resolve } from 'node:path'
import { stdin as input, stdout as output } from 'node:process'
import { createInterface } from 'node:readline/promises'

// eslint-disable-next-line @typescript-eslint/no-require-imports
import bcrypt = require('bcryptjs')

import { loadPrismaClient } from '../src/prisma/prisma-client.loader'

const EMAIL_CIPHER_VERSION = 'v1'
const EMAIL_ALGORITHM = 'aes-256-gcm'
const EXPORT_ALGORITHM = 'aes-256-gcm'
const CODE_REGEX = /^[A-Z0-9][A-Z0-9-]{3,64}$/
const MAX_CODES_PER_EXPORT = 50

type AuthenticatedDpo = { id: string; email: string; displayName: string; role: string; isActive: boolean; passwordHash: string }
type IdentityRow = { uniqueCode: string; contactChannel: string; encryptedEmail: string | null; encryptedPhone: string | null; questionnaireVersionId: string; buildingId: string }

loadEnvFile(join(process.cwd(), '.env'))

const databaseUrl = resolveDatabaseUrl()
const PrismaClientBase = loadPrismaClient()
const prisma = new PrismaClientBase({ datasourceUrl: databaseUrl })
const rl = createInterface({ input, output })

async function main() {
  assertInteractiveTerminal()
  await assertDatabaseTargetAllowed()
  await prisma.$connect()

  printBanner()
  const dpo = await loginDpo()
  const justification = await promptLongRequired('Justification opérationnelle DPO')
  const procedureReference = await promptLongRequired('Référence légale / procédure')
  const codes = await promptPublicCodes()
  await requireTypedConfirmation('Tapez "EXPORT DPO" pour produire l’export minimal code-contact chiffré', 'EXPORT DPO')

  const rows = await loadExplicitIdentityRows(codes)
  const missingCodes = codes.filter((code) => !rows.some((row) => row.uniqueCode === code))
  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: { id: dpo.id, email: dpo.email, displayName: dpo.displayName },
    procedureReference,
    justification,
    requestedCodes: codes,
    missingCodes,
    rowCount: rows.length,
    rows: rows.map((row) => ({
      publicCode: row.uniqueCode,
      contactChannel: row.contactChannel === 'sms' ? 'sms' : 'email',
      email: row.encryptedEmail ? decryptEmail(row.encryptedEmail) : null,
      phone: row.encryptedPhone ? decryptEmail(row.encryptedPhone) : null,
    })),
  }

  const encrypted = await encryptExport(JSON.stringify(payload, null, 2))
  const fingerprint = createHash('sha256').update(encrypted.fileBytes).digest('hex')
  const outputDir = resolve(process.env.DPO_EXPORT_DIR ?? join(process.cwd(), 'dpo-exports'))
  mkdirSync(outputDir, { recursive: true })
  const filename = `dpo-code-contact-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json.enc`
  const filepath = join(outputDir, filename)
  writeFileSync(filepath, encrypted.fileBytes, { mode: 0o600 })

  await prisma.$transaction(async (tx: any) => {
    await tx.auditLog.create({
      data: {
        actorUserId: dpo.id,
        action: 'identity_vault.dpo_console.export_code_contact',
        entityType: 'IdentityVault',
        entityId: null,
        publicCode: codes.length === 1 ? codes[0] : null,
        metadata: {
          source: 'dpo-console',
          osUser: getOsUser(),
          procedureReference,
          justification,
          requestedCodeCount: codes.length,
          requestedCodes: codes,
          missingCodes,
          exportedRowCount: rows.length,
          exportFingerprint: fingerprint,
          exportAlgorithm: EXPORT_ALGORITHM,
          exportPath: filepath,
          unrestrictedContactSearch: false,
          massExport: false,
        },
        ipAddress: 'local-cli',
        userAgent: `chpm-dpo-console ${process.version}`,
      },
    })

    await tx.identityVaultAuditLog.create({
      data: {
        actorUserId: dpo.id,
        action: 'dpo_console.export_code_contact',
        publicCode: codes.length === 1 ? codes[0] : undefined,
        ipAddress: 'local-cli',
        metadata: {
          source: 'dpo-console',
          osUser: getOsUser(),
          procedureReference,
          justification,
          requestedCodes: codes,
          missingCodes,
          exportedRowCount: rows.length,
          exportFingerprint: fingerprint,
          exportPath: filepath,
        },
      },
    })
  })

  console.log('\nExport DPO produit.')
  console.log(`- Fichier chiffré : ${filepath}`)
  console.log(`- Empreinte SHA-256 : ${fingerprint}`)
  console.log(`- Codes demandés : ${codes.length}`)
  console.log(`- Lignes exportées : ${rows.length}`)
  if (missingCodes.length) console.log(`- Codes introuvables : ${missingCodes.join(', ')}`)
  console.log('Aucun email ni téléphone n’a été affiché dans le terminal. Le fichier doit être transféré et conservé selon la procédure DPO validée.\n')
}

async function loginDpo(): Promise<AuthenticatedDpo> {
  console.log('\nConnexion nominative DPO obligatoire.\n')
  const email = (await promptRequired('Email DPO')).trim().toLowerCase()
  const password = await askHidden('Mot de passe : ')
  const user = (await prisma.user.findUnique({ where: { email } })) as AuthenticatedDpo | null

  if (!user || !user.isActive || user.role !== 'dpo') {
    await auditFailedLogin(email, user?.id ?? null, user?.role ?? null, 'not_active_dpo')
    throw new Error('Connexion refusée : le compte doit être un DPO actif.')
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    await auditFailedLogin(email, user.id, user.role, 'invalid_password')
    throw new Error('Connexion refusée : identifiants invalides.')
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'identity_vault.dpo_console.login_success',
      entityType: 'IdentityVault',
      metadata: { source: 'dpo-console', osUser: getOsUser() },
      ipAddress: 'local-cli',
      userAgent: `chpm-dpo-console ${process.version}`,
    },
  })
  return user
}

async function auditFailedLogin(email: string, actorUserId: string | null, role: string | null, reason: string) {
  await prisma.auditLog.create({
    data: {
      actorUserId,
      action: 'identity_vault.dpo_console.login_denied',
      entityType: 'IdentityVault',
      metadata: { source: 'dpo-console', osUser: getOsUser(), email, role, reason },
      ipAddress: 'local-cli',
      userAgent: `chpm-dpo-console ${process.version}`,
    },
  }).catch(() => undefined)
}

async function promptPublicCodes() {
  console.log('\nSaisir uniquement des codes publics explicites. Recherche libre par email ou téléphone interdite.')
  const raw = await promptLongRequired(`Codes publics, séparés par virgules ou espaces, maximum ${MAX_CODES_PER_EXPORT}`)
  const codes = Array.from(new Set(raw.split(/[\s,;]+/).map((value) => value.trim().toUpperCase()).filter(Boolean)))
  if (codes.length === 0) throw new Error('Au moins un code public explicite est obligatoire.')
  if (codes.length > MAX_CODES_PER_EXPORT) throw new Error(`Export refusé : maximum ${MAX_CODES_PER_EXPORT} codes explicites par exécution.`)
  const invalid = codes.filter((code) => !CODE_REGEX.test(code))
  if (invalid.length) throw new Error(`Code(s) public(s) invalides : ${invalid.join(', ')}`)
  return codes
}

async function loadExplicitIdentityRows(codes: string[]) {
  return (await prisma.identityVaultEntry.findMany({
    where: {
      uniqueCode: { in: codes },
      deletedAt: null,
    },
    select: {
      uniqueCode: true,
      contactChannel: true,
      encryptedEmail: true,
      encryptedPhone: true,
      questionnaireVersionId: true,
      buildingId: true,
    },
    orderBy: { uniqueCode: 'asc' },
  })) as IdentityRow[]
}

function decryptEmail(payload: string): string {
  const [version, ivB64, authTagB64, ciphertextB64] = payload.split('.')
  if (version !== EMAIL_CIPHER_VERSION || !ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Format de chiffrement email invalide')
  }

  const decipher = createDecipheriv(EMAIL_ALGORITHM, emailEncryptionKey(), Buffer.from(ivB64, 'base64url'), { authTagLength: 16 })
  decipher.setAAD(Buffer.from(version, 'utf8'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

async function encryptExport(plaintext: string) {
  const key = await exportEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(EXPORT_ALGORITHM, key, iv, { authTagLength: 16 })
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const envelope = {
    version: 'v1',
    algorithm: EXPORT_ALGORITHM,
    iv: iv.toString('base64url'),
    authTag: authTag.toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  }
  return { fileBytes: Buffer.from(JSON.stringify(envelope, null, 2), 'utf8') }
}

function emailEncryptionKey(): Buffer {
  const rawKey = process.env.EMAIL_ENCRYPTION_KEY_B64
  if (rawKey) {
    const key = Buffer.from(rawKey, 'base64')
    if (key.length !== 32) throw new Error('EMAIL_ENCRYPTION_KEY_B64 doit contenir 32 octets encodés en base64')
    return key
  }
  if (process.env.NODE_ENV === 'production') throw new Error('EMAIL_ENCRYPTION_KEY_B64 est obligatoire en production')
  return createHash('sha256').update(process.env.DEV_EMAIL_ENCRYPTION_SECRET ?? 'development-email-key-change-me').digest()
}

async function exportEncryptionKey(): Promise<Buffer> {
  const rawKey = process.env.DPO_EXPORT_ENCRYPTION_KEY_B64
  if (rawKey) {
    const key = Buffer.from(rawKey, 'base64')
    if (key.length !== 32) throw new Error('DPO_EXPORT_ENCRYPTION_KEY_B64 doit contenir 32 octets encodés en base64')
    return key
  }

  const passphrase = await askHidden('Phrase de chiffrement de l’export DPO : ')
  const confirmation = await askHidden('Confirmation phrase de chiffrement : ')
  if (passphrase !== confirmation) throw new Error('Les deux phrases de chiffrement ne correspondent pas.')
  if (passphrase.length < 16) throw new Error('La phrase de chiffrement doit contenir au moins 16 caractères.')
  return scryptSync(passphrase, 'chpm-dpo-export-v1', 32)
}

async function promptRequired(label: string): Promise<string> {
  while (true) {
    const value = (await ask(`${label} : `)).trim()
    if (value) return value
    console.log('Valeur obligatoire.')
  }
}

async function promptLongRequired(label: string): Promise<string> {
  while (true) {
    const value = (await ask(`${label} : `)).trim()
    if (value.length >= 8) return value
    console.log('Valeur obligatoire, huit caractères minimum.')
  }
}

async function requireTypedConfirmation(label: string, expected: string) {
  const value = (await ask(`${label} : `)).trim()
  if (value !== expected) throw new Error('confirmation textuelle invalide')
}

async function ask(question: string): Promise<string> {
  return rl.question(question)
}

async function askHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) throw new Error('saisie masquée indisponible hors terminal interactif')
  rl.pause()
  output.write(question)
  input.setRawMode(true)
  input.resume()
  input.setEncoding('utf8')
  return new Promise((resolve, reject) => {
    let value = ''
    const cleanup = () => {
      input.setRawMode(false)
      input.off('data', onData)
      rl.resume()
      output.write('\n')
    }
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\u0003') {
          cleanup()
          reject(new Error('interrompu par Ctrl+C'))
          return
        }
        if (char === '\r' || char === '\n') {
          cleanup()
          resolve(value)
          return
        }
        if (char === '\u0008' || char === '\u007f') {
          value = value.slice(0, -1)
          continue
        }
        value += char
      }
    }
    input.on('data', onData)
  })
}

function resolveDatabaseUrl(): string {
  const url = process.env.IDENTITY_DATABASE_URL || process.env.OPERATIONAL_DATABASE_URL || process.env.DATABASE_URL
  if (!url) throw new Error('IDENTITY_DATABASE_URL, OPERATIONAL_DATABASE_URL ou DATABASE_URL doit être défini dans backend/.env')
  return url
}

async function assertDatabaseTargetAllowed() {
  const productionLike = ['production', 'prod'].includes((process.env.NODE_ENV ?? '').toLowerCase())
    || ['production', 'prod'].includes((process.env.APP_ENV ?? '').toLowerCase())
  if (productionLike && process.env.CHPM_DPO_CONSOLE_ALLOW_PRODUCTION !== 'true') {
    throw new Error('Refusé : console DPO bloquée en production sauf CHPM_DPO_CONSOLE_ALLOW_PRODUCTION=true après validation formelle.')
  }
  if (!isLocalDatabaseUrl(databaseUrl)) {
    console.log(`\nAttention : la base ciblée ne semble pas locale : ${redactDatabaseUrl(databaseUrl)}`)
    await requireTypedConfirmation('Tapez "BASE DISTANTE DPO" pour continuer malgré ce risque', 'BASE DISTANTE DPO')
  }
}

function isLocalDatabaseUrl(rawUrl: string) {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase()
    return ['localhost', '127.0.0.1', '::1'].includes(host)
  } catch {
    return false
  }
}

function printBanner() {
  console.log('\nCHPM DPO Console')
  console.log('Console locale dédiée aux exports exceptionnels code-contact.')
  console.log('Accès réservé à un compte DPO actif, avec justification, référence de procédure, codes explicites, chiffrement et audit.')
  console.log('Recherche libre par email/téléphone et export massif non borné interdits.')
  console.log(`Base ciblée : ${redactDatabaseUrl(databaseUrl)}\n`)
}

function assertInteractiveTerminal() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Cette console doit être lancée depuis un terminal interactif local.')
}

function redactDatabaseUrl(rawUrl: string | undefined) {
  if (!rawUrl) return 'non définie'
  try {
    const url = new URL(rawUrl)
    if (url.password) url.password = '***'
    return url.toString()
  } catch {
    return rawUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@')
  }
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const key = match[1]
    const rawValue = match[2]
    if (!key || rawValue === undefined || process.env[key] !== undefined) continue
    process.env[key] = unquoteEnvValue(rawValue)
  }
}

function unquoteEnvValue(rawValue: string) {
  const value = rawValue.trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1)
  return value
}

function getOsUser() {
  try {
    return userInfo().username
  } catch {
    return process.env.USERNAME || process.env.USER || 'unknown'
  }
}

process.on('SIGINT', async () => {
  console.log('\nInterruption demandée.')
  await shutdown(130)
})

main()
  .then(() => shutdown(0))
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error)
    await shutdown(1)
  })

async function shutdown(code: number) {
  rl.close()
  await prisma.$disconnect().catch(() => undefined)
  process.exitCode = code
}
