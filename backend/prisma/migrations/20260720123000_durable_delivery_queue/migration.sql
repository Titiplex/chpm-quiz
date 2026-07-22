CREATE TYPE "identity"."OutboundDeliveryChannel" AS ENUM ('email', 'sms');
CREATE TYPE "identity"."OutboundDeliveryStatus" AS ENUM ('pending', 'processing', 'retry', 'succeeded', 'dead');

CREATE TABLE "identity"."OutboundDeliveryJob" (
  "id" UUID NOT NULL,
  "channel" "identity"."OutboundDeliveryChannel" NOT NULL,
  "status" "identity"."OutboundDeliveryStatus" NOT NULL DEFAULT 'pending',
  "encryptedPayload" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutboundDeliveryJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OutboundDeliveryJob_channel_status_availableAt_idx"
ON "identity"."OutboundDeliveryJob"("channel", "status", "availableAt");

CREATE INDEX "OutboundDeliveryJob_lockedAt_idx"
ON "identity"."OutboundDeliveryJob"("lockedAt");
