# Developer guide

This guide covers local development and the rules for changing behavior safely. Read [System architecture](../architecture.md) first when working on authorization, identity data, respondent tokens, statistics, or deployment.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/` | Vue 3 application, Pinia stores, router, services, views, and frontend tests |
| `backend/src/` | NestJS modules, controllers, services, guards, filters, and backend tests |
| `backend/prisma/` | Prisma schema, migrations, and development seed |
| `shared/types/` | Framework-independent frontend API/domain/RBAC contracts |
| `public/content/i18n/` | Editable locale JSON files and locale manifest |
| `docs/` | Product, user, API, developer, operations, privacy, and acceptance documentation |
| `ops/` | Nginx and backup/restore scripts |

## Local workflow

Use the Node and npm versions declared by the repository. From the root:

```powershell
npm install
Copy-Item backend/.env.example backend/.env
npm run db:up
npm run prisma:migrate
npm run db:seed
```

Run backend and frontend in separate terminals:

```powershell
npm run dev:backend
npm run dev:frontend
```

Use only fabricated data in local and demo environments.

## Change checklist

### API behavior

When adding or changing an endpoint:

1. Apply authentication, roles, and service-level scope checks.
2. Define or update a validated DTO. Keep whitelist rejection enabled.
3. Add success, validation, unauthenticated, unauthorized, out-of-scope, and lifecycle-conflict tests as applicable.
4. Update `shared/types/api.ts` if the frontend consumes the payload.
5. Add or update the OpenAPI operation, schemas, examples, roles, and errors.
6. Update the relevant non-technical manual and codebase reference.
7. Run `npm run docs:check`, `npm run openapi:lint`, type checks, and affected tests.

### Database behavior

1. Change `backend/prisma/schema.prisma`.
2. Create a named migration; never edit a migration already applied outside a disposable environment.
3. Consider both operational and identity database credentials.
4. Add migration/repository tests and update retention, backup, and data-dictionary documentation.
5. Validate forward migration and a representative restoration.

### Frontend behavior

1. Keep access enforcement on the backend; route guards and hidden controls are user experience only.
2. Put reusable UI strings in locale JSON rather than components.
3. Preserve keyboard operation, focus visibility, labels, error association, and live-region behavior.
4. Add component/functional tests and update the relevant manual.

## Code documentation standard

Write comments in English. Add TSDoc when an exported type, function, or service has constraints that the type system or name cannot communicate, especially:

- security or privacy boundaries;
- token/secret lifetime and one-time-return behavior;
- scope and authorization invariants;
- irreversible lifecycle transitions;
- threshold or suppression behavior;
- unusual compatibility behavior;
- non-obvious concurrency or cryptographic requirements.

Do not comment straightforward assignments or repeat function names. Prefer a short explanation of *why* an invariant exists. Keep comments next to the code they constrain, and update them in the same change.

## Testing commands

```powershell
npm run test:unit
npm run test:functional
npm run test:a11y
npm run test:coverage
npm run typecheck
npm run lint
npm run build
npm run prisma:validate
npm run docs:check
npm run openapi:lint
```

Some backend tests use mocked Prisma services; functional coverage is not a substitute for preproduction checks against migrated PostgreSQL databases.

## API contract checks

`scripts/validate-documentation.mjs` derives method/path pairs from `*.controller.ts`, normalizes NestJS `:id` parameters to OpenAPI `{id}` syntax, and compares them to `docs/openapi.yaml`. It also requires unique `operationId` values and checks relative Markdown links.

Redocly performs structural OpenAPI linting. Both checks are required because syntactic validity does not prove controller coverage, and route coverage does not prove a valid schema.

## Security review triggers

Request explicit security/privacy review for any change involving:

- authentication, password reset, session revocation, or role delegation;
- contact encryption/hashing, token signing, or secret configuration;
- respondent free text, telemetry, public codes, or export fields;
- statistics thresholds or new segmentation dimensions;
- identity-vault or judicial workflow;
- notification recipient selection or third-party providers;
- audit-log contents or retention jobs;
- CORS, proxy, headers, rate limiting, or deployment topology.

## Seed and demo data

The seed contains French clinical questionnaire fixtures and fabricated operational records. This localized content is application data, not source-code documentation. Do not translate validated instrument wording casually, and do not treat seed credentials or simulated access links as production defaults.

## Known implementation gap

The local demo API supports site building creation and questionnaire translation drafts, while the connected backend currently does not. Do not copy demo routes into OpenAPI or production manuals until equivalent NestJS controllers, authorization, DTOs, services, persistence, and tests exist.
