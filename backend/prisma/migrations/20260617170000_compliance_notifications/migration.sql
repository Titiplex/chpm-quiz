-- Semaine 7 : préférences notifications, fréquence de digest et suivi de livraison simulée.
ALTER TABLE "NotificationSubscription"
  ADD COLUMN IF NOT EXISTS "frequency" TEXT NOT NULL DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS "digestHour" INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS "lastDeliveredAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "NotificationSubscription_frequency_idx" ON "NotificationSubscription"("frequency");
CREATE INDEX IF NOT EXISTS "NotificationSubscription_lastDeliveredAt_idx" ON "NotificationSubscription"("lastDeliveredAt");
