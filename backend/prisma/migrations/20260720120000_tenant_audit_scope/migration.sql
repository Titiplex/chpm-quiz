ALTER TABLE "public"."AuditLog"
ADD COLUMN "organizationId" UUID;

UPDATE "public"."AuditLog" AS audit
SET "organizationId" = users."organizationId"
FROM "public"."User" AS users
WHERE audit."actorUserId" = users."id"
  AND audit."organizationId" IS NULL;

CREATE INDEX "AuditLog_organizationId_occurredAt_idx"
ON "public"."AuditLog"("organizationId", "occurredAt");
