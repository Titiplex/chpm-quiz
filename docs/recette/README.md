# Acceptance and assurance evidence

This directory contains repeatable review checklists for business behavior, permissions, privacy, security, and accessibility. “Recette” is retained in the path for compatibility; all content is in English.

| Document | Review owner |
| --- | --- |
| [Business acceptance](acceptance-tests.md) | Product/research operations and QA |
| [Permissions matrix](permissions-matrix.md) | Security, product, privacy, and role owners |
| [Security acceptance](security-recipe.md) | Security/operations |
| [Accessibility acceptance](accessibility-recipe.md) | Accessibility specialist and representative users |
| [DPO acceptance](dpo-recipe.md) | DPO/privacy/legal |
| [Compliance matrix](compliance-matrix.md) | Release authority/governance |

## Evidence rules

For every run, record environment, release commit/image digest, date/time, tester, configuration relevant to the test, fabricated test-data identifiers, expected/actual result, artifacts, defect reference, retest, and approval.

- Never use real respondent/patient data for acceptance testing.
- Redact cookies, tokens, temporary passwords, contact data, keys, and sensitive answers from screenshots/logs.
- A checklist item is not passed because code or a document exists; execute and retain evidence.
- Tests of destructive maintenance, backup, restore, key rotation, and incident containment require isolated disposable targets and approved procedures.
- Production is no-go when any critical security/privacy/accessibility issue is open or required evidence/approval is missing.
