# Exceptional identity access procedure

## Principle

Code-to-contact access is not an ordinary application permission. It is permitted only for a formal, authentic, lawful, necessary, proportionate, time-bound, and audited request approved under the controller's procedure.

Project administrators/researchers, site managers, moderators, questionnaire administrators, analysts, judicial officers, and technical administrators must not independently reconstruct contact-to-answer correspondence.

## Separation of duties

- The Vue business application does not provide identity-vault browsing, code-to-contact mapping, or confidential identity export.
- The normal REST API does not return clear respondent contact data or execute the DPO identity export.
- The judicial web workflow records request state and secure-document metadata; it is not unrestricted identity access.
- The DPO is not a business super-administrator and does not manage questionnaires/sites/moderators by default.
- The actual minimal export uses the server-side DPO console:

```powershell
npm --prefix backend run dpo:console
# Equivalent command name:
npm --prefix backend run identity-vault:console
```

> **Current implementation gap:** the web request state machine is not a complete chain of custody. `validate-dpo` cannot pass its contradictory controller/service role checks, API execution is intentionally rejected, and the DPO console does not currently advance the associated request through executed/closed states. Use the organization's external approved request record as authoritative until this integration is fixed and acceptance-tested.

## Authorization prerequisites

Before console access, independently verify:

- official request/procedure reference and requester identity;
- legal basis, special-category condition where applicable, and jurisdiction;
- required DPO/legal/controller approvals;
- exact public-code list and why each code is necessary;
- authorized recipient, secure transfer, use restriction, retention/expiry, and destruction confirmation;
- whether disclosure can be narrowed, delayed, refused, or fulfilled without identity export.

## Execution workflow

1. Receive the request through the official channel and open the judicial/legal workflow record.
2. Validate authenticity and proportionality outside the business frontend.
3. Record required DPO and legal approvals or rejection.
4. Use a controlled server/administrative environment with a named DPO account.
5. Start the DPO console and authenticate.
6. Enter the mandatory justification and procedure/legal reference.
7. Enter the explicit approved public codes. Free search by email and unbounded bulk export are prohibited.
8. Review the minimal result scope before writing an output.
9. Encrypt the file using the approved recipient/key procedure; generate and record its SHA-256 fingerprint, size, expiry, and controlled location/reference.
10. Verify operational and identity-vault audit evidence.
11. Transfer through the approved confidential channel and verify recipient receipt.
12. Close the workflow with outcome, fingerprint, recipients, expiry/destruction plan, and approver evidence.
13. Verify deletion at expiry and retain only the authorized audit/closure record.

## Evidence to retain

- Request, court/procedure, and approval references.
- Legal/proportionality decision and DPO justification.
- Exact public codes requested and exported.
- Named DPO account and controlled execution environment.
- Start/export/transfer/receipt/closure/destruction timestamps.
- Secure-document identifier, algorithm/key reference, size, expiry, and fingerprint.
- Recipient and secure-transfer evidence.
- Operational audit and `identity.vault_audit_logs` evidence.
- Rejection or exception reasoning where applicable.

Do not retain the clear exported contact mapping as routine evidence after its approved lifetime.

## Abort conditions

Stop without exporting if approval is missing/ambiguous, requester identity cannot be verified, codes are not explicit, the scope appears excessive, encryption/recipient keys are unavailable, audit is not functioning, console output differs from the approved scope, or the environment may be compromised. Escalate to DPO/legal/security.
