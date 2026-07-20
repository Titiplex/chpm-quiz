# Security and personal-data incident response

Use the organization's formal incident plan and emergency contacts. This runbook provides application-specific prompts; it does not replace legal advice, a breach assessment, or an incident commander.

## Open an incident when

- unauthorized or out-of-scope access is suspected;
- a respondent/terminal token, session, credential, key, or export may be exposed;
- an invitation/link went to the wrong recipient;
- a device or paper form is lost;
- direct contact data appears in an ordinary API/UI/log/export;
- identity-vault access occurs outside the approved procedure;
- data is altered, deleted, duplicated, or unavailable unexpectedly;
- encryption/decryption, backup, restoration, provider, or audit integrity fails;
- availability materially prevents safe questionnaire operation.

## Immediate actions

1. **Declare and coordinate.** Assign an incident lead, technical lead, evidence owner, communications owner, and DPO/privacy/legal contact.
2. **Record facts.** Time detected, reporter, environment, affected service/workflow, identifiers, observed behavior, and correlation IDs. Avoid copying sensitive content unnecessarily.
3. **Contain proportionately.** Revoke affected sessions/tokens/devices, disable delivery providers, pause invitations/exports/jobs, isolate an instance, or enter maintenance mode as needed.
4. **Preserve evidence.** Protect proxy/API/audit/identity logs, provider events, fingerprints, deployment/config history, database/backup metadata, and system time. Use approved forensic handling.
5. **Assess data impact.** Determine categories, sensitivity, pseudonymization/encryption state, number of people/records, access/transfer, duration, reidentification potential, and likely harms.
6. **Notify decision-makers.** Escalate promptly to DPO/controller/security/legal. Follow jurisdictional deadlines; under GDPR, supervisory-authority notification may be required within 72 hours after awareness, and high-risk breaches may require communication to affected people.
7. **Eradicate and recover.** Fix root cause, rotate appropriate secrets with a migration plan, restore if needed, validate integrity/scope, and monitor for recurrence.
8. **Close formally.** Record timeline, cause, affected scope, decisions, notifications, recovery evidence, residual risk, owners/deadlines, and DPO/security approval.

## Application-specific containment choices

- Staff account concern: disable account and revoke sessions.
- Respondent-link concern: expire/revoke the invitation according to supported workflow and issue a replacement only after recipient verification.
- Terminal concern: revoke or regenerate the terminal token and review assigned invitations.
- Provider concern: disable the provider credentials/configuration and preserve delivery logs without importing unnecessary content.
- Export concern: identify fingerprint, recipient, storage, transfer, copies, and expiry; revoke access and request verified deletion.
- Database concern: restrict network/credentials, preserve evidence, assess both operational and identity domains separately.

## Prohibited shortcuts

- Do not export or decrypt the identity vault merely to “see who is affected” without approved DPO/legal authority.
- Do not describe pseudonymized data as anonymous while code-to-contact correspondence or feasible linkage exists.
- Do not delete logs, records, devices, or artifacts before evidence/legal owners approve.
- Do not rotate an encryption key in a way that makes required data/backups undecryptable.
- Do not use real respondent data in reproduction tests.
- Do not communicate certainty, scope, or notification decisions before the incident lead and DPO/legal owner validate them.

## Exercise and evidence

Run at least annual and major-change tabletop exercises covering a wrong-recipient link, stolen terminal, unusual export, identity access, database compromise, and failed restoration. Track detection time, containment time, evidence quality, decision latency, communications, recovery, and corrective actions.
