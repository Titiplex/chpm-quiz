# Codebase reference

This is a navigation aid for maintainers. It describes responsibility and important invariants; it is not a generated symbol listing.

## Frontend

### Entry and configuration

- `src/main.ts` creates the Vue application and installs Pinia/router.
- `src/router/index.ts` defines connected and static-demo route sets and the navigation authorization guard.
- `src/config/env.ts` resolves build/runtime feature flags and API base URL.
- `src/config/navigation.ts` maps roles to visible navigation entries and default paths.
- `src/i18n/index.ts` loads editable locale files and supplies the translation helper.

### API and stores

- `src/services/api.ts` is the only normal network boundary. It adds credentials and correlation identifiers, serializes JSON, parses responses, and converts failures to `ApiError`.
- `src/services/demoApi.ts` simulates selected API behavior for development. It is not a backend implementation or security boundary.
- Pinia stores in `src/stores/` own page-level loading/error state and typed calls for sessions, questionnaires, administration, moderation, respondents, terminals, statistics, notifications, and compliance.

### Views

- `ProjectAdministrationView.vue`: sites and site-manager accounts.
- `AdminBuilderView.vue`: questionnaire metadata, groups, questions, languages, rules, publication.
- `ModeratorView.vue`: invitation channels, tracking, blank PDF generation, paper entry, team/building actions.
- `RespondentView.vue`: legal notice, paginated response, autosave, telemetry, submission lock.
- `TerminalView.vue` and `TerminalAdminView.vue`: terminal operation and device administration.
- `StatsView.vue`: threshold-aware aggregate and pseudonymized statistical views.
- `ComplianceView.vue`: retention, technical register, export, identity boundary status, and judicial workflow views.

## Backend request pipeline

`backend/src/main.ts` configures CORS, per-process rate limiting, correlation identifiers, structured HTTP logs, security headers, cookies, the API prefix, exception normalization, and whitelist validation.

Protected controllers normally apply:

```text
SessionAuthGuard -> RolesGuard -> controller -> scoped service -> Prisma
```

Public respondent and terminal controllers instead verify signed tokens inside their services.

## Backend modules

| Module | Controller operations | Key invariant |
| --- | --- | --- |
| `auth` | OIDC start/callback, local login, password rotation, profile, logout | Verified IdP email maps only to a pre-provisioned account; clear session token is never stored server-side |
| `users` | Scoped site/building creation, project/site delegation, deprecated aliases | A manager cannot escape organization/site scope or create a peer/superior role |
| `buildings` | Scoped building list | Moderator sees one building; manager sees one site |
| `questionnaires` | Read/build/translate questionnaire structure | Published versions cannot be edited; translated drafts receive independent IDs and rewritten references |
| `versions` | Versions, rules, publication check/publish | Publication is validated, audited, and immutable |
| `moderation` | Invitations, resend, paper entry, terminal registration alias | Contact data is separated; all objects must be in scope |
| `respondent` | Resolve, autosave, telemetry, submit | Token, collection window, expiry, invitation state, and lock state are checked on every mutation |
| `terminal-admin` | List/create/update/revoke/regenerate | Clear terminal token is returned only on create/regeneration |
| `terminal` | Resolve terminal and open assigned invitation | Terminal can open only its assigned eligible invitations |
| `stats` | Aggregate/question/submission statistics | Small cells are suppressed; detail is role restricted and audited |
| `compliance` | Register, policy, scheduled/manual retention, pseudonymized export | Pseudonymized export never reads identity data; retention uses explicit cutoffs |
| `identity-vault` | Encrypted contacts, delivery jobs/events, boundary status, dual audit | Business API never exposes decrypted contact values or queue payloads |
| `judicial` | Organization-scoped double-validation request workflow | Only DPO execution after both named validations returns an encrypted minimal envelope |
| `notifications` | Subscriptions and digest processing | Recipient and object scope are rechecked |
| `audit` | Authorized audit listing | Logs must not become a secret or direct-contact leakage channel |
| `observability` | Health and metrics | Liveness is process-only; readiness checks both database domains and the durable queue |

## Shared security helpers

- `backend/src/common/access-scope.ts` centralizes organization, site, building, questionnaire, and version checks.
- `backend/src/common/guards/session-auth.guard.ts` resolves staff sessions.
- `backend/src/common/guards/roles.guard.ts` enforces controller role metadata.
- `backend/src/common/filters/api-exception.filter.ts` emits the stable error envelope.
- `backend/src/security/access-token.service.ts` creates and verifies signed respondent tokens.
- `backend/src/security/email-crypto.service.ts` encrypts, hashes, normalizes, and masks contact values.
- `backend/src/config/env.validation.ts` rejects unsafe or incomplete production-like configuration.

## Persistence

`backend/prisma/schema.prisma` contains two client generators and two database-domain configurations. Services use `PrismaService` for operational data and `IdentityPrismaService` for identity data. A single PostgreSQL server may host both schemas locally, but production should use separate least-privilege credentials.

Do not add a relationship that allows ordinary operational queries to return identity ciphertext or direct values. Keep cross-domain correlation explicit through public codes/foreign identifiers and audited services.

## Contract sources

| Concern | Source of truth |
| --- | --- |
| Implemented HTTP routes | NestJS controller decorators |
| Input validation | Backend DTO decorators |
| Authorization enforcement | Guards plus service scope/workflow checks |
| Client compile-time shapes | `shared/types/api.ts` |
| External API description | `docs/openapi.yaml` |
| Database model | Prisma schema and migrations |
| Editable UI language | `public/content/i18n/*.json` |

These sources are intentionally cross-checked but not generated from one another. A behavior change is incomplete until they agree.
