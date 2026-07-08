import { existsSync, readFileSync } from 'node:fs'
import { randomInt } from 'node:crypto'
import { userInfo } from 'node:os'
import { join } from 'node:path'
import { stdin as input, stdout as output } from 'node:process'
import { createInterface } from 'node:readline/promises'

// eslint-disable-next-line @typescript-eslint/no-require-imports
import bcrypt = require('bcryptjs')

import { roleProfiles, type UserRole } from '../src/auth/role-permissions'
import { loadPrismaClient } from '../src/prisma/prisma-client.loader'

const SENSITIVE_CONSOLE_ROLES = ['admin', 'dpo', 'technical_admin'] as const satisfies readonly UserRole[]
type SensitiveConsoleRole = (typeof SENSITIVE_CONSOLE_ROLES)[number]
type Command = 'create' | 'disable' | 'reset-password' | 'revoke-sessions' | 'list' | 'help' | 'exit'

type OrganizationRow = { id: string; code: string; name: string }
type UserWithScope = {
  id: string
  email: string
  displayName: string
  role: string
  isActive: boolean
  organization?: OrganizationRow | null
} | null

type ScopeSelection = {
  organizationId: string | null
  siteId: null
  buildingId: null
  summary: string
}

const commandAliases: Record<string, Command> = {
  c: 'create',
  create: 'create',
  creer: 'create',
  créer: 'create',
  add: 'create',
  ajouter: 'create',
  d: 'disable',
  disable: 'disable',
  desactiver: 'disable',
  désactiver: 'disable',
  reset: 'reset-password',
  'reset-password': 'reset-password',
  password: 'reset-password',
  mdp: 'reset-password',
  revoke: 'revoke-sessions',
  revoke_sessions: 'revoke-sessions',
  'revoke-sessions': 'revoke-sessions',
  sessions: 'revoke-sessions',
  l: 'list',
  list: 'list',
  liste: 'list',
  h: 'help',
  help: 'help',
  aide: 'help',
  q: 'exit',
  quit: 'exit',
  exit: 'exit',
  sortir: 'exit',
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const generatedPasswordLength = 20

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
  printHelp()

  while (true) {
    const raw = await ask('chpm-users>> ')
    const command = commandAliases[raw.trim().toLowerCase()]

    if (!command) {
      if (raw.trim() !== '') console.log('Commande inconnue. Tape `help`.')
      continue
    }

    try {
      if (command === 'create') await createOrUpdateSensitiveUserWizard()
      else if (command === 'disable') await disableSensitiveUserWizard()
      else if (command === 'reset-password') await resetSensitivePasswordWizard()
      else if (command === 'revoke-sessions') await revokeSensitiveSessionsWizard()
      else if (command === 'list') await listSensitiveUsers()
      else if (command === 'help') printHelp()
      else if (command === 'exit') break
    } catch (error) {
      console.error(`\nOpération annulée : ${error instanceof Error ? error.message : String(error)}\n`)
    }
  }
}

async function createOrUpdateSensitiveUserWizard() {
  console.log('\nCréation / mise à jour d’un compte sensible local. Cette console ne crée pas de responsables de site ni de modérateurs.\n')

  const email = await promptEmail()
  const existingUser = await findUserByEmail(email)
  if (existingUser) {
    printUser(existingUser)
    assertSensitiveConsoleRole(existingUser.role)
    const proceed = await confirm('Ce compte sensible existe déjà. Le mettre à jour ?', 'NON')
    if (!proceed) {
      console.log('Aucune modification effectuée.\n')
      return
    }
  }

  const displayName = await promptRequired('Nom affiché', existingUser?.displayName ?? '')
  const role = await promptSensitiveRole(existingUser?.role as SensitiveConsoleRole | undefined)
  const scope = await promptOrganizationScope()
  const passwordResult = await promptPasswordChoice()

  printSensitiveMutationSummary({
    action: existingUser ? 'Mise à jour' : 'Création',
    email,
    displayName,
    role,
    scope,
    passwordMode: passwordResult.generated ? 'généré automatiquement' : 'saisi manuellement',
  })

  const confirmationWord = existingUser ? 'METTRE A JOUR' : 'CREER'
  await requireTypedConfirmation(`Tapez "${confirmationWord}" pour appliquer`, confirmationWord)

  const passwordHash = await hashPassword(passwordResult.password)
  const savedUser = await prisma.$transaction(async (tx: any) => {
    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            displayName,
            passwordHash,
            role,
            isActive: true,
            organizationId: scope.organizationId,
            siteId: null,
            buildingId: null,
          },
        })
      : await tx.user.create({
          data: {
            email,
            displayName,
            passwordHash,
            role,
            isActive: true,
            organizationId: scope.organizationId,
            siteId: null,
            buildingId: null,
          },
        })

    await tx.session.deleteMany({ where: { userId: user.id } })
    await writeConsoleAudit(tx, existingUser ? 'user.console.sensitive.update' : 'user.console.sensitive.create', user.id, {
      email,
      previousRole: existingUser?.role ?? null,
      nextRole: role,
      previousScope: existingUser ? formatExistingScope(existingUser) : null,
      nextScope: scope.summary,
      sessionsRevoked: true,
    })
    return user
  })

  console.log(`\nCompte sensible ${existingUser ? 'mis à jour' : 'créé'} : ${savedUser.email}`)
  console.log('Les sessions existantes ont été révoquées.')
  if (passwordResult.generated) {
    console.log(`Mot de passe temporaire à transmettre par canal sûr : ${passwordResult.password}`)
    console.log('Ce mot de passe n’est pas stocké en clair et ne sera plus affiché.')
  }
  console.log('')
}

async function disableSensitiveUserWizard() {
  console.log('\nDésactivation d’un compte sensible.\n')
  const user = await promptSensitiveUser()

  if (!user.isActive) {
    console.log('Ce compte est déjà désactivé.\n')
    return
  }

  if (user.role === 'admin') {
    const remainingAdmins = await prisma.user.count({
      where: { role: 'admin', isActive: true, NOT: { id: user.id } },
    })
    if (remainingAdmins === 0) throw new Error('Refusé : impossible de désactiver le dernier administrateur projet actif.')
  }

  await requireTypedConfirmation('Tapez "DESACTIVER" pour désactiver et révoquer les sessions', 'DESACTIVER')

  await prisma.$transaction(async (tx: any) => {
    await tx.user.update({ where: { id: user.id }, data: { isActive: false } })
    const revoked = await tx.session.deleteMany({ where: { userId: user.id } })
    await writeConsoleAudit(tx, 'user.console.sensitive.disable', user.id, {
      email: user.email,
      role: user.role,
      scope: formatExistingScope(user),
      sessionsRevoked: true,
      revokedSessionCount: revoked.count,
    })
  })

  console.log(`\nCompte désactivé : ${user.email}`)
  console.log('Les sessions existantes ont été révoquées.\n')
}

async function resetSensitivePasswordWizard() {
  console.log('\nRéinitialisation d’un mot de passe de compte sensible.\n')
  const user = await promptSensitiveUser()
  const passwordResult = await promptPasswordChoice()
  await requireTypedConfirmation('Tapez "RESET" pour changer le mot de passe et révoquer les sessions', 'RESET')

  const passwordHash = await hashPassword(passwordResult.password)
  await prisma.$transaction(async (tx: any) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash, isActive: true } })
    const revoked = await tx.session.deleteMany({ where: { userId: user.id } })
    await writeConsoleAudit(tx, 'user.console.sensitive.resetPassword', user.id, {
      email: user.email,
      role: user.role,
      scope: formatExistingScope(user),
      sessionsRevoked: true,
      revokedSessionCount: revoked.count,
    })
  })

  console.log(`\nMot de passe réinitialisé : ${user.email}`)
  if (passwordResult.generated) console.log(`Mot de passe temporaire à transmettre par canal sûr : ${passwordResult.password}`)
  console.log('Les sessions existantes ont été révoquées.\n')
}

async function revokeSensitiveSessionsWizard() {
  console.log('\nRévocation des sessions d’un compte sensible.\n')
  const user = await promptSensitiveUser()
  await requireTypedConfirmation('Tapez "REVOQUER" pour révoquer les sessions', 'REVOQUER')

  const revoked = await prisma.$transaction(async (tx: any) => {
    const result = await tx.session.deleteMany({ where: { userId: user.id } })
    await writeConsoleAudit(tx, 'user.console.sensitive.revokeSessions', user.id, {
      email: user.email,
      role: user.role,
      scope: formatExistingScope(user),
      sessionsRevoked: true,
      revokedSessionCount: result.count,
    })
    return result
  })

  console.log(`\nSessions révoquées pour ${user.email} : ${revoked.count}.\n`)
}

async function listSensitiveUsers() {
  const users = await prisma.user.findMany({
    where: { role: { in: [...SENSITIVE_CONSOLE_ROLES] } },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
    include: { organization: true },
  })

  if (users.length === 0) {
    console.log('\nAucun compte sensible trouvé.\n')
    return
  }

  console.log('\nComptes sensibles :')
  for (const user of users) {
    console.log(`- ${user.email} | ${user.displayName} | ${roleProfiles[user.role as UserRole]?.shortLabel ?? user.role} | ${user.isActive ? 'actif' : 'désactivé'} | ${formatExistingScope(user)}`)
  }
  console.log('')
}

async function promptSensitiveUser() {
  const email = await promptEmail()
  const user = await findUserByEmail(email)
  if (!user) throw new Error('Aucun utilisateur trouvé avec cet email.')
  assertSensitiveConsoleRole(user.role)
  printUser(user)
  return user
}

async function promptEmail(): Promise<string> {
  while (true) {
    const email = (await promptRequired('Email')).trim().toLowerCase()
    if (emailRegex.test(email)) return email
    console.log('Format email invalide.')
  }
}

async function promptSensitiveRole(defaultRole?: SensitiveConsoleRole): Promise<SensitiveConsoleRole> {
  console.log('\nRôles sensibles créables localement :')
  SENSITIVE_CONSOLE_ROLES.forEach((role, index) => {
    const profile = roleProfiles[role]
    const marker = defaultRole === role ? ' [défaut]' : ''
    console.log(`${index + 1}. ${profile.label} (${role}) — ${profile.scopeLabel}${marker}`)
  })

  while (true) {
    const raw = (await ask(`Rôle${defaultRole ? ` [${defaultRole}]` : ''} : `)).trim().toLowerCase()
    if (raw === '' && defaultRole) return defaultRole
    const byIndex = Number(raw)
    if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= SENSITIVE_CONSOLE_ROLES.length) {
      return SENSITIVE_CONSOLE_ROLES[byIndex - 1]!
    }
    const byName = SENSITIVE_CONSOLE_ROLES.find((role) => role === raw)
    if (byName) return byName
    console.log('Choisir un numéro ou un identifiant de rôle sensible valide.')
  }
}

async function promptOrganizationScope(): Promise<ScopeSelection> {
  const organization = await selectOrganizationOptional()
  return {
    organizationId: organization?.id ?? null,
    siteId: null,
    buildingId: null,
    summary: organization ? `organisation ${organization.code} — ${organization.name}` : 'global sans organisation explicite',
  }
}

async function selectOrganizationOptional() {
  const organizations = (await prisma.organization.findMany({ orderBy: { code: 'asc' } })) as OrganizationRow[]
  if (organizations.length === 0) {
    console.log('\nAucune organisation trouvée : le compte sera global sans organisation explicite.')
    return null
  }
  if (organizations.length === 1) {
    const organization = organizations[0]!
    return (await confirm(`Affecter à l’organisation ${organization.code} — ${organization.name} ?`, 'OUI')) ? organization : null
  }

  console.log('\nOrganisations disponibles :')
  organizations.forEach((organization, index) => console.log(`${index + 1}. ${organization.code} — ${organization.name}`))
  console.log('0. Aucune organisation explicite')

  while (true) {
    const raw = (await ask('Organisation : ')).trim().toLowerCase()
    if (raw === '0' || raw === '-' || raw === 'aucune') return null
    const organization = findByIndexOrCode(organizations, raw, 'code')
    if (organization) return organization
    console.log('Choisir un numéro, un code, ou 0.')
  }
}

async function promptPasswordChoice(): Promise<{ password: string; generated: boolean }> {
  if (await confirm('Générer un mot de passe temporaire fort automatiquement ?', 'OUI')) {
    return { password: generateStrongPassword(), generated: true }
  }

  while (true) {
    const password = await askHidden('Mot de passe : ')
    const confirmation = await askHidden('Confirmation : ')
    if (password !== confirmation) {
      console.log('Les deux mots de passe ne correspondent pas.')
      continue
    }
    const error = validatePassword(password)
    if (!error) return { password, generated: false }
    console.log(error)
  }
}

async function findUserByEmail(email: string) {
  return (await prisma.user.findUnique({
    where: { email },
    include: { organization: true },
  })) as UserWithScope
}

function findByIndexOrCode<T extends Record<string, unknown>>(items: T[], raw: string, codeField: keyof T): T | null {
  const byIndex = Number(raw)
  if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= items.length) return items[byIndex - 1] ?? null
  return items.find((item) => String(item[codeField]).toLowerCase() === raw) ?? null
}

function printSensitiveMutationSummary(input: {
  action: string
  email: string
  displayName: string
  role: SensitiveConsoleRole
  scope: ScopeSelection
  passwordMode: string
}) {
  const profile = roleProfiles[input.role]
  console.log('\nRésumé avant application :')
  console.log(`- Action : ${input.action}`)
  console.log(`- Email : ${input.email}`)
  console.log(`- Nom affiché : ${input.displayName}`)
  console.log(`- Rôle : ${profile.label} (${input.role})`)
  console.log(`- Périmètre : ${input.scope.summary}`)
  console.log(`- Mot de passe : ${input.passwordMode}`)
  console.log('- Création de DPO séparée de la création admin projet : oui')
  console.log('- Responsables de site / modérateurs : non gérés ici, à gérer via le frontend selon la hiérarchie')
  console.log('- Audit : oui, action journalisée dans audit_logs')
  console.log('- Sessions existantes : révoquées')
}

function printUser(user: NonNullable<UserWithScope>) {
  console.log('\nCompte trouvé :')
  console.log(`- Email : ${user.email}`)
  console.log(`- Nom affiché : ${user.displayName}`)
  console.log(`- Rôle : ${roleProfiles[user.role as UserRole]?.label ?? user.role}`)
  console.log(`- Statut : ${user.isActive ? 'actif' : 'désactivé'}`)
  console.log(`- Périmètre : ${formatExistingScope(user)}`)
  console.log('')
}

function formatExistingScope(user: { organization?: { code: string; name: string } | null }) {
  return user.organization ? `organisation ${user.organization.code} — ${user.organization.name}` : 'global sans organisation explicite'
}

function assertSensitiveConsoleRole(role: string): asserts role is SensitiveConsoleRole {
  if (!SENSITIVE_CONSOLE_ROLES.includes(role as SensitiveConsoleRole)) {
    throw new Error(`Le rôle ${role} n’est pas géré par cette console. Les responsables de site sont gérés par les admins projet dans le frontend ; les modérateurs par les responsables de site.`)
  }
}

function validatePassword(password: string): string | null {
  if (password.length < 12) return 'Le mot de passe doit contenir au moins 12 caractères.'
  if (!/[a-z]/.test(password)) return 'Le mot de passe doit contenir au moins une minuscule.'
  if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir au moins une majuscule.'
  if (!/\d/.test(password)) return 'Le mot de passe doit contenir au moins un chiffre.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un caractère spécial.'
  return null
}

function generateStrongPassword(): string {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%*-_=+?']
  const chars = groups.join('')
  const password = groups.map((group) => pickChar(group))
  while (password.length < generatedPasswordLength) password.push(pickChar(chars))
  for (let index = password.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    const current = password[index]
    const other = password[swapIndex]
    if (current !== undefined && other !== undefined) {
      password[index] = other
      password[swapIndex] = current
    }
  }
  return password.join('')
}

function pickChar(chars: string): string {
  const char = chars[randomInt(chars.length)]
  if (!char) throw new Error('jeu de caractères vide pour génération de mot de passe')
  return char
}

async function hashPassword(password: string) {
  const rounds = Math.min(Math.max(Number(process.env.PASSWORD_BCRYPT_ROUNDS ?? '12'), 12), 14)
  return bcrypt.hash(password, rounds)
}

async function promptRequired(label: string, defaultValue = ''): Promise<string> {
  while (true) {
    const suffix = defaultValue ? ` [${defaultValue}]` : ''
    const value = (await ask(`${label}${suffix} : `)).trim()
    if (value !== '') return value
    if (defaultValue !== '') return defaultValue
    console.log('Valeur obligatoire.')
  }
}

async function confirm(question: string, defaultAnswer: 'OUI' | 'NON'): Promise<boolean> {
  const suffix = defaultAnswer === 'OUI' ? ' [O/n] ' : ' [o/N] '
  const answer = (await ask(`${question}${suffix}`)).trim().toLowerCase()
  if (answer === '') return defaultAnswer === 'OUI'
  return ['o', 'oui', 'y', 'yes'].includes(answer)
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

async function writeConsoleAudit(tx: any, action: string, entityId: string, metadata: Record<string, unknown>) {
  await tx.auditLog.create({
    data: {
      actorUserId: null,
      action,
      entityType: 'User',
      entityId,
      metadata: {
        source: 'local-sensitive-user-console',
        osUser: getOsUser(),
        denyByDefault: true,
        ...metadata,
      },
      ipAddress: 'local-cli',
      userAgent: `chpm-user-console ${process.version}`,
    },
  })
}

function resolveDatabaseUrl(): string {
  const url = process.env.OPERATIONAL_DATABASE_URL || process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL ou OPERATIONAL_DATABASE_URL doit être défini dans backend/.env')
  return url
}

async function assertDatabaseTargetAllowed() {
  const productionLike = ['production', 'prod'].includes((process.env.NODE_ENV ?? '').toLowerCase())
    || ['production', 'prod'].includes((process.env.APP_ENV ?? '').toLowerCase())
  if (productionLike && process.env.CHPM_USER_CONSOLE_ALLOW_PRODUCTION !== 'true') {
    throw new Error('Refusé : console bloquée en production sauf CHPM_USER_CONSOLE_ALLOW_PRODUCTION=true après validation exploitation.')
  }
  if (!isLocalDatabaseUrl(databaseUrl)) {
    console.log(`\nAttention : la base ciblée ne semble pas locale : ${redactDatabaseUrl(databaseUrl)}`)
    await requireTypedConfirmation('Tapez "BASE DISTANTE" pour continuer malgré ce risque', 'BASE DISTANTE')
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
  console.log('\nCHPM User Console')
  console.log('Console locale de nomination des administrateurs projet / chercheurs, DPO et administrateurs techniques.')
  console.log(`Base ciblée : ${redactDatabaseUrl(databaseUrl)}`)
  console.log('Les responsables de site sont créés par les administrateurs projet dans le frontend.')
  console.log('Les modérateurs sont créés par les responsables de site dans le frontend.')
  console.log('Aucun compte répondant ni service account n’est créé ici.\n')
}

function printHelp() {
  console.log('Commandes :')
  console.log('- create            créer ou mettre à jour un admin projet, DPO ou admin technique')
  console.log('- disable           désactiver un compte sensible et révoquer ses sessions')
  console.log('- reset-password    réinitialiser le mot de passe et révoquer les sessions')
  console.log('- revoke-sessions   révoquer les sessions sans changer le mot de passe')
  console.log('- list              lister les comptes sensibles sans secrets')
  console.log('- help              afficher cette aide')
  console.log('- exit              quitter\n')
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
