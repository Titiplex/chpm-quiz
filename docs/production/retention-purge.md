# Retention and purge procedure

Repository defaults are development placeholders, not approved production retention. The controller/DPO/legal/records owners must define periods per purpose, object, jurisdiction, hold, and research/clinical obligation.

## Configuration inventory

| Variable | Local default | Production decision required |
| --- | ---: | --- |
| `RESPONDENT_TOKEN_TTL_DAYS` | 30 | Invitation purpose, delivery delay, reminder policy, and risk |
| `DRAFT_RETENTION_DAYS` | 45 | Resume need versus minimization and withdrawal/abandonment rules |
| `IDENTITY_RETENTION_DAYS` | 365 | Rights/contact need, linkage purpose, legal basis, and deletion trigger |
| `AUDIT_RETENTION_DAYS` | 730 | Accountability, security, employment, legal, and storage constraints |
| `STATISTICS_MIN_GROUP_SIZE` | 5 | Reidentification assessment; 10 or higher may be appropriate for sensitive/small sites |

Also decide retention for submissions/answers, telemetry, notifications/queues, judicial records, encrypted exports, logs/metrics, backups, paper forms, provider data, and derived analytical datasets.

## Implemented maintenance operations

- `POST /api/compliance/maintenance/expire-invitations`
- `POST /api/compliance/maintenance/cleanup-drafts`
- `GET /api/compliance/retention-policy`

Only project or technical administrators may run maintenance actions according to controller roles. Schedule them through an authenticated, monitored job pattern; do not expose a reusable staff cookie in a general scheduler.

## Required invariants

- An expired invitation cannot open, autosave, or submit.
- Draft cleanup cannot delete or unlock a final submission.
- A refusal record never becomes a submission.
- Identity deletion/unlinking is approved, scoped, and audited.
- Legal/incident holds suspend only the necessary deletion and are reviewed/expired.
- Export files expire and are tracked by fingerprint/secure-document metadata.
- Backups follow their own short, immutable retention and are not used to silently restore deleted operational data.
- Provider copies, logs, caches, replicas, paper, and derived files are included in the deletion design.

## Scheduled run procedure

1. Confirm environment, approved policy version, current holds, backup/restore health, and expected volume.
2. Record a change/job reference and correlation identifier.
3. Run invitation expiry and draft cleanup separately.
4. Capture reported cutoffs/counts and compare with trend/expectation.
5. Verify representative expired links fail and submitted records remain intact.
6. Review audit evidence and investigate anomalies before any additional deletion.
7. Record outcome, exceptions, follow-up owners, and approval.

## Rights or exceptional deletion

Do not perform ad hoc SQL deletion. Verify requester identity and lawful scope through the approved DPO process, identify all relevant domains/copies, preserve required legal records, execute a reviewed deletion/anonymization plan, and document completion without retaining the deleted personal data in the evidence.
