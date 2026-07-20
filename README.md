# CHPM Survey

CHPM Survey is a role-based platform for designing adaptive questionnaires, inviting respondents, collecting pseudonymized answers, and reviewing threshold-protected statistics. It combines a Vue 3 single-page application with a NestJS API and PostgreSQL.

The repository contains a connected application, a local demo mode, and a restricted static GitHub Pages demonstration. It also includes operational, privacy, accessibility, and acceptance-test documentation.

> **Deployment status:** version 1.0 contains a production deployment reference and the application-level controls required for client handover. It is technically deployable after the documented validation succeeds. Actual go-live remains conditional on the client's DPIA/legal approvals, accessibility and security acceptance, provider/IdP configuration, monitored infrastructure, and a successful backup restoration test.

## What the platform does

- Builds draft questionnaires with groups, question types, help text, pop-ups, conditional rules, and immutable published versions.
- Creates invitations by email, SMS, on-site terminal, or paper workflow.
- Gives respondents token-based access without an internal staff account.
- Autosaves answers, records limited interaction telemetry, and locks final submissions.
- Shows aggregate and pseudonymized statistics subject to anti-reidentification thresholds.
- Separates direct contact data into an identity schema and encrypts it at rest.
- Enforces role and organization/site/building scope on the server.
- Audits administrative, compliance, statistical, terminal, and exceptional-access actions.

CHPM Survey is a data-collection tool. It does not provide medical advice, diagnosis, or automated clinical interpretation.

## Roles and responsibilities

| Role | Main responsibility | Normal scope |
| --- | --- | --- |
| Project administrator / researcher (`admin`) | Oversees the project, questionnaires, site managers, aggregate statistics, and pseudonymized exports | Organization/project, excluding the identity vault |
| Site manager (`site_manager`) | Manages moderators, invitations, terminals, and aggregate statistics for one site | Assigned site |
| Moderator (`moderator`) | Creates and follows invitations, prints forms, and enters paper responses | Assigned building |
| Questionnaire administrator (`questionnaire_admin`) | Designs, versions, previews, and publishes questionnaires | Authorized questionnaires |
| Analyst (`analyst`) | Reviews aggregate statistics and explicitly pseudonymized records/exports | Analytics scope |
| DPO (`dpo`) | Independently validates and executes exceptional encrypted identity exports | Organization-scoped judicial procedure only |
| Judicial officer (`judicial_officer`) | Records and advances exceptional legal-access workflows | Legal workflow, not unrestricted identity data |
| Technical administrator (`technical_admin`) | Operates infrastructure, health, metrics, retention jobs, and terminal devices | Technical scope |
| Respondent | Completes one questionnaire through a signed token | Token-bound session |

See [Permissions and scope](docs/recette/permissions-matrix.md) for the authoritative human-readable matrix. Backend guards remain the enforcement source of truth.

## Application modes

| Mode | Purpose | Data source | Important constraint |
| --- | --- | --- | --- |
| Connected application | Development, preproduction, and production | NestJS API and PostgreSQL | Requires the environment-specific controls in the production guide |
| Local demo (`VITE_DEMO_MODE=true`) | UI exploration and frontend testing | Browser-local simulated API | Never use for real or sensitive data |
| Static Pages demo (`VITE_STATIC_PAGES_DEMO=true`) | Public, non-connected showcase | Bundled static fixtures | Publishes only the static moderation and patient questionnaire screens |

Demo accounts and fixtures are development-only. They must never be reused as acceptance or production credentials.

## Prerequisites

- Node.js `22.18.x`
- npm `10.9.x`
- Docker with Docker Compose for PostgreSQL and the preproduction stack
- PowerShell 7+ on Windows, or a POSIX-compatible shell on Linux/macOS

Check the active versions:

```powershell
node --version
npm --version
docker version
docker compose version
```

The required Node version is also recorded in `.node-version` and `.nvmrc`. On Windows, either install Node.js 22.18 directly, use Volta, or install `nvm-windows`; the `nvm` command is not included with Node.js itself.

## Quick start

From the repository root:

```powershell
npm ci
Copy-Item backend/.env.example backend/.env
npm run db:up
npm run prisma:migrate
npm run db:seed
```

Start the backend in one terminal:

```powershell
npm run dev:backend
```

Start the frontend in another terminal:

```powershell
npm run dev:frontend
```

Open `http://localhost:5173`. The API listens on `http://localhost:3000/api` by default. The frontend sends the `chpm_session` HTTP-only cookie with same-origin/CORS-authorized requests.

The sample environment uses a local PostgreSQL database named `chpm_quiz` with separate `public` and `identity` schemas. These local credentials are intentionally weak and must be replaced outside development.

## Validation

Run the normal repository checks:

```powershell
npm run check
npm run build
npm run prisma:validate
```

Validate the documentation and OpenAPI contract:

```powershell
npm run docs:check
npm run openapi:lint
```

Preview the interactive API reference locally:

```powershell
npm run openapi:preview
```

The OpenAPI coverage check extracts routes from every NestJS controller and fails when an operation is missing from `docs/openapi.yaml` or when the specification documents a nonexistent controller route.

## Configuration

The frontend application name and browser metadata are controlled by:

```env
VITE_APP_NAME="Institutional Questionnaires"
VITE_APP_DESCRIPTION="Secure questionnaire, invitation, response, and pseudonymized statistics platform."
```

Editable interface translations live in `public/content/i18n/*.json`. The language selector reads the generated `public/content/i18n/locales.json` manifest. To add a language, copy an existing locale file, translate values without changing keys, then run:

```powershell
npm run content:i18n:check
npm run content:i18n:manifest
```

The full editorial workflow is in [Editing interface translations](docs/content/i18n-editing.md).

## Documentation

Start with the [documentation hub](docs/README.md).

- [Non-technical user manuals](docs/manuals/README.md)
- [System architecture and security boundaries](docs/architecture.md)
- [Developer guide and codebase reference](docs/development/README.md)
- [API guide](docs/api/README.md)
- [OpenAPI 3.1 specification](docs/openapi.yaml)
- [Production and preproduction runbooks](docs/production/README.md)
- [Acceptance, security, privacy, and accessibility checks](docs/recette/README.md)

## Production installation

The production reference uses immutable base-image digests, separate migration/operational/identity database roles, OIDC with MFA, durable encrypted delivery queues, automatic retention, read-only runtime containers, TLS reverse proxying, authenticated monitoring, and encrypted backup/restore tooling.

Start with [Production installation and handover](docs/production/installation.md):

```sh
cp .env.production.example .env.production
# Replace every placeholder and configure TLS, OIDC, providers, database roles, and secrets.
npm run prod:config
npm run prod:build
npm run prod:up
npm run prod:bootstrap
```

Do not use these commands until `npm run prod:config` passes and the target owners have approved the go-live plan.

## Preproduction

Copy the preproduction template, replace every placeholder, and start the stack:

```powershell
Copy-Item .env.preprod.example .env.preprod
# Edit .env.preprod before continuing.
npm run preprod:up
curl.exe -k https://localhost/healthz
```

The stack includes PostgreSQL, a Prisma migrator, the NestJS API, the built frontend, an Nginx reverse proxy, and the encrypted-backup job. Follow [Preproduction installation](docs/production/installation.md) and complete every go/no-go check before exposing the service.

## Deployment constraints

- The supplied production Compose topology is single-node. High availability, PostgreSQL replication/PITR, redundant ingress, centralized secret storage, and immutable log/SIEM retention are client infrastructure responsibilities.
- The generic HTTP rate limiter is process-local. Multi-replica deployments must enforce equivalent limits at a trusted ingress or shared limiter; database-backed account lockout remains shared.
- Production staff federation supports OIDC Authorization Code with PKCE and MFA claim enforcement. Native SAML is not implemented; use an approved SAML-to-OIDC gateway if required.
- Email/SMS delivery requires client-approved providers, credentials, sender validation, and live acceptance tests. Simulation providers are rejected in production-like environments.
- Automated retention follows configured cutoffs, but legal holds, provider/paper/recipient copies, and destruction evidence remain procedural controls outside the application.
- Static GitHub Pages and local demo modes are demonstrations, not authenticated or data-collecting deployments.

## Security reporting

Do not include personal data, credentials, respondent tokens, encryption keys, or production URLs in an issue. Follow the owning organization's private security-reporting channel and the [incident response procedure](docs/production/incident-response.md).
