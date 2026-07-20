# Production go-live record

Copy this checklist into the client's controlled change/evidence system. Complete it for the exact release and target environment; repository documentation alone is not evidence.

## Release identification

| Field | Value |
| --- | --- |
| Release version and Git commit | |
| Source/archive SHA-256 | |
| Backend/frontend image digests | |
| OpenAPI version | `1.0.0` |
| Change/deployment reference | |
| Target hostname/environment | |
| Planned date and observation window | |
| Deployment owner / rollback authority | |

## Technical gate

- [ ] `npm ci`, lint, type checks, unit/functional tests, builds, Prisma validation, documentation coverage, and OpenAPI lint passed.
- [ ] SCA/SBOM, secret scan, SAST, image scan, and independent penetration/security testing have no unapproved critical/high finding.
- [ ] `.env.production` preflight passed with no placeholder and immutable infrastructure-image digests.
- [ ] TLS, DNS, redirect, HSTS, CSP, certificate renewal, secure cookies, CORS, and proxy-client-IP behavior passed independently.
- [ ] OIDC Authorization Code/PKCE, required MFA claim, pre-provisioning denial, inactive account, logout, revocation, and failure paths passed.
- [ ] Migration/status completed with separate migrator, operational, and identity roles; grants were independently reviewed.
- [ ] Liveness/readiness and monitoring-token checks passed; all dashboards, alerts, central logs, clocks, and on-call routes were exercised.
- [ ] Provider sender identities and email/SMS delivery, retry, timeout, durable restart recovery, and dead-job alerting passed.
- [ ] Cross-organization/site/building negative tests and every role/scope acceptance case passed with fabricated data.
- [ ] Collection windows, respondent, terminal, paper, translation, publication immutability, and replay/expiry paths passed.
- [ ] Small-cell suppression passed for totals and every segment; pseudonymized exports contained no direct contact/hash/ciphertext/token.
- [ ] Automatic/manual retention passed around each cutoff; legal-hold and all-copy destruction procedures were rehearsed.
- [ ] Judicial double validation, encrypted execution, fingerprint/TTL, dual audit, transfer, destruction, and closure passed with fabricated data.
- [ ] Encrypted backup and isolated restore met approved RPO/RTO; restore targets and temporary artifacts were destroyed.
- [ ] Frontend build contains no demo credentials, private configuration, secret, or unintended source map.
- [ ] Scale-out/HA controls were proved, or the accepted deployment is explicitly single-node with an approved availability risk.

## Governance gate

- [ ] Data controller and DPO approved the processing register, lawful basis/Article 9 condition, DPIA, respondent notice, rights process, and final retention schedule.
- [ ] Processors/sub-processors, transfers, provider contracts, data locations, and recipient/destruction obligations were approved.
- [ ] Accessibility assessment (WCAG 2.2 AA target), remediation, and representative-user acceptance were signed.
- [ ] Incident contacts, severity model, regulator/data-subject notification decision process, evidence custody, and tabletop exercise were approved.
- [ ] Account owners, periodic access review, joiner/mover/leaver, service-account, key/secret rotation, and emergency access procedures were approved.
- [ ] Backup/PITR ownership, recovery objectives, business continuity, maintenance windows, support/escalation, and end-of-contract deletion/return were approved.
- [ ] User/operator/DPO training and the English manuals/runbooks were accepted or controlled translations were produced.
- [ ] Every residual risk has an owner, rationale, compensating control, expiry/review date, and signatory.

## Decision

| Decision | Name / role | Date | Signature or evidence reference |
| --- | --- | --- | --- |
| Technical owner: go / no-go | | | |
| Security owner: go / no-go | | | |
| DPO/privacy owner: go / no-go | | | |
| Accessibility/product owner: go / no-go | | | |
| Data controller/business owner: go / no-go | | | |
| Rollback authority | | | |

Any unchecked mandatory item, open critical finding, failed restore, cross-scope leak, direct-contact leak, missing MFA, or unsigned DPO/controller decision means no-go.
