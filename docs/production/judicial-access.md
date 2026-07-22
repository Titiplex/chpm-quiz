# Exceptional identity-access procedure

Code-to-contact access is not an ordinary application permission. It is permitted only for a formal, authentic, lawful, necessary, proportionate, time-bound request under the data controller's approved procedure.

Project administrators, site managers, moderators, questionnaire authors, analysts, technical administrators, and judicial officers cannot independently retrieve direct respondent contact data. Execution requires an assigned DPO account after an independent legal validation.

## Roles and enforced state machine

| Action | Required role | Result |
| --- | --- | --- |
| Create request with 1–50 explicit public codes | `judicial_officer` | Organization-scoped `received` request |
| Legal validation | `judicial_officer` | Records named legal validator |
| DPO validation | `dpo` | Records named DPO validator |
| Reject before execution | `judicial_officer` or `dpo` | `rejected` with reason |
| Execute after both validations | `dpo` | `executed`, encrypted export, fingerprint, expiry, dual audit |
| Close executed workflow | `judicial_officer` | `closed` with closure evidence |

The DPO and legal stages are independent and may occur in either order. The request becomes `validated` only when both named validators exist. All reads and mutations are restricted to the caller's organization. Out-of-scope records are not disclosed.

## Authorization prerequisites

Before validation, independently verify:

- official request/procedure reference and requester identity;
- legal basis, special-category condition, jurisdiction, and court-order reference where applicable;
- necessity and proportionality of every explicit public code;
- authorized recipient, secure transfer, permitted use, export expiry, and destruction confirmation;
- whether disclosure can be narrowed, delayed, refused, or fulfilled without identity access;
- absence of an incident or integrity concern affecting the request, key, audit, or environment.

Free search by email/phone and unbounded export are not implemented. Split requests must not be used to bypass the 50-code maximum.

## Execution option A: dedicated web/API workflow

After both validations, the DPO opens **Email vault** (`/coffre-email`) and executes the validated request. The screen calls `POST /api/judicial-access/requests/{id}/execute`, loads only organization-owned approved codes, and downloads an AES-256-GCM envelope containing the minimal mapping. Plaintext contact is never returned by the API or displayed by the screen.

The response includes a SHA-256 fingerprint, row count, key reference, and `expiresAt`. Configure the hardened DPO workstation/browser so downloads land in an approved encrypted staging location, then move the envelope into the approved document vault. Treat the ciphertext and its decryption key as highly sensitive and keep them in separate controlled systems. Decrypt only in the approved recipient environment. Never copy the envelope into browser storage, a shared download folder, tickets, chat, or logs.

The application marks the export deleted after `JUDICIAL_EXPORT_TTL_MINUTES`; this metadata cannot delete recipient copies. The DPO must obtain destruction evidence for every transferred/local copy and then the judicial officer closes the request.

## Execution option B: local DPO console

This is a disabled-by-default break-glass alternative. It does not perform the institution's OIDC/MFA flow, so production use requires a formally approved hardened host, named DPO account, separate `DPO_DATABASE_URL` secret, and explicit `CHPM_DPO_CONSOLE_ALLOW_PRODUCTION=true` authorization for that one run. Prefer option A for routine approved requests.

Where the approved procedure specifically requires a local encrypted file rather than an API envelope:

```sh
npm --prefix backend run dpo:console
# Equivalent:
npm --prefix backend run identity-vault:console
```

The console requires a named active DPO login and the exact reference of an organization-scoped request already validated by both DPO and legal roles. The dedicated database role can see only DPO authentication fields, the approved request/code scope, required encrypted identity columns, limited execution fields, and append-only audit targets. It revalidates every code against the request organization, requests an execution note and typed confirmation, writes a mode-0600 AES-256-GCM file, fingerprints it, sets request execution/expiry metadata, and writes operational plus identity-vault audit evidence. It does not print plaintext contact to the terminal.

Run the console only on a hardened administrative host with restricted filesystem access. Move the file through the approved confidential channel, verify recipient identity and fingerprint, and remove all local copies at expiry.

Choose one execution option for a request. Do not execute the same approved request through both paths.

## Required evidence

- Request, court/procedure, legal-basis, and approval references.
- Exact public codes, proportionality decision, and missing-code result.
- Named judicial officer and DPO accounts; validation and execution timestamps.
- Release/environment, correlation ID, execution method, algorithm/key reference, row count, fingerprint, and expiry.
- Recipient identity, secure-transfer evidence, receipt, permitted use, and destruction confirmation.
- Operational and identity-vault audit records.
- Closure or rejection reason and approving owner.

Do not retain the clear mapping as routine evidence after its approved lifetime.

## Acceptance rehearsal

Before go-live and after material changes, use fabricated contacts to prove: cross-organization denial; both validation orders; single-stage execution denial; role denial; duplicate/invalid transition denial; 50-code limit; encrypted output; correct fingerprint; missing-code handling; audit entries; expiry marking; destruction; and closure. Capture evidence without plaintext contact or keys.

## Abort conditions

Stop without exporting if approval is missing or ambiguous, requester identity cannot be verified, codes are not explicit, scope appears excessive, MFA or audit is unavailable, the export key/recipient channel is unavailable, request state differs from the approved record, or the environment may be compromised. Preserve non-sensitive evidence and escalate to DPO, legal, and security.
