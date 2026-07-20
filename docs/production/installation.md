# Production installation and handover guide

This guide installs CHPM Survey 1.0 from a reviewed source release. The supplied production Compose file is a hardened single-node reference topology. For high availability, deploy the same frontend and API images behind the institution's load balancer and use managed PostgreSQL, secret storage, monitoring, and backup services.

The software can be deployed to production once the technical checks below pass. Go-live still requires the client to approve its DPIA, processing register, respondent notice, retention periods, identity provider, provider contracts, accessibility evidence, recovery objectives, and residual risks.

## 1. Prerequisites

- A reviewed release commit/tag and its SHA-256 manifest.
- Docker Engine 26+ and Docker Compose v2.27+, or an equivalent orchestrator.
- Node.js `22.18.x` and npm `10.9.x` on the validation host.
- A production DNS name and a valid TLS certificate. `TLS_CERT_DIR` must contain `fullchain.pem` and `privkey.pem` with restricted permissions.
- An OIDC client using Authorization Code flow, PKCE, and institutional MFA. Register the exact callback `https://<host>/api/auth/oidc/callback`.
- An empty PostgreSQL database or a managed PostgreSQL 17 database where an owner can create the migration and runtime roles.
- Approved email/SMS providers, sender identities, and data-processing terms. SMS may remain `disabled`.
- A secret manager, encrypted backup target, centralized logs, monitoring, and a tested alert route.
- Separate named owners for deployment, database, security, DPO/legal approval, and rollback authority.

Never copy real personal data into a test environment. Do not put secrets in the repository, image layers, tickets, chat, shell history, or build output.

## 2. Verify and test the release

From the release root:

```sh
node --version
npm --version
npm ci
npm run check
npm run build
npm run prisma:validate
npm run openapi:lint
```

`npm ci` uses both committed lockfiles. Do not substitute `npm install` during a controlled release. Archive the test output, release commit, lockfile hashes, and reviewer identity.

Run software-composition and image scanning in the client's approved tooling. At minimum, retain the results of:

```sh
npm audit --audit-level=high
npm --prefix backend audit --audit-level=high
npm sbom --sbom-format=cyclonedx > frontend-sbom.cdx.json
npm --prefix backend sbom --sbom-format=cyclonedx > backend-sbom.cdx.json
```

Any unresolved critical/high finding needs a documented decision by the security owner before go-live.

## 3. Create production configuration

```sh
cp .env.production.example .env.production
chmod 600 .env.production
```

Replace every `CHANGEME` and every `example.org` value. Pin `POSTGRES_IMAGE`, `NGINX_IMAGE`, and `NODE_IMAGE` to approved immutable `@sha256:<64 hex characters>` digests. Generate independent random values for every password—including the restricted DPO database role—token secret, encryption key, HMAC pepper, monitoring token, and backup passphrase.

For the two 32-byte AES keys:

```sh
openssl rand -base64 32
```

Inject secrets from the approved secret manager in the final platform. The `.env.production` file is only the Compose reference mechanism; delete or securely archive it after migration to managed injection.

Validate the final values and rendered Compose model:

```sh
npm run prod:config
```

The preflight rejects placeholders, mutable infrastructure-image tags, local authentication, simulation providers, missing MFA requirements, and identical runtime database URLs. The API performs additional validation at startup, including provider credentials, HTTPS origins, cryptographic key sizes, and distinct operational/identity database accounts.

## 4. Configure OIDC and staff access

Production requires `AUTH_PROVIDER=oidc`. Configure issuer, client ID/secret, exact HTTPS redirect URI, scopes, and either `AUTH_OIDC_REQUIRED_ACR` or `AUTH_OIDC_REQUIRED_AMR` to enforce the institution's MFA claim.

The implementation validates discovery endpoints, state, nonce, PKCE, RSA signature, issuer, audience/authorized party, timestamps, verified email, and the configured MFA claim. It provisions no account from IdP claims: every staff email must already exist as an active, scoped local authorization record. This prevents an authenticated but unapproved institutional account from entering the application.

Test login, logout, session revocation, inactive-account rejection, wrong organization/site/building access, and MFA failure using dedicated acceptance accounts. `ALLOW_LOCAL_AUTH_IN_PRODUCTION` must remain `false`.

## 5. Initialize database privileges

On a fresh Compose volume, `ops/postgres/init-production.sh` creates:

| Role | Purpose | Access |
| --- | --- | --- |
| `chpm_migrator` | One-shot Prisma migrations | Owns `public` and `identity` schemas |
| `chpm_operational` | API operational Prisma client | DML only in `public` |
| `chpm_identity` | API identity-vault Prisma client | DML only in `identity` |
| `chpm_dpo` | Disabled-by-default local DPO console | Column-limited reads/updates and append-only audit writes needed by that console |

Public database connection and schema privileges are revoked. After each migration, `db:apply-dpo-grants` recreates the filtered DPO-account view and reapplies the narrow console grants. The API receives only the operational and identity runtime URLs; Compose does not inject the PostgreSQL owner, migrator, DPO-console, backup, or bootstrap secrets into the backend container.

Initialization scripts run only when the PostgreSQL data directory is empty. For an existing or managed database, have the database owner review and run the SQL in `ops/postgres/init-production.sh` before migrations; set the standard `PGHOST`, `PGPORT`, `PGUSER`, and `PGDATABASE` connection variables for that execution. Verify grants independently after migration.

Do not point production at the local development role or use one runtime credential for both schemas.

## 6. Build, migrate, and start

```sh
npm run prod:build
npm run prod:up
npm run prod:logs
```

Compose starts PostgreSQL, applies `prisma migrate deploy` through the one-shot migrator, checks migration status, starts the read-only API/frontend containers, and finally starts the TLS reverse proxy. Development migrations and `prisma db push` are forbidden in production.

For an orchestrator, run the migrator image once before rolling API instances. Never run multiple migrations concurrently.

## 7. Bootstrap the first scoped administrator

Set the `BOOTSTRAP_*` values for the initial organization, site, building, and project administrator. Run once:

```sh
npm run prod:bootstrap
```

The command creates or updates only the declared scoped records, audits the action, and marks the temporary local password for rotation. With OIDC, the administrator's email must exactly match the pre-approved IdP email; the first valid federated login replaces local-password use. Remove the bootstrap password and profile values from active secret injection after verification.

Create DPO, judicial officer, technical administrator, questionnaire administrator, analyst, and service accounts only through the approved named-account procedure. Do not share accounts.

## 8. Verify the running system

```sh
curl --fail https://<host>/healthz
curl --fail https://<host>/api/health/live
curl --fail https://<host>/api/health/ready
curl --fail -H "Authorization: Bearer <monitoring-token>" \
  https://<host>/api/metrics/prometheus
```

Readiness must report `operationalDatabase`, `identityDatabase`, and `deliveryQueue` as `ok`. Also verify:

1. TLS 1.2/1.3, certificate chain/hostname, HTTP-to-HTTPS redirect, HSTS, CSP, and secure cookie attributes from an independent client.
2. OIDC login with MFA, pre-provisioning denial, logout, forced revocation, and no local-login form.
3. Negative cross-organization, cross-site, and cross-building access with fabricated data.
4. Site/building creation, translation draft cloning, publication immutability, and collection-window enforcement.
5. One email delivery and, if enabled, one SMS delivery through provider sandbox/production acceptance recipients; retry a controlled transient failure.
6. Respondent open, autosave, resume, submit, replay rejection, expired-link rejection, terminal, and paper workflows.
7. Small-cell suppression for totals and every segment; pseudonymized export contains no direct contact.
8. DPO/legal double validation, encrypted judicial export, audit evidence, expiry, and deletion using fabricated codes.
9. Automatic and manual retention runs with approved cutoffs and legal-hold procedure.
10. Encrypted backup and isolated restore test meeting approved RPO/RTO.
11. Central logs, dashboards, alerts, clock synchronization, certificate/provider/queue/backup alerts, and absence of secrets/contact/answers in logs.
12. Secret scan of built frontend assets; known demonstration passwords and `VITE_DEMO_MODE` data must be absent.

Record commands, timestamps, release/image digests, migration output, test identities/data set, results, defects, approvers, and evidence locations.

## 9. Scale-out requirements

Database login lockout is shared, but the generic HTTP rate limiter is process-local. Before running multiple API replicas, enforce the documented request and login limits at a trusted ingress or shared limiter and test client-IP handling with `TRUST_PROXY_HOPS`.

The supplied Compose database and reverse proxy are single-node. Client production requiring high availability must provide replicated PostgreSQL/PITR, redundant ingress, multiple stateless API/frontend instances, distributed monitoring, and an orchestrator-managed rolling strategy. These are infrastructure responsibilities, not application flags.

## 10. Upgrade and rollback

Before every upgrade:

1. Review release notes, OpenAPI changes, migrations, retention impact, and key/provider changes.
2. Take and verify an encrypted backup; complete a restore rehearsal when migrations are sensitive.
3. Confirm backward compatibility between the current database and both old/new application versions.
4. Run the complete acceptance subset in preproduction using the exact image digests.
5. Agree the rollback authority and observation window.

Prefer forward fixes and expand/contract migrations. Never roll an application image back across an incompatible schema. If rollback is approved, preserve incident/change evidence, use the reviewed previous digest, verify all three readiness checks, repeat authentication/scope/respondent/delivery tests, and document the outcome.

## 11. Final go-live decision

The technical release is ready only when all repository checks pass and the target installation evidence above is complete. The client—not the software vendor—must sign the DPIA/legal basis, respondent information, retention, provider/transfer terms, accessibility assessment, penetration/security results, disaster-recovery evidence, incident contacts, and accepted residual risks. Open critical findings or missing mandatory evidence mean no-go.
