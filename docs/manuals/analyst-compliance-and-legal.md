# Analyst, compliance, and legal workflows

This manual covers sensitive review functions. Role access is deliberately separated: an analyst cannot open the identity vault, a project administrator cannot perform a DPO export, and a judicial officer does not receive unrestricted direct contact data.

## Aggregate statistics

1. Open **Statistics**.
2. Select the questionnaire and permitted scope.
3. Review invitation, opening, start, submission, abandonment, duration, field-tracking, version, delivery-mode, building/site, group, question, and pop-up indicators as available.
4. Check the displayed suppression threshold before interpreting any segment.
5. Treat `insufficient`, `suppressed`, or null granular values as unavailable.

Do not subtract totals, combine filters, or join external datasets to reconstruct a suppressed small cell. Statistical suppression is a privacy control, not missing data to be repaired.

## Pseudonymized submission detail

Analyst-only detail uses public codes and excludes direct contact data. It may still contain sensitive answers, free text, timestamps, building, and rare patterns.

Use it only for the approved purpose. Avoid searching free text for names or identity clues. If directly identifying content appears, stop and report it to the privacy owner rather than copying it into another file.

## Pseudonymized export

Before exporting, confirm:

- an approved purpose and recipient;
- the minimum questionnaire/scope needed;
- an approved encrypted storage location;
- a retention/deletion date;
- that threshold suppression is acceptable for the analysis.

After export, record the generated fingerprint and row/suppression metadata. The export excludes the identity schema; it is not anonymous and must remain access-controlled.

## Technical register and retention

The compliance view describes processing purposes, lawful bases, data categories, recipients, storage, safeguards, jobs, and configured retention rules. These values are a technical representation and must be reconciled with the organization's approved register and DPIA.

Maintenance actions can expire invitations and remove stale drafts. Authorized operators should run them according to schedule, retain counts/correlation IDs, and investigate unexpected deviations.

## Audit logs

Audit logs support accountability and incident review. Access them only for an approved operational, privacy, legal, or security purpose. Logs may contain staff identity, public codes, object identifiers, justifications, IP addresses, user agents, and metadata.

Do not add direct respondent contact data, passwords, tokens, keys, or answer content to audit justifications.

## Judicial workflow

The judicial officer records a request reference, legal basis, requester, explicit public codes, and supporting reference. The workflow then records required DPO/legal validation, rejection or execution, and closure.

The web workflow manages authorization state and secure-document metadata. It does not provide unrestricted identity-vault search.

The current preproduction workflow is not end-to-end operational: the DPO-validation web route has incompatible role checks, API execution is intentionally denied, and the DPO console does not currently advance the linked request through execution/closure. Until that integration is corrected and tested, keep the authoritative approval/closure record in the organization's approved external legal/DPO process.

## DPO exceptional identity access

Actual code-to-contact access uses the dedicated local DPO console, not the browser:

1. Verify the approved request and explicit public-code list.
2. Use a named DPO account in the controlled console environment.
3. Enter the required justification and procedure reference.
4. Export only the approved codes.
5. Encrypt the output using the authorized key procedure.
6. Record the fingerprint, recipients, expiry, transfer, and destruction evidence.
7. Close the legal workflow when evidence is complete.

Free search by email is forbidden. Project administrators, analysts, moderators, and technical administrators cannot substitute for the DPO role.

Follow the detailed [Exceptional identity access procedure](../production/judicial-access.md).

## Escalation triggers

Escalate immediately when:

- a small cell is visible below the configured threshold;
- an export contains direct email, phone, contact hash, or identity ciphertext;
- a role sees data outside its scope;
- free text contains direct identifiers;
- audit evidence is missing or mutable;
- a legal request lacks required validation;
- an encrypted export is lost, sent incorrectly, or retained past expiry.
