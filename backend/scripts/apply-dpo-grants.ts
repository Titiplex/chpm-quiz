import { loadPrismaClient } from '../src/prisma/prisma-client.loader'

const databaseUrl = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('MIGRATION_DATABASE_URL or DATABASE_URL is required to apply DPO grants')
}

const PrismaClientBase = loadPrismaClient()
const prisma = new PrismaClientBase({ datasourceUrl: databaseUrl })

const statements = [
  'GRANT USAGE ON SCHEMA "public", "identity" TO "chpm_dpo"',
  `CREATE OR REPLACE VIEW "public"."dpo_console_users" WITH (security_barrier = true) AS
    SELECT "id", "organizationId", "email", "displayName", "role", "isActive", "passwordHash"
    FROM "public"."User"
    WHERE "role"::text = 'dpo'`,
  'REVOKE ALL ON TABLE "public"."dpo_console_users" FROM "chpm_dpo"',
  'GRANT SELECT ON TABLE "public"."dpo_console_users" TO "chpm_dpo"',
  'REVOKE ALL ON TABLE "public"."JudicialAccessRequest", "public"."Invitation", "public"."Building", "public"."AuditLog", "identity"."email_identities", "identity"."vault_audit_logs" FROM "chpm_dpo"',
  'GRANT SELECT ("id", "organizationId", "requestReference", "legalBasisDescription", "courtOrderReference", "requestedPublicCodes", "status", "dpoValidationUserId", "legalValidationUserId") ON TABLE "public"."JudicialAccessRequest" TO "chpm_dpo"',
  'GRANT UPDATE ("status", "executedByUserId", "executedAt", "exportFingerprint", "exportExpiresAt", "exportDeletedAt") ON TABLE "public"."JudicialAccessRequest" TO "chpm_dpo"',
  'GRANT SELECT ("publicCode", "buildingId") ON TABLE "public"."Invitation" TO "chpm_dpo"',
  'GRANT SELECT ("id", "organizationId") ON TABLE "public"."Building" TO "chpm_dpo"',
  'GRANT INSERT ON TABLE "public"."AuditLog" TO "chpm_dpo"',
  'GRANT SELECT ("id") ON TABLE "public"."AuditLog" TO "chpm_dpo"',
  'GRANT SELECT ("publicCode", "contactChannel", "emailCiphertext", "phoneCiphertext", "questionnaireVersionId", "buildingId", "deletedAt") ON TABLE "identity"."email_identities" TO "chpm_dpo"',
  'GRANT INSERT ON TABLE "identity"."vault_audit_logs" TO "chpm_dpo"',
  'GRANT SELECT ("id") ON TABLE "identity"."vault_audit_logs" TO "chpm_dpo"',
]

async function main(): Promise<void> {
  await prisma.$connect()
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }
  console.log('Restricted DPO console grants applied.')
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
