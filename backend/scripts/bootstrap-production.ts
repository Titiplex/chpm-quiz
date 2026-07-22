import { randomBytes } from 'node:crypto'

// eslint-disable-next-line @typescript-eslint/no-require-imports
import bcrypt = require('bcryptjs')

import { loadPrismaClient } from '../src/prisma/prisma-client.loader'

const required = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

const organizationCode = required('BOOTSTRAP_ORGANIZATION_CODE').toUpperCase()
const organizationName = required('BOOTSTRAP_ORGANIZATION_NAME')
const siteCode = required('BOOTSTRAP_SITE_CODE').toUpperCase()
const siteName = required('BOOTSTRAP_SITE_NAME')
const buildingCode = required('BOOTSTRAP_BUILDING_CODE').toUpperCase()
const buildingLabel = required('BOOTSTRAP_BUILDING_LABEL')
const city = required('BOOTSTRAP_CITY')
const country = required('BOOTSTRAP_COUNTRY')
const timezone = required('BOOTSTRAP_TIMEZONE')
const adminEmail = required('BOOTSTRAP_ADMIN_EMAIL').toLowerCase()
const adminDisplayName = required('BOOTSTRAP_ADMIN_DISPLAY_NAME')
const adminPassword = required('BOOTSTRAP_ADMIN_PASSWORD')

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new Error('BOOTSTRAP_ADMIN_EMAIL is invalid')
if (adminPassword.length < 16 || !/[a-z]/.test(adminPassword) || !/[A-Z]/.test(adminPassword) || !/\d/.test(adminPassword) || !/[^A-Za-z0-9]/.test(adminPassword)) {
  throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 16 characters, upper/lower case, a number and a symbol')
}

const PrismaClientBase = loadPrismaClient()
const prisma = new PrismaClientBase({ datasourceUrl: process.env.OPERATIONAL_DATABASE_URL ?? process.env.DATABASE_URL })

async function main() {
  await prisma.$connect()
  const passwordHash = await bcrypt.hash(adminPassword, Math.min(Math.max(Number(process.env.PASSWORD_BCRYPT_ROUNDS ?? '12'), 12), 14))

  const result = await prisma.$transaction(async (tx: any) => {
    const organization = await tx.organization.upsert({
      where: { code: organizationCode },
      update: { name: organizationName },
      create: { code: organizationCode, name: organizationName },
    })
    const site = await tx.site.upsert({
      where: { code: siteCode },
      update: { organizationId: organization.id, name: siteName, country, timezone },
      create: { organizationId: organization.id, code: siteCode, name: siteName, country, timezone },
    })
    const building = await tx.building.upsert({
      where: { code: buildingCode },
      update: { organizationId: organization.id, siteId: site.id, label: buildingLabel, city, country, timezone },
      create: { organizationId: organization.id, siteId: site.id, code: buildingCode, label: buildingLabel, city, country, timezone },
    })
    const existing = await tx.user.findUnique({ where: { email: adminEmail } })
    if (existing && existing.role !== 'admin') {
      throw new Error('BOOTSTRAP_ADMIN_EMAIL already belongs to a non-admin account')
    }
    const admin = await tx.user.upsert({
      where: { email: adminEmail },
      update: {
        displayName: adminDisplayName,
        passwordHash,
        role: 'admin',
        isActive: true,
        mustChangePassword: true,
        failedLoginCount: 0,
        lockedUntil: null,
        organizationId: organization.id,
        siteId: null,
        buildingId: null,
      },
      create: {
        email: adminEmail,
        displayName: adminDisplayName,
        passwordHash,
        role: 'admin',
        isActive: true,
        mustChangePassword: true,
        organizationId: organization.id,
      },
    })
    await tx.session.deleteMany({ where: { userId: admin.id } })
    await tx.auditLog.create({
      data: {
        actorUserId: admin.id,
        organizationId: organization.id,
        action: 'installation.bootstrap',
        entityType: 'Organization',
        entityId: organization.id,
        metadata: {
          nonce: randomBytes(8).toString('hex'),
          siteId: site.id,
          buildingId: building.id,
          adminUserId: admin.id,
          sessionsRevoked: true,
        },
      },
    })
    return { organization, site, building, admin }
  })

  console.log(JSON.stringify({
    status: 'ready',
    organization: result.organization.code,
    site: result.site.code,
    building: result.building.code,
    admin: result.admin.email,
    passwordChangeRequired: true,
  }))
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
