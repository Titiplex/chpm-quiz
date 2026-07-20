# Preproduction and production compliance matrix

Status describes repository capability, not deployment evidence. “Implemented” still requires execution and approval in the target environment.

| Requirement | Repository status | Technical reference | Remaining production evidence/action |
| --- | --- | --- | --- |
| Containerized deployment | Production reference implemented | Hardened Dockerfiles, `docker-compose.production.yml`, immutable-digest preflight | Trusted registry, signing/provenance, vulnerability scan, target orchestration/HA evidence |
| TLS in transit | Production reference implemented | Nginx redirect, TLS 1.2/1.3, HSTS, CSP | Real certificate, renewal/expiry monitoring, independent scan |
| Contact encryption at rest | Implemented in application | `EmailCryptoService` AES-256-GCM | Key custody, separate credentials, rotation/re-encryption rehearsal |
| Hashed lookup separation | Implemented | HMAC contact hashes/pepper | Pepper custody/rotation and linkage-risk review |
| Encrypted backups | Script supplied | `ops/scripts/backup_encrypted.sh` | Managed storage/key separation, schedule, monitoring, real artifact evidence |
| Tested restoration | Procedure/script supplied | `restore_test.sh`, runbook | Execute on isolated target, meet approved RPO/RTO, retain evidence |
| Secrets excluded from frontend | Designed/validated by convention | Only `VITE_*` public configuration | Build artifact secret scan and managed secret injection |
| Secret rotation | Partial | Rotation constraints documented | Versioned key custody; multi-key token strategy or planned invalidation; rehearsals |
| CORS and session-cookie controls | Implemented configuration | `main.ts`, environment validation, auth cookie options | Browser verification with final origins/proxy |
| Request validation/error envelope | Implemented | Global `ValidationPipe`, `ApiExceptionFilter` | Contract/fuzz/limit tests |
| Rate limiting | Single-instance plus shared account lockout | In-memory request buckets and database login lockout in `main.ts`/`AuthService` | Trusted-edge/shared limiter for multiple replicas, bypass/load testing, tuned policy |
| Observability | Application controls implemented | Three-part readiness, authenticated Prometheus token, JSON/correlation logs | Secure collector, dashboards, alert rules/routing, telemetry absence alerts |
| OpenAPI | Complete controller coverage with automated checks | `docs/openapi.yaml`, docs checker, Redocly | Publish/version API reference and review examples with consumers |
| User/developer/operator manuals | Implemented in repository | `docs/` hub | Localize/adapt contacts/policy; train users; control document versions |
| Role/scope model | Implemented and documented | Guards, services, permissions matrix/tests | Organization access review and negative preproduction evidence |
| Identity-vault separation | Implemented application/runtime boundary | Separate Prisma service/schema, separate DB roles, encrypted queue/contact, DPO controls | Target network/credential evidence, execution rehearsal, dual-audit review |
| Judicial/DPO request state machine | Implemented | Dedicated web/API workflow, organization/code ownership scope, independent validations, encrypted execution, TTL/fingerprint/audit | Client legal approval, hardened DPO workstation, recipient transfer/destruction and target end-to-end evidence |
| Incident procedure | Documented | Incident runbook | Named contacts, tooling, 72-hour decision workflow, tabletop evidence |
| Retention/purge | Automated application cycle implemented | Draft/response/identity/delivery/audit/export cleanup plus manual endpoint | Final periods, hold process, all-copy/provider/paper/backup deletion evidence |
| Respondent notice | Baseline draft | Respondent notice | Controller/DPO/legal approval, exact questionnaire localization/version evidence |
| Processing register/DPIA | Technical drafts | Register and DPIA checklist | Complete/sign actual lawful basis, Article 9, processors/transfers, residual risk |
| Accessibility WCAG 2.2 AA | Partial | Static tests and detailed manual checklists | Specialist/manual test, representative users, remediation/retest |
| Internal federation | OIDC implemented; native SAML not implemented | Authorization Code/PKCE, RSA validation, pre-provisioning, MFA ACR/AMR | Configure/test approved IdP; use an approved SAML-to-OIDC gateway if needed |
| Connected site/building creation | Implemented | Organization/site-scoped endpoints and audit | Target negative-scope acceptance evidence |
| Connected translation-draft creation | Implemented | Structural clone and conditional-reference rewrite | Qualified translation/editorial validation and acceptance evidence |
| Independent security testing | Not included | Security acceptance plan | SAST/SCA/container/penetration evidence and finding closure |

## Go/no-go statement

- **Technical preproduction:** conditional go only after real secrets, TLS, database credentials, non-simulation provider policy, migrations, health, fabricated end-to-end tests, and monitoring are in place.
- **Production:** technically deployable when the installation checks pass, but no-go until the DPO/controller signs the legal/DPIA/notice/retention decisions; security, accessibility, restore, incident, and identity-access exercises pass in the target environment; authentication meets institutional policy; and critical findings close.

Record the final decision, approvers, release digest/commit, evidence links, accepted residual risks, expiry/review date, and rollback authority.
