# Project administrator manual

This manual is for project administrators/researchers using the technical `admin` role. This role oversees the project but does not grant access to direct respondent contact data.

## Before you begin

Confirm that:

- your account was created through the approved sensitive-user procedure;
- sites, organizations, and questionnaire ownership have been agreed;
- the privacy notice, retention periods, minimum statistics threshold, and escalation contacts are approved;
- real email/SMS providers are configured only in an authorized environment.

## Sign in and verify scope

1. Open the connected application URL supplied by operations.
2. Sign in with your named account.
3. Check the displayed role and environment.
4. Open **Project administration**.
5. Confirm that the listed sites belong to your project before making changes.

If you see another project, clear contact data, or an unexpected role, stop and report it. Do not continue to explore.

## Manage site managers

### Create a site manager

1. Open **Project administration**.
2. Select the correct site.
3. Enter the person's institutional email and display name.
4. Create the account.
5. Deliver the temporary password through the approved secret-sharing channel. It is displayed only once.
6. Ask the person to sign in and change/secure their credentials according to local policy.

You cannot use this screen to create another project administrator, DPO, technical administrator, or judicial officer. Those roles require the sensitive-user console and separate authorization.

### Change assignment or status

1. Select the site manager.
2. Update the display name, assigned site, or active state.
3. Confirm the intended scope carefully.

Sensitive changes revoke existing sessions. Tell the user to sign in again. Deactivate accounts promptly when responsibility ends; do not recycle an account for another person.

### Reset a password or revoke sessions

Use **Reset password** only after verifying the person's identity. Send the one-time temporary password securely. Use **Revoke sessions** after suspected device loss, account exposure, role change, or access termination.

## Oversee questionnaires

Use the questionnaire builder to review drafts and publication readiness. A published version is immutable. Corrections require a new version; never edit database records to alter a published instrument.

Before publication, require evidence that:

- wording and language are approved;
- purpose and respondent notice are accurate;
- required questions and answer options are correct;
- conditional rules cannot hide required content incorrectly;
- accessibility and mobile behavior were tested;
- the version dates and intended audience are correct.

See the [Questionnaire author manual](questionnaire-author.md).

## Review statistics and exports

Project administrators may see aggregates and create pseudonymized exports. Treat both as controlled data. Respect suppression indicators and do not combine exports with other data to infer identity.

Download only when there is an approved purpose and storage location. Record the purpose, minimize recipients, and delete the export according to its retention rule.

## Compliance and operations

The compliance area exposes the technical register, configured retention policy, audit information, and maintenance actions according to role. Maintenance actions can expire invitations or delete stale drafts; coordinate them with operations and verify the reported counts.

Project administrators cannot use the web interface to reveal respondent email addresses or phone numbers. Identity questions go through the DPO procedure.

## Current limitation

Project administrators can create sites inside their organization. The assigned site manager can then create buildings inside that site. Questionnaire administrators can clone a questionnaire into a separate language draft. Every action is server-scoped and audited; duplicate codes are rejected.

## End-of-task checklist

- Verify the intended site, user, questionnaire, or export one final time.
- Store one-time secrets only through the approved channel.
- Close downloaded files and remove unauthorized local copies.
- Sign out on shared devices.
- Report any surprising result rather than attempting workarounds.
