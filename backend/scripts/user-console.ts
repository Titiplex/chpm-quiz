import { existsSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { randomInt } from 'node:crypto'
import { userInfo } from 'node:os'
import { join } from 'node:path'

// eslint-disable-next-line @typescript-eslint/no-require-imports
import bcrypt = require('bcryptjs')

import { roleProfiles, type UserRole } from '../src/auth/role-permissions'
import { loadPrismaClient } from '../src/prisma/prisma-client.loader'

const MANAGED_HUMAN_ROLES = [
  'admin',
  'site_manager',
  'moderator',
  'questionnaire_admin',
  'analyst',
  'dpo',
  'judicial_officer',
  'technical_admin',
] as const satisfies readonly UserRole[]

type ManagedHumanRole = (typeof MANAGED_HUMAN_ROLES)[number]
type Command = 'create' | 'disable' | 'reset-password' | 'list' | 'help' | 'exit'
type ScopeSelection = {
  organizationId: string | null
  siteId: string | null
  buildingId: string | null
  summary: string
}

type OrganizationRow = { id: string; code: string; name: string }
type SiteRow = { id: string; organizationId: string; code: string; name: string; organization: OrganizationRow }
type BuildingRow = {
  id: string
  organizationId: string
  siteId: string
  code: string
  label: string
  site: SiteRow
  organization: OrganizationRow
}
type UserWithScope = {
  id: string
  email: string
  displayName: string
  role: string
  isActive: boolean
  organization?: OrganizationRow | null
  site?: Pick<SiteRow, 'code' | 'name'> | null
  building?: Pick<BuildingRow, 'code' | 'label'> | null
} | null

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
      if (raw.trim() !== '') {
        console.log('Commande inconnue. Tape `help` pour afficher les commandes disponibles.')
      }
      continue
    }

    try {
      if (command === 'create') {
        await createOrUpdateUserWizard()
      } else if (command === 'disable') {
        await disableUserWizard()
      } else if (command === 'reset-password') {
        await resetPasswordWizard()
      } else if (command === 'list') {
        await listUsers()
      } else if (command === 'help') {
        printHelp()
      } else if (command === 'exit') {
        break
      }
    } catch (error) {
      console.error(`\nOpération annulée : ${error instanceof Error ? error.message : String(error)}\n`)
    }
  }
}

async function createOrUpdateUserWizard() {
  console.log('\nCréation / mise à jour sécurisée d’un compte interne.\n')

  const email = await promptEmail()
  const existingUser = await findUserByEmail(email)

  if (existingUser) {
    printUser(existingUser)
    const proceed = await confirm('Ce compte existe déjà. Le mettre à jour ?', 'NON')
    if (!proceed) {
      console.log('Aucune modification effectuée.\n')
      return
    }
  }

  const displayName = await promptRequired('Nom affiché', existingUser?.displayName ?? '')
  const role = await promptRole(existingUser?.role as ManagedHumanRole | undefined)
  const scope = await promptScopeForRole(role)
  const passwordResult = await promptPasswordChoice()

  await printMutationSummary({
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
          where: { email },
          data: {
            displayName,
            passwordHash,
            role,
            isActive: true,
            organizationId: scope.organizationId,
            siteId: scope.siteId,
            buildingId: scope.buildingId,
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
            siteId: scope.siteId,
            buildingId: scope.buildingId,
          },
        })

    await tx.session.deleteMany({ where: { userId: user.id } })
    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: existingUser ? 'user.console.update' : 'user.console.create',
        entityType: 'User',
        entityId: user.id,
        metadata: {
          source: 'local-user-console',
          osUser: getOsUser(),
          email,
          previousRole: existingUser?.role ?? null,
          nextRole: role,
          previousScope: existingUser ? formatExistingScope(existingUser) : null,
          nextScope: scope.summary,
          sessionsRevoked: true,
        },
        ipAddress: 'local-cli',
        userAgent: `chpm-user-console ${process.version}`,
      },
    })

    return user
  })

  console.log(`\nCompte ${existingUser ? 'mis à jour' : 'créé'} : ${savedUser.email}`)
  console.log('Les sessions existantes de ce compte ont été révoquées.')
  if (passwordResult.generated) {
    console.log(`Mot de passe temporaire à transmettre par canal sûr : ${passwordResult.password}`)
    console.log('Ce mot de passe n’est pas stocké en clair et ne sera plus affiché.')
  }
  console.log('')
}

async function disableUserWizard() {
  console.log('\nDésactivation d’un compte interne.\n')

  const email = await promptEmail()
  const user = await findUserByEmail(email)

  if (!user) {
    throw new Error('Aucun utilisateur trouvé avec cet email.')
  }

  assertManagedHumanRole(user.role)
  printUser(user)

  if (!user.isActive) {
    console.log('Ce compte est déjà désactivé.\n')
    return
  }

  if (user.role === 'admin') {
    const remainingAdmins = await prisma.user.count({
      where: {
        role: 'admin',
        isActive: true,
        NOT: { id: user.id },
      },
    })

    if (remainingAdmins === 0) {
      throw new Error('Refusé : impossible de désactiver le dernier administrateur global actif.')
    }
  }

  await requireTypedConfirmation('Tapez "DESACTIVER" pour désactiver ce compte', 'DESACTIVER')

  await prisma.$transaction(async (tx: any) => {
    await tx.user.update({
      where: { id: user.id },
      data: { isActive: false },
    })
    await tx.session.deleteMany({ where: { userId: user.id } })
    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: 'user.console.disable',
        entityType: 'User',
        entityId: user.id,
        metadata: {
          source: 'local-user-console',
          osUser: getOsUser(),
          email: user.email,
          role: user.role,
          scope: formatExistingScope(user),
          sessionsRevoked: true,
        },
        ipAddress: 'local-cli',
        userAgent: `chpm-user-console ${process.version}`,
      },
    })
  })

  console.log(`\nCompte désactivé : ${user.email}`)
  console.log('Les sessions existantes de ce compte ont été révoquées.\n')
}

async function resetPasswordWizard() {
  console.log('\nRéinitialisation sécurisée du mot de passe.\n')

  const email = await promptEmail()
  const user = await findUserByEmail(email)

  if (!user) {
    throw new Error('Aucun utilisateur trouvé avec cet email.')
  }

  assertManagedHumanRole(user.role)
  printUser(user)

  const passwordResult = await promptPasswordChoice()
  await requireTypedConfirmation('Tapez "RESET" pour changer le mot de passe et révoquer les sessions', 'RESET')

  const passwordHash = await hashPassword(passwordResult.password)

  await prisma.$transaction(async (tx: any) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })
    await tx.session.deleteMany({ where: { userId: user.id } })
    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action: 'user.console.resetPassword',
        entityType: 'User',
        entityId: user.id,
        metadata: {
          source: 'local-user-console',
          osUser: getOsUser(),
          email: user.email,
          role: user.role,
          scope: formatExistingScope(user),
          sessionsRevoked: true,
        },
        ipAddress: 'local-cli',
        userAgent: `chpm-user-console ${process.version}`,
      },
    })
  })

  console.log(`\nMot de passe réinitialisé : ${user.email}`)
  console.log('Les sessions existantes de ce compte ont été révoquées.')
  if (passwordResult.generated) {
    console.log(`Mot de passe temporaire à transmettre par canal sûr : ${passwordResult.password}`)
    console.log('Ce mot de passe n’est pas stocké en clair et ne sera plus affiché.')
  }
  console.log('')
}

async function listUsers() {
  const users = await prisma.user.findMany({
    where: {
      role: { in: [...MANAGED_HUMAN_ROLES] },
    },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
    include: {
      organization: true,
      site: true,
      building: true,
    },
  })

  if (users.length === 0) {
    console.log('\nAucun compte interne trouvé.\n')
    return
  }

  console.log('\nComptes internes :')
  for (const user of users) {
    console.log(
      `- ${user.email} | ${user.displayName} | ${roleProfiles[user.role as UserRole]?.shortLabel ?? user.role} | ${
        user.isActive ? 'actif' : 'désactivé'
      } | ${formatExistingScope(user)}`,
    )
  }
  console.log('')
}

async function promptEmail(): Promise<string> {
  while (true) {
    const email = (await promptRequired('Email')).trim().toLowerCase()
    if (emailRegex.test(email)) {
      return email
    }
    console.log('Format email invalide.')
  }
}

async function promptRole(defaultRole?: ManagedHumanRole): Promise<ManagedHumanRole> {
  console.log('\nRôles disponibles :')
  MANAGED_HUMAN_ROLES.forEach((role, index) => {
    const profile = roleProfiles[role]
    const defaultMarker = defaultRole === role ? ' [défaut]' : ''
    console.log(`${index + 1}. ${profile.label} (${role}) — ${profile.scopeLabel}${defaultMarker}`)
  })

  while (true) {
    const raw = (await ask(`Rôle${defaultRole ? ` [${defaultRole}]` : ''} : `)).trim().toLowerCase()
    if (raw === '' && defaultRole) {
      return defaultRole
    }

    const byIndex = Number(raw)
    if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= MANAGED_HUMAN_ROLES.length) {
      const selectedRole = MANAGED_HUMAN_ROLES[byIndex - 1]
      if (selectedRole) {
        return selectedRole
      }
    }

    const byName = MANAGED_HUMAN_ROLES.find((role) => role === raw)
    if (byName) {
      return byName
    }

    console.log('Choisir un numéro ou un identifiant de rôle valide.')
  }
}

async function promptScopeForRole(role: ManagedHumanRole): Promise<ScopeSelection> {
  if (role === 'moderator') {
    const building = await selectBuilding()
    return {
      organizationId: building.organizationId,
      siteId: building.siteId,
      buildingId: building.id,
      summary: `bâtiment ${building.code} — ${building.label}`,
    }
  }

  if (role === 'site_manager') {
    const site = await selectSite()
    return {
      organizationId: site.organizationId,
      siteId: site.id,
      buildingId: null,
      summary: `site ${site.code} — ${site.name}`,
    }
  }

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
    const useDefault = await confirm(`Affecter à l’organisation ${organization.code} — ${organization.name} ?`, 'OUI')
    return useDefault ? organization : null
  }

  console.log('\nOrganisations disponibles :')
  organizations.forEach((organization, index) => {
    console.log(`${index + 1}. ${organization.code} — ${organization.name}`)
  })
  console.log('0. Aucune organisation explicite')

  while (true) {
    const raw = (await ask('Organisation : ')).trim().toLowerCase()
    if (raw === '0' || raw === '-' || raw === 'aucune') {
      return null
    }

    const organization = findByIndexOrCode(organizations, raw, 'code')
    if (organization) {
      return organization
    }

    console.log('Choisir un numéro, un code, ou 0.')
  }
}

async function selectSite() {
  const sites = (await prisma.site.findMany({
    orderBy: { code: 'asc' },
    include: { organization: true },
  })) as SiteRow[]

  if (sites.length === 0) {
    throw new Error('Aucun site trouvé. Crée ou seed les sites avant de créer un gestionnaire de site.')
  }

  console.log('\nSites disponibles :')
  sites.forEach((site, index) => {
    console.log(`${index + 1}. ${site.code} — ${site.name} (${site.organization.code})`)
  })

  while (true) {
    const raw = (await ask('Site : ')).trim().toLowerCase()
    const site = findByIndexOrCode(sites, raw, 'code')
    if (site) {
      return site
    }

    console.log('Choisir un numéro ou un code de site valide.')
  }
}

async function selectBuilding() {
  const buildings = (await prisma.building.findMany({
    orderBy: { code: 'asc' },
    include: { site: true, organization: true },
  })) as BuildingRow[]

  if (buildings.length === 0) {
    throw new Error('Aucun bâtiment trouvé. Crée ou seed les bâtiments avant de créer un modérateur.')
  }

  console.log('\nBâtiments disponibles :')
  buildings.forEach((building, index) => {
    console.log(`${index + 1}. ${building.code} — ${building.label} (${building.site.code}, ${building.organization.code})`)
  })

  while (true) {
    const raw = (await ask('Bâtiment : ')).trim().toLowerCase()
    const building = findByIndexOrCode(buildings, raw, 'code')
    if (building) {
      return building
    }

    console.log('Choisir un numéro ou un code de bâtiment valide.')
  }
}

async function promptPasswordChoice(): Promise<{ password: string; generated: boolean }> {
  const generate = await confirm('Générer un mot de passe temporaire fort automatiquement ?', 'OUI')

  if (generate) {
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
    if (!error) {
      return { password, generated: false }
    }

    console.log(error)
  }
}

async function findUserByEmail(email: string) {
  return (await prisma.user.findUnique({
    where: { email },
    include: {
      organization: true,
      site: true,
      building: true,
    },
  })) as UserWithScope
}

function findByIndexOrCode<T extends Record<string, unknown>>(items: T[], raw: string, codeField: keyof T): T | null {
  const byIndex = Number(raw)
  if (Number.isInteger(byIndex) && byIndex >= 1 && byIndex <= items.length) {
    return items[byIndex - 1] ?? null
  }

  return items.find((item) => String(item[codeField]).toLowerCase() === raw) ?? null
}

async function printMutationSummary(input: {
  action: string
  email: string
  displayName: string
  role: ManagedHumanRole
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

function formatExistingScope(user: {
  organization?: { code: string; name: string } | null
  site?: { code: string; name: string } | null
  building?: { code: string; label: string } | null
}) {
  if (user.building) {
    return `bâtiment ${user.building.code} — ${user.building.label}`
  }

  if (user.site) {
    return `site ${user.site.code} — ${user.site.name}`
  }

  if (user.organization) {
    return `organisation ${user.organization.code} — ${user.organization.name}`
  }

  return 'global sans organisation explicite'
}

function assertManagedHumanRole(role: string): asserts role is ManagedHumanRole {
  if (!MANAGED_HUMAN_ROLES.includes(role as ManagedHumanRole)) {
    throw new Error(`Le rôle ${role} n’est pas géré par cette console humaine.`)
  }
}

function validatePassword(password: string): string | null {
  if (password.length < 12) {
    return 'Le mot de passe doit contenir au moins 12 caractères.'
  }
  if (!/[a-z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une minuscule.'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une majuscule.'
  }
  if (!/\d/.test(password)) {
    return 'Le mot de passe doit contenir au moins un chiffre.'
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un caractère spécial.'
  }
  return null
}

function generateStrongPassword(): string {
  const groups = [
    'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'abcdefghijkmnopqrstuvwxyz',
    '23456789',
    '!@#$%*-_=+?',
  ]

  const chars = groups.join('')
  const password = groups.map((group) => pickChar(group))

  while (password.length < generatedPasswordLength) {
    password.push(pickChar(chars))
  }

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
  if (!char) {
    throw new Error('jeu de caractères vide pour génération de mot de passe')
  }
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
    if (value !== '') {
      return value
    }
    if (defaultValue !== '') {
      return defaultValue
    }
    console.log('Valeur obligatoire.')
  }
}

async function confirm(question: string, defaultAnswer: 'OUI' | 'NON'): Promise<boolean> {
  const suffix = defaultAnswer === 'OUI' ? ' [O/n] ' : ' [o/N] '
  const answer = (await ask(`${question}${suffix}`)).trim().toLowerCase()

  if (answer === '') {
    return defaultAnswer === 'OUI'
  }

  return ['o', 'oui', 'y', 'yes'].includes(answer)
}

async function requireTypedConfirmation(label: string, expected: string) {
  const value = (await ask(`${label} : `)).trim()
  if (value !== expected) {
    throw new Error('confirmation textuelle invalide')
  }
}

async function ask(question: string): Promise<string> {
  return rl.question(question)
}

async function askHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error('saisie masquée indisponible hors terminal interactif')
  }

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
  const url = process.env.OPERATIONAL_DATABASE_URL || process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL ou OPERATIONAL_DATABASE_URL doit être défini dans backend/.env')
  }
  return url
}

async function assertDatabaseTargetAllowed() {
  const productionLike = ['production', 'prod'].includes((process.env.NODE_ENV ?? '').toLowerCase())
    || ['production', 'prod'].includes((process.env.APP_ENV ?? '').toLowerCase())

  if (productionLike && process.env.CHPM_USER_CONSOLE_ALLOW_PRODUCTION !== 'true') {
    throw new Error(
      'Refusé : cette console est bloquée en environnement production. Définir CHPM_USER_CONSOLE_ALLOW_PRODUCTION=true uniquement après validation d’exploitation.',
    )
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
  console.log('Console locale de gestion des comptes internes à responsabilité.')
  console.log(`Base ciblée : ${redactDatabaseUrl(databaseUrl)}`)
  console.log('Aucun compte répondant ni service account n’est créé par cette console.')
  console.log('')
}

function printHelp() {
  console.log('Commandes :')
  console.log('- create          créer ou mettre à jour un admin, modérateur, DPO, analyste, etc.')
  console.log('- disable         désactiver un compte interne et révoquer ses sessions')
  console.log('- reset-password  réinitialiser le mot de passe et révoquer les sessions')
  console.log('- list            lister les comptes internes sans secrets')
  console.log('- help            afficher cette aide')
  console.log('- exit            quitter')
  console.log('')
}

function assertInteractiveTerminal() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Cette console doit être lancée depuis un terminal interactif local.')
  }
}

function redactDatabaseUrl(rawUrl: string | undefined) {
  if (!rawUrl) {
    return 'non définie'
  }

  try {
    const url = new URL(rawUrl)
    if (url.password) {
      url.password = '***'
    }
    return url.toString()
  } catch {
    return rawUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@')
  }
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) {
    return
  }

  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) {
      continue
    }

    const key = match[1]
    const rawValue = match[2]
    if (!key || rawValue === undefined || process.env[key] !== undefined) {
      continue
    }

    process.env[key] = unquoteEnvValue(rawValue)
  }
}

function unquoteEnvValue(rawValue: string) {
  const value = rawValue.trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
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
