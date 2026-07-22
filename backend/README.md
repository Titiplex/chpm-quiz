# CHPM Survey backend

The backend is a NestJS REST API for internal authentication, scoped administration, questionnaire versioning, respondent workflows, statistics, compliance operations, terminals, notifications, and audit logging.

The API prefix is `/api` by default. The machine-readable contract is [docs/openapi.yaml](../docs/openapi.yaml), and the developer-facing usage guide is [docs/api/README.md](../docs/api/README.md).

## Technology

- NestJS 11 and TypeScript
- Prisma 6
- PostgreSQL
- Persistent opaque staff sessions in an HTTP-only cookie
- HMAC-signed respondent and terminal tokens stored only as hashes
- `class-validator` DTO validation with unknown-field rejection
- Vitest unit, contract, authorization, and functional tests

## Local startup

From `backend/`:

```powershell
npm ci
Copy-Item .env.example .env
docker compose up -d
npm run prisma:migrate
npm run db:seed
npm run dev
```

The default API URL is `http://localhost:3000/api`.

The sample configuration uses database `chpm_quiz`, local user/password `chpm`/`chpm`, and separate PostgreSQL schemas:

- `OPERATIONAL_DATABASE_URL` targets `public` for users, scoped operational records, questionnaires, responses, audit records, and workflows.
- `IDENTITY_DATABASE_URL` targets `identity` for encrypted contact values and identity-vault audit records.
- `DPO_DATABASE_URL` is used only by the disabled-by-default local DPO console and maps to the restricted `chpm_dpo` role; it must never be injected into the API container.

Use separate database roles and strong passwords in production-like environments. Schema separation is a defense-in-depth boundary, not a substitute for separate credentials and least privilege.

## Module map

| Module | Responsibility |
| --- | --- |
| `auth` | OIDC/local login, password rotation, lockout, session restoration/revocation |
| `users` | Project-to-site and site-to-moderator delegation |
| `questionnaires` / `versions` | Questionnaire builder, conditional rules, publication checks, immutable publication |
| `moderation` | Scoped invitations, resend, paper entry, terminal assignment |
| `respondent` | Token resolution, autosave, telemetry, final submission |
| `terminal` / `terminal-admin` | On-site device registration and token-bound invitation opening |
| `stats` | Threshold-protected aggregates and analyst-only pseudonymized submission detail |
| `compliance` | Technical register, scheduled/manual retention, maintenance, pseudonymized export |
| `identity-vault` | Encrypted contacts, durable delivery queue, retention, and dual audit boundary |
| `judicial` | Double-controlled exceptional request state machine and encrypted export |
| `notifications` | User subscriptions and scheduled digest processing |
| `audit` | Append-only application audit reads for authorized roles |
| `observability` | Liveness, readiness, JSON metrics, and Prometheus exposition |

For service and boundary details, see the [codebase reference](../docs/development/codebase-reference.md).

## Authentication and authorization

Production staff authenticate through OIDC Authorization Code with PKCE and a required institutional MFA claim. Only pre-provisioned active accounts are mapped by verified email to a local role and scope. Controlled development/preproduction may explicitly enable local email/password login, including database-backed lockout and forced temporary-password rotation. Successful login creates a random opaque session token; only its SHA-256 hash is stored. The browser receives the session as an HTTP-only cookie.

Authorization has two layers:

1. Controller-level RBAC through `SessionAuthGuard`, `RolesGuard`, and `@Roles(...)`.
2. Service-level ABAC for organization, site, building, questionnaire, and invitation scope.

The frontend navigation is a usability layer only. Never rely on hidden menu items for access control.

Respondents do not have internal accounts. Their link contains a signed token bound to one public code. Terminal-assisted sessions additionally require the terminal token. Tokens are validated and compared by hash before data access.

## Sensitive-account console

Daily site-team administration happens in the web application. The local console is reserved for bootstrap and sensitive roles:

```powershell
npm run user:console
```

Supported actions include creating approved sensitive roles, resetting passwords, disabling accounts, revoking sessions, and listing accounts without secrets. Every mutation is audited. The console applies production safeguards and protects the last active project administrator from accidental deactivation.

The technical role value `admin` means project administrator/researcher. It does not grant access to respondent contact values or DPO exports.

## Exceptional DPO execution

The judicial workflow requires independent legal and DPO validation. A DPO can then use the dedicated `/coffre-email` screen/API to download an encrypted envelope containing only organization-owned, explicitly approved public codes, or use the local console to produce a restricted encrypted file:

```powershell
npm run dpo:console
```

The console requires a named DPO login and an existing organization-scoped request already validated by both roles. Both execution paths forbid free contact search, enforce a maximum of 50 explicit codes, encrypt output, record a SHA-256 fingerprint and expiry, advance request state, and write operational plus identity-vault audit evidence. Follow [Exceptional identity access](../docs/production/judicial-access.md).

## Delivery providers

Local development may use simulation providers:

```env
EMAIL_PROVIDER=simulation
SMS_PROVIDER=simulation
```

Production-like environments require an approved real email provider; SMS may be `disabled` or use Twilio/Brevo. Jobs are stored durably with encrypted payloads, recovered after worker interruption, retried with bounded attempts, and retained under policy. Phone numbers and email addresses are normalized, encrypted with AES-256-GCM, and separately HMAC-hashed for controlled lookup/deduplication.

## Database and Prisma commands

```powershell
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate
npm run prisma:migrate:status
npm run prisma:migrate:deploy
npm run db:seed
```

`npm run db:reset` and `docker compose down -v` destroy local data. Use them only against a verified disposable development database.

## Quality commands

```powershell
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:functional
npm run test:coverage
```

From the repository root, `npm run docs:check` verifies that all controller operations are represented in OpenAPI.

## Error and request conventions

- JSON request bodies are whitelisted; unexpected properties return `400`.
- Errors use a stable envelope with `statusCode`, `error.code`, `error.message`, `path`, and `timestamp`.
- Clients may send `X-Correlation-ID` or `X-Request-ID` using 8–128 safe characters.
- Responses echo the accepted/generated identifier as `X-Request-Id` and `X-Correlation-ID`.
- CORS allows configured frontend origins and credentials only.
- The generic request limiter is per process, IP, method, and path; account lockout is database-backed. Scale-out requires a trusted-edge/shared limiter.

See [API conventions](../docs/api/README.md) for examples and status-code semantics.

## Production warning

Seed credentials, simulation providers, fallback development secrets, and the local Compose database are not production configuration. Complete the [production runbooks](../docs/production/README.md) and the [go/no-go acceptance matrix](../docs/recette/compliance-matrix.md) before deployment.
