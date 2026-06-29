-- AlterTable
ALTER TABLE "identity"."email_delivery_events" RENAME CONSTRAINT "identity_email_delivery_events_pkey" TO "email_delivery_events_pkey";

-- AlterTable
ALTER TABLE "identity"."email_identities" RENAME CONSTRAINT "identity_email_identities_pkey" TO "email_identities_pkey";

-- AlterTable
ALTER TABLE "identity"."vault_audit_logs" RENAME CONSTRAINT "identity_vault_audit_logs_pkey" TO "vault_audit_logs_pkey";

-- RenameForeignKey
ALTER TABLE "identity"."email_delivery_events" RENAME CONSTRAINT "identity_email_delivery_events_invitationId_fkey" TO "email_delivery_events_invitationId_fkey";

-- RenameForeignKey
ALTER TABLE "identity"."email_identities" RENAME CONSTRAINT "identity_email_identities_invitationId_fkey" TO "email_identities_invitationId_fkey";

-- RenameIndex
ALTER INDEX "identity"."identity_email_delivery_events_eventType_idx" RENAME TO "email_delivery_events_eventType_idx";

-- RenameIndex
ALTER INDEX "identity"."identity_email_delivery_events_invitationId_idx" RENAME TO "email_delivery_events_invitationId_idx";

-- RenameIndex
ALTER INDEX "identity"."identity_email_delivery_events_publicCode_idx" RENAME TO "email_delivery_events_publicCode_idx";

-- RenameIndex
ALTER INDEX "identity"."identity_email_identities_emailHash_idx" RENAME TO "email_identities_emailHash_idx";

-- RenameIndex
ALTER INDEX "identity"."identity_email_identities_invitationId_key" RENAME TO "email_identities_invitationId_key";

-- RenameIndex
ALTER INDEX "identity"."identity_email_identities_publicCode_idx" RENAME TO "email_identities_publicCode_idx";

-- RenameIndex
ALTER INDEX "identity"."identity_email_identities_publicCode_key" RENAME TO "email_identities_publicCode_key";

-- RenameIndex
ALTER INDEX "identity"."identity_vault_audit_logs_actorUserId_idx" RENAME TO "vault_audit_logs_actorUserId_idx";

-- RenameIndex
ALTER INDEX "identity"."identity_vault_audit_logs_publicCode_idx" RENAME TO "vault_audit_logs_publicCode_idx";

-- RenameIndex
ALTER INDEX "identity"."identity_vault_audit_logs_requestId_idx" RENAME TO "vault_audit_logs_requestId_idx";
