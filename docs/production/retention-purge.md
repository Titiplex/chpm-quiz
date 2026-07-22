# Retention and purge procedure

Repository defaults are development placeholders, not approved production retention. The controller/DPO/legal/records owners must define periods per purpose, object, jurisdiction, hold, and research/clinical obligation.

## Configuration inventory

| Variable | Local default | Production decision required |
| --- | ---: | --- |
| `RESPONDENT_TOKEN_TTL_DAYS` | 30 | Invitation purpose, delivery delay, reminder policy, and risk |
| `DRAFT_RETENTION_DAYS` | 45 | Resume need versus minimization and withdrawal/abandonment rules |
| `IDENTITY_RETENTION_DAYS` | 365 | Rights/contact need, linkage purpose, legal basis, and deletion trigger |
| `AUDIT_RETENTION_DAYS` | 730 | Accountability, security, employment, legal, and storage constraints |
| `RESPONSE_RETENTION_DAYS` | 730 | Approved lifetime for submitted responses, answers, and response telemetry |
| `JUDICIAL_EXPORT_TTL_MINUTES` | 60 | Minimal encrypted export availability and recipient procedure |
| `STATISTICS_MIN_GROUP_SIZE` | 5 | Reidentification assessment; 10 or higher may be appropriate for sensitive/small sites |

Also decide retention for notification records, judicial request metadata, logs/metrics, backups, paper forms, provider data, and derived analytical datasets. A legal hold must be implemented through the approved external hold/change procedure before the automated cutoff reaches affected data.

## Implemented maintenance operations

- `POST /api/compliance/maintenance/expire-invitations`
- `POST /api/compliance/maintenance/cleanup-drafts`
- `POST /api/compliance/maintenance/run-retention` (`technical_admin` only)
- `GET /api/compliance/retention-policy`

When `ENABLE_RETENTION_WORKER=true`, the API runs the complete retention cycle at startup and every `RETENTION_WORKER_INTERVAL_MINUTES` (24 hours by default). The worker prevents overlapping executions. The manual endpoint is for a named technical administrator during validation or controlled recovery; a scheduler does not need a reusable staff cookie.

The complete cycle expires invitations, removes stale draft/abandoned sessions, removes submitted sessions beyond `RESPONSE_RETENTION_DAYS`, scrubs expired identity mappings, prunes operational and identity audit records at their cutoffs, deletes expired delivery records, and marks judicial exports deleted after their TTL. Database cascades remove dependent answers, telemetry, and submission records with the parent response session.

## Required invariants

- An expired invitation cannot open, autosave, or submit.
- Draft-only cleanup cannot delete or unlock a final submission; the complete retention cycle deletes final data only after the approved response cutoff.
- A refusal record never becomes a submission.
- Identity deletion/unlinking is approved, scoped, and audited.
- Legal/incident holds suspend only the necessary deletion and are reviewed/expired.
- Export files expire and are tracked by fingerprint/secure-document metadata.
- Backups follow their own short, immutable retention and are not used to silently restore deleted operational data.
- Provider copies, logs, caches, replicas, paper, and derived files are included in the deletion design.

## Scheduled run procedure

1. Confirm environment, approved policy version, current holds, backup/restore health, and expected volume.
2. Record a change/job reference and correlation identifier.
3. Trigger the complete retention cycle or observe the scheduled execution; use the two narrower maintenance routes only for scoped troubleshooting.
4. Capture reported cutoffs/counts and compare with trend/expectation.
5. Verify representative expired links fail and submitted records remain intact.
6. Review audit evidence and investigate anomalies before any additional deletion.
7. Record outcome, exceptions, follow-up owners, and approval.

## Rights or exceptional deletion

Do not perform ad hoc SQL deletion. Verify requester identity and lawful scope through the approved DPO process, identify all relevant domains/copies, preserve required legal records, execute a reviewed deletion/anonymization plan, and document completion without retaining the deleted personal data in the evidence.
