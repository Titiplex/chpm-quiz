# End-to-end business acceptance

Run against a migrated preproduction environment with fabricated data and real production-like configuration, except delivery may use an approved sandbox provider.

## Setup and roles

1. Create named test accounts for each enabled role through the intended provisioning path.
2. Create at least two organizations/sites/buildings so out-of-scope access can be tested.
3. Record the release, configuration, threshold, retention values, and provider modes.
4. Confirm demo/static modes are disabled.

## Authentication and delegation

1. Test valid/invalid login, inactive user, logout, expiry, and session revocation.
2. Project administrator lists sites and creates/updates/disables a site manager.
3. Site manager creates/updates/disables a moderator in an in-site building.
4. Attempt cross-site building assignment and superior/specialized role creation; the API must reject.
5. Verify one-time temporary password handling and audit evidence.

## Questionnaire administration

1. Create a draft with purpose, language, and metadata.
2. Add groups, supported question types, Likert scale, options, help pop-up, and conditions.
3. Update and archive draft elements; verify they remain in the expected audit/history model.
4. Test matching/non-matching conditional paths and resumed sessions.
5. Run publication check, correct errors, publish, and verify immutability.
6. Verify staff without builder roles cannot mutate content.

Evidence: UI captures without secrets, relevant API results, publication audit, version identifiers, negative-access results.

## Invitation channels

For email, SMS, terminal, paper, and refusal modes as configured:

1. Create in-scope and out-of-scope requests.
2. Validate required/forbidden contact fields and invalid E.164/expiry inputs.
3. Confirm normal responses/UI/logs contain masked contact only and no token in inappropriate places.
4. Test resend eligibility and submitted/expired conflicts.
5. Test status transitions and scoped list visibility.
6. Verify a refusal never creates a response session/submission.

## Respondent workflow

1. Open a valid link and verify the exact approved notice/version.
2. Test invalid, altered, expired, and already-used/locked tokens.
3. Answer every type, open help, navigate backward/forward, autosave, close, and resume.
4. Attempt wrong-question IDs, malformed values, extra fields, and oversized batches.
5. Submit, verify answer/session/submission locks, then retry submit/autosave.
6. Verify invitation status and audit/metrics without clear contact/token/answer bodies.

## Terminal workflow

1. Create a terminal and capture the clear token once through the approved setup channel.
2. Verify device/building scope and pending invitation list.
3. Attempt opening an unassigned, expired, submitted, and cross-building invitation.
4. Complete a dual-token respondent flow.
5. Revoke/regenerate the terminal token and confirm old access fails.
6. Verify handoff clears the previous respondent view.

## Paper workflow

1. Generate and inspect a blank PDF for the exact published version.
2. Create a `paper_form` invitation without contact data.
3. Transcribe valid responses and verify warnings/audit/locked submission.
4. Test wrong channel, wrong questions, duplicate entry, and invalid answers.
5. Verify paper retention/destruction evidence.

## Statistics and exports

1. Verify totals/rates/durations across questionnaire, version, delivery mode, site/building, group, question, and pop-up.
2. Recalculate a representative sample independently.
3. Test below/at/above `STATISTICS_MIN_GROUP_SIZE` for every granular surface.
4. Confirm roles/scopes and analyst-only individual pseudonymized detail.
5. Export the minimum scope; verify identity exclusion, no email/phone/hash/ciphertext/token, fingerprint, suppression, and audit.
6. Attempt differencing/filter combinations that could expose small cells and record risk decision.

## Compliance, notification, and operations

1. Review technical register and retention output against approved values.
2. Run expiry and draft cleanup on disposable test records; verify counts/invariants.
3. Create/update notification subscriptions and process a digest with authorized recipients only.
4. Verify health, authenticated metrics, structured logs, correlation IDs, and alert generation.
5. Execute encrypted backup and isolated restoration.
6. Run incident and exceptional-access tabletop/technical exercises.

## Known-gap acceptance

Confirm the connected deployment does not advertise demo-only building creation or questionnaire translation-draft actions. If those UI controls remain visible, record a release-blocking product decision or implement the missing backend behavior before production.

## Exit criteria

- All critical paths and negative tests pass.
- No cross-scope/direct-contact/token leakage is observed.
- Statistics suppression and irreversible transitions are verified.
- Accessibility, security, DPO, restore, and incident evidence is approved.
- Known limitations have explicit owners, risk decisions, and user-facing treatment.
