-- Add SMS invitation delivery channels and store phone identities in the isolated identity vault.
ALTER TYPE "public"."InvitationDeliveryMode" ADD VALUE IF NOT EXISTS 'sms';
ALTER TYPE "public"."InvitationDeliveryMode" ADD VALUE IF NOT EXISTS 'sms_simulation';

ALTER TABLE "identity"."email_identities"
  ADD COLUMN IF NOT EXISTS "contactChannel" TEXT NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS "phoneCiphertext" TEXT,
  ADD COLUMN IF NOT EXISTS "phoneHash" TEXT,
  ADD COLUMN IF NOT EXISTS "lastSmsSentAt" TIMESTAMP(3);

ALTER TABLE "identity"."email_identities" ALTER COLUMN "emailCiphertext" DROP NOT NULL;
ALTER TABLE "identity"."email_identities" ALTER COLUMN "emailHash" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "email_identities_contactChannel_idx" ON "identity"."email_identities"("contactChannel");
CREATE INDEX IF NOT EXISTS "email_identities_phoneHash_idx" ON "identity"."email_identities"("phoneHash");
