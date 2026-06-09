-- Schema/Database: identity_vault
-- Acces applicatif limite au service d'invitation.
-- Aucun utilisateur métier ne doit disposer d'un acces direct.

CREATE TABLE email_identities
(
    id                       UUID PRIMARY KEY,
    public_code              TEXT UNIQUE NOT NULL,
    email_ciphertext         BYTEA       NOT NULL,
    email_hash               TEXT        NOT NULL,
    questionnaire_version_id UUID        NOT NULL,
    building_id              UUID,
    created_by_user_id       UUID        NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_email_sent_at       TIMESTAMPTZ,
    deletion_scheduled_at    TIMESTAMPTZ,
    deleted_at               TIMESTAMPTZ
);

CREATE TABLE email_delivery_events
(
    id                  UUID PRIMARY KEY,
    public_code         TEXT        NOT NULL REFERENCES email_identities (public_code),
    event_type          TEXT        NOT NULL CHECK (event_type IN
                                                    ('queued', 'sent', 'delivered', 'bounced', 'complained', 'opened')),
    provider_message_id TEXT,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata            JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE judicial_access_requests
(
    id                       UUID PRIMARY KEY,
    request_reference        TEXT UNIQUE NOT NULL,
    legal_basis_description  TEXT        NOT NULL,
    court_order_reference    TEXT        NOT NULL,
    requested_public_codes   TEXT[] NOT NULL,
    requested_by             TEXT        NOT NULL,
    received_at              TIMESTAMPTZ NOT NULL,
    dpo_validation_user_id   UUID        NOT NULL,
    legal_validation_user_id UUID        NOT NULL,
    status                   TEXT        NOT NULL CHECK (status IN ('received', 'validated', 'rejected', 'executed', 'closed')),
    executed_by_user_id      UUID,
    executed_at              TIMESTAMPTZ,
    export_fingerprint       TEXT,
    comments                 TEXT
);

CREATE TABLE identity_vault_audit_logs
(
    id            UUID PRIMARY KEY,
    actor_user_id UUID,
    action        TEXT        NOT NULL,
    public_code   TEXT,
    request_id    UUID REFERENCES judicial_access_requests (id),
    ip_address    INET,
    metadata      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);