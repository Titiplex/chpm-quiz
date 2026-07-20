ALTER TABLE "public"."JudicialAccessRequest"
ADD COLUMN "organizationId" UUID,
ADD COLUMN "exportExpiresAt" TIMESTAMP(3),
ADD COLUMN "exportDeletedAt" TIMESTAMP(3);

UPDATE "public"."JudicialAccessRequest" AS request
SET "organizationId" = users."organizationId"
FROM "public"."User" AS users
WHERE request."dpoValidationUserId" = users."id"
  AND request."organizationId" IS NULL;

UPDATE "public"."JudicialAccessRequest" AS request
SET "organizationId" = users."organizationId"
FROM "public"."User" AS users
WHERE request."legalValidationUserId" = users."id"
  AND request."organizationId" IS NULL;

UPDATE "public"."JudicialAccessRequest" AS request
SET "organizationId" = users."organizationId"
FROM "public"."User" AS users
WHERE request."executedByUserId" = users."id"
  AND request."organizationId" IS NULL;

DROP INDEX "public"."JudicialAccessRequest_requestReference_key";

CREATE UNIQUE INDEX "JudicialAccessRequest_organizationId_requestReference_key"
ON "public"."JudicialAccessRequest"("organizationId", "requestReference");

CREATE INDEX "JudicialAccessRequest_organizationId_status_idx"
ON "public"."JudicialAccessRequest"("organizationId", "status");

CREATE INDEX "JudicialAccessRequest_exportExpiresAt_idx"
ON "public"."JudicialAccessRequest"("exportExpiresAt");
