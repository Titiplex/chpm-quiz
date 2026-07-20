# DPO/privacy acceptance

The DPO/privacy owner should verify implementation with fabricated data, review the actual processing context, and retain a signed decision. Code inspection or documentation alone is insufficient.

## Notice and lawful processing

1. Each questionnaire shows the approved controller, purpose, lawful basis/plain-language condition, recipients/providers, duration, pseudonymization, telemetry, retention, rights, DPO contact, support, and final-submission behavior.
2. Participation/consent/withdrawal wording matches the actual legal basis and care/research context.
3. Free-text instructions discourage direct identifiers.
4. The DPIA/record/processor/transfer decisions are complete and current.

## Data separation and minimization

1. Business screens and normal API responses never show clear respondent email/phone, identity hashes/ciphertext, cookies, or tokens.
2. Operational records are described as pseudonymized, not anonymous.
3. Telemetry fields and notification payloads are necessary, documented, and retention-limited.
4. Demo/static modes cannot receive real data in production.
5. Logs/audit/provider data exclude unnecessary contact, tokens, secrets, and answer bodies.

## Roles, scope, and statistics

1. Test every role and cross-organization/site/building/questionnaire attempt.
2. DPO has no ordinary business super-admin path.
3. Aggregate statistics suppress small cells on every dimension and do not permit simple differencing reconstruction.
4. Individual pseudonymized detail is analyst-only as designed and audited.
5. Exports exclude identity data, respect suppression, have a fingerprint/secure handling, and are audited.

## Identity and rights procedure

1. The SPA and normal API contain no code-to-contact export/search.
2. DPO console requires a named DPO login, justification, procedure reference, and explicit public codes.
3. Free email search and unbounded export are impossible in the approved workflow.
4. Output is minimal, encrypted, fingerprinted, time-limited, transferred securely, and recorded in operational plus identity-vault audit.
5. Judicial/request approval, rejection, execution metadata, closure, and destruction are evidenced.
6. Data-subject identity verification, search scope, response deadlines, exceptions, correction/deletion propagation, and communication are documented and rehearsed.

## Retention and recovery

1. Final object-specific periods are approved and match configuration, provider, logs, paper, exports, derived files, and backups.
2. Expiry/draft cleanup is executed and evidenced without deleting final submissions.
3. Identity unlinking/deletion and holds are controlled and audited.
4. Restoration does not silently reintroduce deleted data into active processing.

## Decision

`DPO GO` requires signed lawful-basis/Article 9 analysis, approved notice, completed DPIA where required, processor/transfer review, final retention, tested rights/identity procedure, verified scope/suppression, security/accessibility/restore evidence, and accepted residual risk.

`DPO NO-GO` applies when sensitive processing lacks the required DPIA/approval, retention or rights remain undefined, small-cell/direct-contact leakage exists, identity access bypasses the console/procedure, or any critical evidence is missing.
