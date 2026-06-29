CREATE TYPE "InvitationDeliveryMode" AS ENUM ('email', 'email_simulation', 'onsite_terminal');
CREATE TYPE "AssistanceMode" AS ENUM ('none', 'technical_help', 'full_assisted_entry');
CREATE TYPE "TerminalDeviceStatus" AS ENUM ('active', 'paused', 'revoked');

CREATE TABLE "TerminalDevice" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "siteId" UUID,
  "buildingId" UUID NOT NULL,
  "createdByUserId" UUID,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "accessTokenHash" TEXT NOT NULL,
  "status" "TerminalDeviceStatus" NOT NULL DEFAULT 'active',
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TerminalDevice_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Invitation"
  ADD COLUMN "deliveryMode" "InvitationDeliveryMode" NOT NULL DEFAULT 'email_simulation',
  ADD COLUMN "terminalDeviceId" UUID,
  ADD COLUMN "terminalDispatchedAt" TIMESTAMP(3),
  ADD COLUMN "assistanceMode" "AssistanceMode" NOT NULL DEFAULT 'none';

ALTER TABLE "ResponseSession"
  ADD COLUMN "terminalDeviceId" UUID,
  ADD COLUMN "assistanceMode" "AssistanceMode" NOT NULL DEFAULT 'none',
  ADD COLUMN "assistedByUserId" UUID,
  ADD COLUMN "assistanceDeclaredAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "TerminalDevice_code_key" ON "TerminalDevice"("code");
CREATE UNIQUE INDEX "TerminalDevice_accessTokenHash_key" ON "TerminalDevice"("accessTokenHash");
CREATE INDEX "TerminalDevice_organizationId_idx" ON "TerminalDevice"("organizationId");
CREATE INDEX "TerminalDevice_siteId_idx" ON "TerminalDevice"("siteId");
CREATE INDEX "TerminalDevice_buildingId_idx" ON "TerminalDevice"("buildingId");
CREATE INDEX "TerminalDevice_status_idx" ON "TerminalDevice"("status");
CREATE INDEX "Invitation_deliveryMode_idx" ON "Invitation"("deliveryMode");
CREATE INDEX "Invitation_terminalDeviceId_idx" ON "Invitation"("terminalDeviceId");
CREATE INDEX "ResponseSession_terminalDeviceId_idx" ON "ResponseSession"("terminalDeviceId");
CREATE INDEX "ResponseSession_assistanceMode_idx" ON "ResponseSession"("assistanceMode");

ALTER TABLE "TerminalDevice" ADD CONSTRAINT "TerminalDevice_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TerminalDevice" ADD CONSTRAINT "TerminalDevice_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_terminalDeviceId_fkey" FOREIGN KEY ("terminalDeviceId") REFERENCES "TerminalDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResponseSession" ADD CONSTRAINT "ResponseSession_terminalDeviceId_fkey" FOREIGN KEY ("terminalDeviceId") REFERENCES "TerminalDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
