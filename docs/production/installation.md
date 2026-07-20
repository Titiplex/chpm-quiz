# Preproduction installation guide

This procedure recreates the supplied preproduction stack from repository source, environment values, Prisma migrations, and TLS certificate files.

## Prerequisites

- Reviewed release commit/tag and trusted build host.
- Docker Engine and Docker Compose v2.
- DNS name pointing to the reverse proxy.
- Valid certificate directory (`TLS_CERT_DIR`) containing `fullchain.pem` and `privkey.pem` with restricted permissions.
- Approved secret injection for database passwords, session/respondent secrets, AES keys, HMAC pepper, provider credentials, judicial-export key, and backup passphrase.
- Approved email/SMS provider modes and sender identities.
- Isolated preproduction data; never clone real production personal data without explicit authorization and minimization.

## Prepare configuration

From the repository root in PowerShell:

```powershell
Copy-Item .env.preprod.example .env.preprod
Select-String -Path .env.preprod -Pattern 'replace-with-|example|simulation'
```

Replace every placeholder and review every URL/origin/provider. Generate secrets using an approved cryptographic secret manager. Example commands for a controlled POSIX shell are:

```sh
openssl rand -base64 32  # EMAIL_ENCRYPTION_KEY_B64
openssl rand -base64 32  # JUDICIAL_EXPORT_KEY_B64
openssl rand -base64 48  # RESPONDENT_TOKEN_SECRET / EMAIL_HASH_PEPPER
```

Do not copy command output into tickets, shell history, chat, or repository files. Do not reuse a value across purposes.

## Deploy

```powershell
npm run preprod:up
```

Compose runs the Prisma migrator before the API, frontend, and TLS reverse proxy. Deployment uses `prisma migrate deploy`, never development migration commands.

## Verify

```powershell
curl.exe -k https://<host>/healthz
curl.exe -k https://<host>/api/health/ready
npm run preprod:logs
```

Preproduction is accepted only when:

1. `reverse-proxy`, `frontend`, `backend`, and `postgres` report healthy.
2. Readiness reports both database domains as `ok`.
3. Migration status matches the reviewed release.
4. Backend/proxy logs are structured and include a correlation identifier without secrets/contact/answer bodies.
5. Staff session cookies are `HttpOnly`, `Secure`, and use the approved `SameSite` value.
6. CORS accepts only final HTTPS frontend origins.
7. TLS/protocol/certificate/HSTS checks pass from an independent client.
8. No secret appears in built frontend assets; only explicitly public `VITE_*` values are present.
9. Simulation delivery providers are disabled in production-like mode.
10. Representative RBAC/ABAC, invitation, respondent autosave/submit, terminal, statistics suppression, audit, backup, and monitoring checks pass with fabricated data.

Record the release, configuration/change reference, image digests, migration output, health results, certificate result, test evidence, approvers, and time.

## Secret rotation constraints

- `RESPONDENT_TOKEN_SECRET`: current implementation has no multi-key verification. Rotation invalidates existing respondent/terminal-style signatures that depend on it; plan invitation handling and communication.
- `EMAIL_ENCRYPTION_KEY_B64`: rotate through controlled re-encryption with verified rollback/backup. Replacing it directly makes existing ciphertext unreadable.
- `EMAIL_HASH_PEPPER`: rotation requires recomputing hashes while authorized access to the old pepper/data remains.
- `JUDICIAL_EXPORT_KEY_B64`: verify active export decryptability/retention before retiring the old key.
- Session/database/provider credentials: revoke/rotate with staged health checks and documented dependency impact.

Keys and peppers require versioned custody, access review, recovery, and destruction procedures outside this repository.

## Rollback

Define rollback before deploying. Application rollback may be unsafe after a non-backward-compatible database migration. Prefer forward fixes and expand/contract migrations. If rollback is authorized, preserve evidence, confirm schema compatibility, use a reviewed image digest, verify both database domains, and repeat the acceptance checks.
