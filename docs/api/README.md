# API guide

The CHPM Survey API is a JSON REST API implemented by NestJS. The complete OpenAPI 3.1 contract is [`docs/openapi.yaml`](../openapi.yaml).

## Base URL

The default development endpoint is:

```text
http://localhost:3000/api
```

`API_PREFIX` changes the `/api` segment. Reverse-proxy deployments normally expose the same prefix on the public HTTPS origin.

## Explore and validate the contract

From the repository root:

```powershell
npm run openapi:lint
npm run openapi:preview
```

The preview command starts an interactive local API reference. `npm run docs:check` independently compares every documented method/path pair with the NestJS controller decorators and checks operation identifiers and internal Markdown links.

## Authentication models

### Internal staff session

Production clients read `GET /auth/config` and start OIDC with `GET /auth/oidc/start`. The callback validates PKCE, state/nonce, signed identity claims, verified email, and the configured MFA claim, then creates the opaque HTTP-only staff session. The email must map to a pre-provisioned active account and local authorization scope.

`POST /auth/login` is the local-authentication route for development and expressly approved non-production use. It is disabled whenever `AUTH_PROVIDER=oidc`.

PowerShell example:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = "user@example.org"; password = "replace-me" } | ConvertTo-Json
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body `
  -WebSession $session

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/auth/me" `
  -WebSession $session
```

Possession of a session is insufficient for most routes. The API also checks the staff role and object scope.

### Respondent token

Respondent endpoints accept the signed token in the `token` query parameter for `GET /respondent/session`, and in the JSON body for autosave, telemetry, and submit. A terminal-assisted response also supplies `terminalToken`.

The token is a secret. Do not log it, include it in analytics, paste it into tickets, or reuse it across invitations.

### Terminal token

Public terminal endpoints accept a terminal launch token. It lists pending invitations for one device and authorizes opening an assigned invitation. Terminal creation and token regeneration return the clear token once; store it only on the managed device.

## Request conventions

- Request and response bodies use JSON unless an operation explicitly declares `text/plain`.
- Unknown JSON fields are rejected.
- UUID parameters use canonical UUID strings.
- Dates and timestamps use ISO 8601.
- Clients may send `X-Correlation-ID` or `X-Request-ID` with 8–128 characters from `A-Z`, `a-z`, `0-9`, `.`, `_`, `:`, or `-`.
- The server returns the accepted/generated identifier in both `X-Request-Id` and `X-Correlation-ID`.
- List endpoints are scoped. A successful empty list does not prove that no records exist outside the caller's scope.

## Error envelope

Most API failures use this shape:

```json
{
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "details": ["field must be a UUID."]
  },
  "path": "/api/example",
  "timestamp": "2026-07-20T12:00:00.000Z"
}
```

Common status codes:

| Status | Meaning |
| --- | --- |
| `200` | Successful read or update |
| `201` | Successful creation, action, or NestJS POST response |
| `204` | Successful action with no response body, when declared |
| `400` | Validation failure or invalid workflow transition |
| `401` | Missing, invalid, expired, or revoked session/token |
| `403` | Authenticated but not permitted |
| `404` | Missing object or an object intentionally hidden by scope |
| `409` | State conflict, duplicate, already submitted, or immutable version |
| `429` | Configured request/login rate limit exceeded |
| `500` | Unexpected server failure |
| `503` | Readiness dependency unavailable |

## Security-sensitive response rules

- Normal staff endpoints do not return clear respondent email addresses or phone numbers.
- Password-reset and terminal-token operations may return a secret once. Do not write it to logs or persistent browser storage.
- Pseudonymized exports exclude the identity schema but are still sensitive and access-controlled.
- Aggregate suppression fields must be honored by downstream clients; do not infer or reconstruct hidden small cells.
- Exceptional identity export is available only to a DPO after independent DPO/legal validation. It returns encrypted ciphertext, is restricted to explicit public codes, expires, and remains subject to the approved DPO transfer/destruction procedure.

## Examples

### List questionnaires

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/questionnaires" `
  -WebSession $session
```

### Create an email invitation

```powershell
$invitation = @{
  questionnaireVersionId = "00000000-0000-4000-8000-000000000001"
  buildingId = "00000000-0000-4000-8000-000000000002"
  email = "respondent@example.org"
  deliveryMode = "email"
  assistanceMode = "none"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/moderation/invitations" `
  -Method Post `
  -ContentType "application/json" `
  -Body $invitation `
  -WebSession $session
```

### Resolve a respondent session

```powershell
$token = [uri]::EscapeDataString("respondent-token-from-link")
Invoke-RestMethod -Uri "http://localhost:3000/api/respondent/session?token=$token"
```

## Compatibility and lifecycle

OpenAPI version 1.0 is the production handover contract. Changes must update backend DTOs, shared TypeScript types, OpenAPI, contract tests, release notes, and user/developer documentation together. Breaking changes require a reviewed version and upgrade plan.

The `/users/site-*` operations are deprecated aliases for `/site/*`. New clients must use the `/site` routes.

Connected building creation and questionnaire translation-draft cloning are part of the 1.0 contract. The identity-vault web access-attempt route remains error-only by design: it records and rejects attempts and never returns contact data.
