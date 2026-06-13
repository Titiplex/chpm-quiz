-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'moderator', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo', 'judicial_officer', 'technical_admin', 'service_account', 'respondent');

-- CreateEnum
CREATE TYPE "QuestionnaireStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "QuestionnaireVersionStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('single_choice', 'multiple_choice', 'likert', 'free_text', 'free_text_short', 'free_text_long', 'number', 'date', 'information');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'sent', 'opened', 'in_progress', 'draft', 'submitted', 'expired', 'blocked', 'cancelled');

-- CreateEnum
CREATE TYPE "ResponseSessionStatus" AS ENUM ('draft', 'submitted', 'locked', 'abandoned');

-- CreateEnum
CREATE TYPE "JudicialAccessStatus" AS ENUM ('received', 'validated', 'rejected', 'executed', 'closed');

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "siteId" UUID,
    "buildingId" UUID,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Questionnaire" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "ownerUserId" UUID,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'fr',
    "finality" TEXT,
    "status" "QuestionnaireStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireVersion" (
    "id" UUID NOT NULL,
    "questionnaireId" UUID NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "status" "QuestionnaireVersionStatus" NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "finality" TEXT,
    "openFrom" TIMESTAMP(3),
    "openUntil" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "immutableAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionGroup" (
    "id" UUID NOT NULL,
    "questionnaireVersionId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "questionsPerPage" INTEGER NOT NULL DEFAULT 3,
    "randomize" BOOLEAN NOT NULL DEFAULT false,
    "conditionExpression" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "label" TEXT NOT NULL,
    "helperText" TEXT,
    "responseType" "QuestionType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL,
    "tags" TEXT[],
    "conditionExpression" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerOption" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LikertScale" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "leftAnchor" TEXT NOT NULL,
    "rightAnchor" TEXT NOT NULL,
    "neutralLabel" TEXT,
    "allowNotApplicable" BOOLEAN NOT NULL DEFAULT false,
    "orientation" TEXT NOT NULL DEFAULT 'horizontal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LikertScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlossaryTerm" (
    "id" UUID NOT NULL,
    "termKey" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "label" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlossaryTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopupDefinition" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "glossaryTermId" UUID,
    "termKey" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopupDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionalRule" (
    "id" UUID NOT NULL,
    "questionnaireVersionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "trigger" JSONB NOT NULL,
    "effect" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConditionalRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL,
    "questionnaireVersionId" UUID NOT NULL,
    "siteId" UUID,
    "buildingId" UUID NOT NULL,
    "createdByUserId" UUID,
    "publicCode" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'sent',
    "notifyModerator" BOOLEAN NOT NULL DEFAULT false,
    "notifyAdmins" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_email_identities" (
    "id" UUID NOT NULL,
    "invitationId" UUID NOT NULL,
    "publicCode" TEXT NOT NULL,
    "emailCiphertext" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "questionnaireVersionId" UUID NOT NULL,
    "buildingId" UUID NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEmailSentAt" TIMESTAMP(3),
    "deletionScheduledAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "identity_email_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_email_delivery_events" (
    "id" UUID NOT NULL,
    "invitationId" UUID NOT NULL,
    "publicCode" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_email_delivery_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_vault_audit_logs" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "publicCode" TEXT,
    "requestId" UUID,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_vault_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseSession" (
    "id" UUID NOT NULL,
    "invitationId" UUID NOT NULL,
    "publicCode" TEXT NOT NULL,
    "questionnaireVersionId" UUID NOT NULL,
    "buildingId" UUID NOT NULL,
    "status" "ResponseSessionStatus" NOT NULL DEFAULT 'draft',
    "currentPage" INTEGER NOT NULL DEFAULT 1,
    "randomizationSeed" TEXT NOT NULL,
    "pathFingerprint" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "ResponseSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" UUID NOT NULL,
    "responseSessionId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "value" JSONB NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "identifiabilityWarning" BOOLEAN NOT NULL DEFAULT false,
    "warningReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryEvent" (
    "id" UUID NOT NULL,
    "responseSessionId" UUID NOT NULL,
    "questionId" UUID,
    "popupDefinitionId" UUID,
    "eventType" TEXT NOT NULL,
    "eventPayload" JSONB,
    "durationMs" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" UUID NOT NULL,
    "responseSessionId" UUID NOT NULL,
    "publicCode" TEXT NOT NULL,
    "questionnaireVersionId" UUID NOT NULL,
    "buildingId" UUID NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answerCount" INTEGER NOT NULL,
    "pathFingerprint" TEXT,
    "status" TEXT NOT NULL DEFAULT 'locked',

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSubscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "questionnaireVersionId" UUID,
    "buildingId" UUID,
    "eventType" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudicialAccessRequest" (
    "id" UUID NOT NULL,
    "requestReference" TEXT NOT NULL,
    "legalBasisDescription" TEXT NOT NULL,
    "courtOrderReference" TEXT,
    "requestedPublicCodes" TEXT[],
    "requestedBy" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dpoValidationUserId" UUID,
    "legalValidationUserId" UUID,
    "executedByUserId" UUID,
    "status" "JudicialAccessStatus" NOT NULL DEFAULT 'received',
    "executedAt" TIMESTAMP(3),
    "exportFingerprint" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JudicialAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "publicCode" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Site_code_key" ON "Site"("code");

-- CreateIndex
CREATE INDEX "Site_organizationId_idx" ON "Site"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Building_code_key" ON "Building"("code");

-- CreateIndex
CREATE INDEX "Building_organizationId_idx" ON "Building"("organizationId");

-- CreateIndex
CREATE INDEX "Building_siteId_idx" ON "Building"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_siteId_idx" ON "User"("siteId");

-- CreateIndex
CREATE INDEX "User_buildingId_idx" ON "User"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Questionnaire_code_key" ON "Questionnaire"("code");

-- CreateIndex
CREATE INDEX "Questionnaire_organizationId_idx" ON "Questionnaire"("organizationId");

-- CreateIndex
CREATE INDEX "Questionnaire_ownerUserId_idx" ON "Questionnaire"("ownerUserId");

-- CreateIndex
CREATE INDEX "Questionnaire_status_idx" ON "Questionnaire"("status");

-- CreateIndex
CREATE INDEX "QuestionnaireVersion_questionnaireId_idx" ON "QuestionnaireVersion"("questionnaireId");

-- CreateIndex
CREATE INDEX "QuestionnaireVersion_status_idx" ON "QuestionnaireVersion"("status");

-- CreateIndex
CREATE INDEX "QuestionnaireVersion_openFrom_openUntil_idx" ON "QuestionnaireVersion"("openFrom", "openUntil");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireVersion_questionnaireId_versionLabel_key" ON "QuestionnaireVersion"("questionnaireId", "versionLabel");

-- CreateIndex
CREATE INDEX "QuestionGroup_questionnaireVersionId_idx" ON "QuestionGroup"("questionnaireVersionId");

-- CreateIndex
CREATE INDEX "QuestionGroup_isArchived_idx" ON "QuestionGroup"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionGroup_questionnaireVersionId_displayOrder_key" ON "QuestionGroup"("questionnaireVersionId", "displayOrder");

-- CreateIndex
CREATE INDEX "Question_groupId_idx" ON "Question"("groupId");

-- CreateIndex
CREATE INDEX "Question_responseType_idx" ON "Question"("responseType");

-- CreateIndex
CREATE INDEX "Question_isArchived_idx" ON "Question"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "Question_groupId_code_key" ON "Question"("groupId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Question_groupId_displayOrder_key" ON "Question"("groupId", "displayOrder");

-- CreateIndex
CREATE INDEX "AnswerOption_questionId_idx" ON "AnswerOption"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerOption_questionId_value_key" ON "AnswerOption"("questionId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "LikertScale_questionId_key" ON "LikertScale"("questionId");

-- CreateIndex
CREATE INDEX "GlossaryTerm_termKey_idx" ON "GlossaryTerm"("termKey");

-- CreateIndex
CREATE INDEX "GlossaryTerm_language_idx" ON "GlossaryTerm"("language");

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryTerm_termKey_language_version_key" ON "GlossaryTerm"("termKey", "language", "version");

-- CreateIndex
CREATE INDEX "PopupDefinition_questionId_idx" ON "PopupDefinition"("questionId");

-- CreateIndex
CREATE INDEX "PopupDefinition_glossaryTermId_idx" ON "PopupDefinition"("glossaryTermId");

-- CreateIndex
CREATE INDEX "PopupDefinition_termKey_language_idx" ON "PopupDefinition"("termKey", "language");

-- CreateIndex
CREATE INDEX "ConditionalRule_questionnaireVersionId_idx" ON "ConditionalRule"("questionnaireVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ConditionalRule_questionnaireVersionId_code_key" ON "ConditionalRule"("questionnaireVersionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_publicCode_key" ON "Invitation"("publicCode");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_questionnaireVersionId_idx" ON "Invitation"("questionnaireVersionId");

-- CreateIndex
CREATE INDEX "Invitation_buildingId_idx" ON "Invitation"("buildingId");

-- CreateIndex
CREATE INDEX "Invitation_siteId_idx" ON "Invitation"("siteId");

-- CreateIndex
CREATE INDEX "Invitation_createdByUserId_idx" ON "Invitation"("createdByUserId");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");

-- CreateIndex
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "identity_email_identities_invitationId_key" ON "identity_email_identities"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "identity_email_identities_publicCode_key" ON "identity_email_identities"("publicCode");

-- CreateIndex
CREATE INDEX "identity_email_identities_emailHash_idx" ON "identity_email_identities"("emailHash");

-- CreateIndex
CREATE INDEX "identity_email_identities_publicCode_idx" ON "identity_email_identities"("publicCode");

-- CreateIndex
CREATE INDEX "identity_email_delivery_events_invitationId_idx" ON "identity_email_delivery_events"("invitationId");

-- CreateIndex
CREATE INDEX "identity_email_delivery_events_publicCode_idx" ON "identity_email_delivery_events"("publicCode");

-- CreateIndex
CREATE INDEX "identity_email_delivery_events_eventType_idx" ON "identity_email_delivery_events"("eventType");

-- CreateIndex
CREATE INDEX "identity_vault_audit_logs_actorUserId_idx" ON "identity_vault_audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "identity_vault_audit_logs_publicCode_idx" ON "identity_vault_audit_logs"("publicCode");

-- CreateIndex
CREATE INDEX "identity_vault_audit_logs_requestId_idx" ON "identity_vault_audit_logs"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ResponseSession_invitationId_key" ON "ResponseSession"("invitationId");

-- CreateIndex
CREATE INDEX "ResponseSession_publicCode_idx" ON "ResponseSession"("publicCode");

-- CreateIndex
CREATE INDEX "ResponseSession_questionnaireVersionId_idx" ON "ResponseSession"("questionnaireVersionId");

-- CreateIndex
CREATE INDEX "ResponseSession_buildingId_idx" ON "ResponseSession"("buildingId");

-- CreateIndex
CREATE INDEX "ResponseSession_status_idx" ON "ResponseSession"("status");

-- CreateIndex
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_responseSessionId_questionId_key" ON "Answer"("responseSessionId", "questionId");

-- CreateIndex
CREATE INDEX "TelemetryEvent_responseSessionId_idx" ON "TelemetryEvent"("responseSessionId");

-- CreateIndex
CREATE INDEX "TelemetryEvent_questionId_idx" ON "TelemetryEvent"("questionId");

-- CreateIndex
CREATE INDEX "TelemetryEvent_popupDefinitionId_idx" ON "TelemetryEvent"("popupDefinitionId");

-- CreateIndex
CREATE INDEX "TelemetryEvent_eventType_idx" ON "TelemetryEvent"("eventType");

-- CreateIndex
CREATE INDEX "TelemetryEvent_occurredAt_idx" ON "TelemetryEvent"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_responseSessionId_key" ON "Submission"("responseSessionId");

-- CreateIndex
CREATE INDEX "Submission_publicCode_idx" ON "Submission"("publicCode");

-- CreateIndex
CREATE INDEX "Submission_questionnaireVersionId_idx" ON "Submission"("questionnaireVersionId");

-- CreateIndex
CREATE INDEX "Submission_buildingId_idx" ON "Submission"("buildingId");

-- CreateIndex
CREATE INDEX "Submission_submittedAt_idx" ON "Submission"("submittedAt");

-- CreateIndex
CREATE INDEX "NotificationSubscription_userId_idx" ON "NotificationSubscription"("userId");

-- CreateIndex
CREATE INDEX "NotificationSubscription_questionnaireVersionId_idx" ON "NotificationSubscription"("questionnaireVersionId");

-- CreateIndex
CREATE INDEX "NotificationSubscription_buildingId_idx" ON "NotificationSubscription"("buildingId");

-- CreateIndex
CREATE INDEX "NotificationSubscription_eventType_idx" ON "NotificationSubscription"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "JudicialAccessRequest_requestReference_key" ON "JudicialAccessRequest"("requestReference");

-- CreateIndex
CREATE INDEX "JudicialAccessRequest_status_idx" ON "JudicialAccessRequest"("status");

-- CreateIndex
CREATE INDEX "JudicialAccessRequest_receivedAt_idx" ON "JudicialAccessRequest"("receivedAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_publicCode_idx" ON "AuditLog"("publicCode");

-- CreateIndex
CREATE INDEX "AuditLog_occurredAt_idx" ON "AuditLog"("occurredAt");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questionnaire" ADD CONSTRAINT "Questionnaire_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questionnaire" ADD CONSTRAINT "Questionnaire_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireVersion" ADD CONSTRAINT "QuestionnaireVersion_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionGroup" ADD CONSTRAINT "QuestionGroup_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "QuestionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerOption" ADD CONSTRAINT "AnswerOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikertScale" ADD CONSTRAINT "LikertScale_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopupDefinition" ADD CONSTRAINT "PopupDefinition_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopupDefinition" ADD CONSTRAINT "PopupDefinition_glossaryTermId_fkey" FOREIGN KEY ("glossaryTermId") REFERENCES "GlossaryTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionalRule" ADD CONSTRAINT "ConditionalRule_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_email_identities" ADD CONSTRAINT "identity_email_identities_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_email_delivery_events" ADD CONSTRAINT "identity_email_delivery_events_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseSession" ADD CONSTRAINT "ResponseSession_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseSession" ADD CONSTRAINT "ResponseSession_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_responseSessionId_fkey" FOREIGN KEY ("responseSessionId") REFERENCES "ResponseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryEvent" ADD CONSTRAINT "TelemetryEvent_responseSessionId_fkey" FOREIGN KEY ("responseSessionId") REFERENCES "ResponseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryEvent" ADD CONSTRAINT "TelemetryEvent_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryEvent" ADD CONSTRAINT "TelemetryEvent_popupDefinitionId_fkey" FOREIGN KEY ("popupDefinitionId") REFERENCES "PopupDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_responseSessionId_fkey" FOREIGN KEY ("responseSessionId") REFERENCES "ResponseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSubscription" ADD CONSTRAINT "NotificationSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSubscription" ADD CONSTRAINT "NotificationSubscription_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudicialAccessRequest" ADD CONSTRAINT "JudicialAccessRequest_dpoValidationUserId_fkey" FOREIGN KEY ("dpoValidationUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudicialAccessRequest" ADD CONSTRAINT "JudicialAccessRequest_legalValidationUserId_fkey" FOREIGN KEY ("legalValidationUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudicialAccessRequest" ADD CONSTRAINT "JudicialAccessRequest_executedByUserId_fkey" FOREIGN KEY ("executedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
