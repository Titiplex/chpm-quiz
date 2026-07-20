# Production and preproduction runbooks

These runbooks describe the repository's operational baseline. They must be adapted to the target organization's infrastructure, contacts, legal decisions, recovery objectives, and security policy.

| Document | Purpose |
| --- | --- |
| [Installation](installation.md) | Recreate preproduction from repository, environment, migrations, and TLS material |
| [Operations](exploitation.md) | Services, health, metrics, alerts, logs, maintenance, and routine checks |
| [Backup and restore](backup-restore.md) | Encrypted backups and isolated restoration tests |
| [Incident response](incident-response.md) | Containment, evidence, privacy assessment, recovery, and closure |
| [Retention and purge](retention-purge.md) | Configured lifetimes and safe maintenance actions |
| [Respondent notice](respondent-notice.md) | English baseline notice requiring local approval/localization |
| [GDPR processing register](rgpd-register.md) | Technical draft for the controller's formal record |
| [DPIA checklist](aipd-checklist.md) | Screening and approval questions for high-risk processing |
| [Exceptional identity access](judicial-access.md) | DPO-controlled code-to-contact procedure |

Acceptance evidence is organized under [docs/recette](../recette/README.md). The API contract is [docs/openapi.yaml](../openapi.yaml).

## Release gate

Preproduction may start only after placeholders are replaced, TLS/secrets/providers are configured, migrations succeed, and health checks pass. Production additionally requires signed privacy/legal decisions, security and accessibility acceptance, tested restoration, monitored alerts, incident rehearsal, identity-access rehearsal, and organization-approved authentication.

Documentation marked “draft,” “recommended,” or “to be approved” is not a passed control.
