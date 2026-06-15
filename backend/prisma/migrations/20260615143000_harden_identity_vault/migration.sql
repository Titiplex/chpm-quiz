-- Durcissement CDC : séparation logique de la base identité email dans un schéma SQL dédié.
-- Les tables identité restent référencées par Prisma, mais sont déplacées hors du schéma public.
CREATE SCHEMA IF NOT EXISTS identity;

ALTER TABLE IF EXISTS public.identity_email_identities SET SCHEMA identity;
ALTER TABLE IF EXISTS identity.identity_email_identities RENAME TO email_identities;

ALTER TABLE IF EXISTS public.identity_email_delivery_events SET SCHEMA identity;
ALTER TABLE IF EXISTS identity.identity_email_delivery_events RENAME TO email_delivery_events;

ALTER TABLE IF EXISTS public.identity_vault_audit_logs SET SCHEMA identity;
ALTER TABLE IF EXISTS identity.identity_vault_audit_logs RENAME TO vault_audit_logs;

-- Verrouillage minimal : l'application ordinaire ne doit pas supposer que le schéma identité est public.
-- En production, créer un utilisateur DB séparé ou des policies dédiées pour ce schéma.
