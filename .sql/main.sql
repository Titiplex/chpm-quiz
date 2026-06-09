-- Schema: app_core

CREATE TABLE organizations
(
    id         UUID PRIMARY KEY,
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sites
(
    id              UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations (id),
    name            TEXT NOT NULL,
    country_code    CHAR(2),
    timezone        TEXT NOT NULL DEFAULT 'UTC'
);

CREATE TABLE buildings
(
    id           UUID PRIMARY KEY,
    site_id      UUID    NOT NULL REFERENCES sites (id),
    name         TEXT    NOT NULL,
    external_ref TEXT,
    is_active    BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE users
(
    id              UUID PRIMARY KEY,
    organization_id UUID        NOT NULL REFERENCES organizations (id),
    email_hash      TEXT        NOT NULL,
    display_name    TEXT        NOT NULL,
    status          TEXT        NOT NULL CHECK (status IN ('active', 'disabled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles
(
    id    UUID PRIMARY KEY,
    code  TEXT UNIQUE NOT NULL,
    label TEXT        NOT NULL
);

CREATE TABLE user_role_assignments
(
    user_id          UUID NOT NULL REFERENCES users (id),
    role_id          UUID NOT NULL REFERENCES roles (id),
    site_id          UUID REFERENCES sites (id),
    building_id      UUID REFERENCES buildings (id),
    questionnaire_id UUID,
    PRIMARY KEY (user_id, role_id, site_id, building_id, questionnaire_id)
);

CREATE TABLE questionnaires
(
    id              UUID PRIMARY KEY,
    organization_id UUID        NOT NULL REFERENCES organizations (id),
    code            TEXT UNIQUE NOT NULL,
    title           TEXT        NOT NULL,
    description     TEXT,
    owner_user_id   UUID REFERENCES users (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE questionnaire_versions
(
    id                         UUID PRIMARY KEY,
    questionnaire_id           UUID NOT NULL REFERENCES questionnaires (id),
    version_label              TEXT NOT NULL,
    status                     TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
    default_language           TEXT NOT NULL DEFAULT 'fr',
    questions_per_page_default INT  NOT NULL DEFAULT 3,
    published_at               TIMESTAMPTZ,
    published_by               UUID REFERENCES users (id),
    UNIQUE (questionnaire_id, version_label)
);

CREATE TABLE question_groups
(
    id                       UUID PRIMARY KEY,
    questionnaire_version_id UUID    NOT NULL REFERENCES questionnaire_versions (id),
    code                     TEXT    NOT NULL,
    title                    TEXT    NOT NULL,
    description              TEXT,
    sort_order               INT     NOT NULL,
    randomization_mode       TEXT    NOT NULL DEFAULT 'fixed'
        CHECK (randomization_mode IN ('fixed', 'randomize_questions', 'randomize_blocks')),
    questions_per_page       INT,
    is_required              BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (questionnaire_version_id, code)
);

CREATE TABLE questions
(
    id            UUID PRIMARY KEY,
    group_id      UUID    NOT NULL REFERENCES question_groups (id),
    code          TEXT    NOT NULL,
    language      TEXT    NOT NULL DEFAULT 'fr',
    label         TEXT    NOT NULL,
    helper_text   TEXT,
    response_type TEXT    NOT NULL CHECK (response_type IN
                                          ('frée_text_short', 'frée_text_long', 'single_choice', 'multiple_choice',
                                           'likert', 'number', 'date', 'information')),
    is_required   BOOLEAN NOT NULL DEFAULT true,
    sort_order    INT     NOT NULL,
    validation    JSONB   NOT NULL DEFAULT '{}'::jsonb,
    tags          TEXT[] NOT NULL DEFAULT '{}',
    UNIQUE (group_id, code, language)
);

CREATE TABLE likert_scales
(
    id                   UUID PRIMARY KEY,
    question_id          UUID    NOT NULL REFERENCES questions (id),
    points               INT     NOT NULL CHECK (points BETWEEN 2 AND 11),
    left_anchor          TEXT    NOT NULL,
    right_anchor         TEXT    NOT NULL,
    neutral_label        TEXT,
    allow_not_applicable BOOLEAN NOT NULL DEFAULT false,
    scoring              JSONB   NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE answer_options
(
    id           UUID PRIMARY KEY,
    question_id  UUID    NOT NULL REFERENCES questions (id),
    value        TEXT    NOT NULL,
    label        TEXT    NOT NULL,
    sort_order   INT     NOT NULL,
    is_exclusive BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE glossary_terms
(
    id              UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations (id),
    term_key        TEXT NOT NULL,
    canonical_label TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('draft', 'review', 'approved', 'archived')),
    UNIQUE (organization_id, term_key)
);

CREATE TABLE popup_definitions
(
    id                       UUID PRIMARY KEY,
    term_id                  UUID NOT NULL REFERENCES glossary_terms (id),
    questionnaire_version_id UUID REFERENCES questionnaire_versions (id),
    question_id              UUID REFERENCES questions (id),
    language                 TEXT NOT NULL,
    short_definition         TEXT NOT NULL,
    long_definition          TEXT,
    example_text             TEXT,
    version                  INT  NOT NULL DEFAULT 1,
    approved_by              UUID REFERENCES users (id),
    approved_at              TIMESTAMPTZ
);

CREATE TABLE conditional_rules
(
    id                       UUID PRIMARY KEY,
    questionnaire_version_id UUID    NOT NULL REFERENCES questionnaire_versions (id),
    scope                    TEXT    NOT NULL CHECK (scope IN ('questionnaire', 'group', 'question')),
    target_id                UUID,
    priority                 INT     NOT NULL DEFAULT 100,
    condition_expression     JSONB   NOT NULL,
    action                   JSONB   NOT NULL,
    is_active                BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE invitations
(
    id                       UUID PRIMARY KEY,
    questionnaire_version_id UUID        NOT NULL REFERENCES questionnaire_versions (id),
    building_id              UUID REFERENCES buildings (id),
    public_code              TEXT UNIQUE NOT NULL,
    status                   TEXT        NOT NULL CHECK (status IN
                                                         ('created', 'sent', 'opened', 'in_progress', 'submitted',
                                                          'expired', 'blocked', 'cancelled')),
    created_by               UUID        NOT NULL REFERENCES users (id),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at                  TIMESTAMPTZ,
    expires_at               TIMESTAMPTZ,
    submitted_at             TIMESTAMPTZ
);

CREATE TABLE response_sessions
(
    id                       UUID PRIMARY KEY,
    invitation_id            UUID  NOT NULL REFERENCES invitations (id),
    public_code              TEXT  NOT NULL,
    questionnaire_version_id UUID  NOT NULL REFERENCES questionnaire_versions (id),
    status                   TEXT  NOT NULL CHECK (status IN ('not_started', 'draft', 'submitted', 'locked')),
    current_page             INT   NOT NULL DEFAULT 1,
    path_snapshot            JSONB NOT NULL DEFAULT '{}'::jsonb,
    randomization_séed       TEXT,
    started_at               TIMESTAMPTZ,
    last_saved_at            TIMESTAMPTZ,
    submitted_at             TIMESTAMPTZ
);

CREATE TABLE answers
(
    id                  UUID PRIMARY KEY,
    response_session_id UUID        NOT NULL REFERENCES response_sessions (id),
    question_id         UUID        NOT NULL REFERENCES questions (id),
    answer_value        JSONB       NOT NULL,
    answered_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    time_to_answer_ms   INT,
    revision            INT         NOT NULL DEFAULT 1,
    UNIQUE (response_session_id, question_id)
);

CREATE TABLE telemetry_events
(
    id                  UUID PRIMARY KEY,
    response_session_id UUID        NOT NULL REFERENCES response_sessions (id),
    question_id         UUID REFERENCES questions (id),
    popup_definition_id UUID REFERENCES popup_definitions (id),
    event_type          TEXT        NOT NULL CHECK (event_type IN
                                                    ('page_view', 'question_focus', 'answer_change', 'popup_open',
                                                     'popup_close', 'autosave', 'resume', 'submit', 'abandon')),
    event_payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_subscriptions
(
    id               UUID PRIMARY KEY,
    user_id          UUID    NOT NULL REFERENCES users (id),
    event_type       TEXT    NOT NULL,
    questionnaire_id UUID REFERENCES questionnaires (id),
    site_id          UUID REFERENCES sites (id),
    building_id      UUID REFERENCES buildings (id),
    channel          TEXT    NOT NULL CHECK (channel IN ('email', 'in_app', 'webhook')),
    is_enabled       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE audit_logs
(
    id            UUID PRIMARY KEY,
    actor_user_id UUID REFERENCES users (id),
    actor_role    TEXT,
    action        TEXT        NOT NULL,
    resource_type TEXT        NOT NULL,
    resource_id   UUID,
    ip_address    INET,
    user_agent    TEXT,
    metadata      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);