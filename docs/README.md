# CHPM Survey documentation

This directory is the documentation entry point for users, developers, operators, reviewers, and API consumers.

## Choose your path

| Audience | Start here | Then read |
| --- | --- | --- |
| Project administrator or research lead | [Non-technical manuals](manuals/README.md) | [Project administrator](manuals/project-administrator.md), [questionnaire author](manuals/questionnaire-author.md) |
| Site manager or moderator | [Site operations](manuals/site-manager-and-moderator.md) | [Respondent and terminal workflows](manuals/respondent-and-terminal.md) |
| Analyst, privacy, or legal staff | [Analysis, compliance, and legal workflows](manuals/analyst-compliance-and-legal.md) | [Privacy register](production/rgpd-register.md), [exceptional identity access](production/judicial-access.md) |
| Respondent-support staff | [Respondent and terminal workflows](manuals/respondent-and-terminal.md) | [Respondent notice](production/respondent-notice.md) |
| Developer | [Developer guide](development/README.md) | [Codebase reference](development/codebase-reference.md), [architecture](architecture.md) |
| API consumer | [API guide](api/README.md) | [OpenAPI 3.1 contract](openapi.yaml) |
| Operator / technical administrator | [Production runbooks](production/README.md) | [Installation](production/installation.md), [operations](production/exploitation.md), [backup and restore](production/backup-restore.md) |
| QA, security, privacy, or accessibility reviewer | [Acceptance documentation](recette/README.md) | [Compliance matrix](recette/compliance-matrix.md), [permissions](recette/permissions-matrix.md) |

## Documentation map

- `manuals/`: task-oriented instructions written for non-technical staff.
- `api/`: authentication, request conventions, examples, and API lifecycle guidance.
- `development/`: local workflow, module ownership, coding conventions, and change checklists.
- `production/`: installation, operations, privacy, retention, incident, backup, and exceptional-access runbooks.
- `recette/`: manual acceptance, permissions, accessibility, security, and DPO verification.
- `openapi.yaml`: complete machine-readable description of every NestJS controller operation.
- `architecture.md`: components, trust boundaries, data flows, and design constraints.

## Documentation guarantees

The documentation is maintained under these rules:

1. All repository documentation and code comments are written in English. Localized application content may remain in its target language.
2. OpenAPI describes implemented NestJS controller routes only. Demo-only frontend routes are documented as limitations, not production endpoints.
3. Security and privacy statements distinguish implemented controls from deployment responsibilities.
4. Role descriptions never override server-side guards or service scope checks.
5. Commands identify their expected working directory and avoid destructive operations unless the effect is explicit.

Run the automated checks before merging documentation or API changes:

```powershell
npm run docs:check
npm run openapi:lint
```

## Maintenance ownership

- Feature authors update the relevant manual, shared type, OpenAPI operation, and tests in the same change.
- Operators own environment-specific values, recovery evidence, alert thresholds, and contact details.
- The DPO/privacy owner approves the DPIA, notices, retention decisions, and exceptional-access procedure.
- QA records dated evidence for accessibility, security, restore, and business acceptance. Documentation alone is not evidence that a control passed.
