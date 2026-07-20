# Preproduction and production compliance matrix

Status describes repository capability, not deployment evidence. “Implemented” still requires execution and approval in the target environment.

| Requirement | Repository status | Technical reference | Remaining production evidence/action |
| --- | --- | --- | --- |
| Containerized deployment | Preproduction implementation | Backend/frontend Dockerfiles, `docker-compose.preprod.yml` | Trusted registry, image signing/provenance, vulnerability scan, hardening |
| TLS in transit | Preproduction implementation | Nginx redirect, TLS 1.2+, HSTS | Real certificate, renewal/expiry monitoring, independent scan |
| Contact encryption at rest | Implemented in application | `EmailCryptoService` AES-256-GCM | Key custody, separate credentials, rotation/re-encryption rehearsal |
| Hashed lookup separation | Implemented | HMAC contact hashes/pepper | Pepper custody/rotation and linkage-risk review |
| Encrypted backups | Script supplied | `ops/scripts/backup_encrypted.sh` | Managed storage/key separation, schedule, monitoring, real artifact evidence |
| Tested restoration | Procedure/script supplied | `restore_test.sh`, runbook | Execute on isolated target, meet approved RPO/RTO, retain evidence |
| Secrets excluded from frontend | Designed/validated by convention | Only `VITE_*` public configuration | Build artifact secret scan and managed secret injection |
| Secret rotation | Partial | Rotation constraints documented | Versioned key custody; multi-key token strategy or planned invalidation; rehearsals |
| CORS and session-cookie controls | Implemented configuration | `main.ts`, environment validation, auth cookie options | Browser verification with final origins/proxy |
| Request validation/error envelope | Implemented | Global `ValidationPipe`, `ApiExceptionFilter` | Contract/fuzz/limit tests |
| Rate limiting | Limited single-instance implementation | In-memory middleware in `main.ts` | Trusted-edge/shared limiter, bypass/load testing, tuned policy |
| Observability | MVP implementation | Health, metrics, JSON/correlation logs | Secure collector, dashboards, alert rules/routing, telemetry absence alerts |
| OpenAPI | Complete controller coverage with automated checks | `docs/openapi.yaml`, docs checker, Redocly | Publish/version API reference and review examples with consumers |
| User/developer/operator manuals | Implemented in repository | `docs/` hub | Localize/adapt contacts/policy; train users; control document versions |
| Role/scope model | Implemented and documented | Guards, services, permissions matrix/tests | Organization access review and negative preproduction evidence |
| Identity-vault separation | Implemented application boundary | Separate Prisma service/schema, DPO console | Separate DB credentials/network roles, console rehearsal, dual-audit review |
| Judicial/DPO request state machine | Incomplete | API records requests; direct API export is denied | Fix DPO role mismatch; link console export to request execution/closure; add end-to-end tests/evidence |
| Incident procedure | Documented | Incident runbook | Named contacts, tooling, 72-hour decision workflow, tabletop evidence |
| Retention/purge | Partial implementation | Expiry/draft cleanup and policy endpoint | Final periods, scheduling, all-copy/provider/paper deletion evidence |
| Respondent notice | Baseline draft | Respondent notice | Controller/DPO/legal approval, exact questionnaire localization/version evidence |
| Processing register/DPIA | Technical drafts | Register and DPIA checklist | Complete/sign actual lawful basis, Article 9, processors/transfers, residual risk |
| Accessibility WCAG 2.2 AA | Partial | Static tests and detailed manual checklists | Specialist/manual test, representative users, remediation/retest |
| Internal federation (OIDC/SAML) | Not implemented | Configuration names alone are not authentication | Implement approved IdP/federation or obtain formal policy exception |
| Connected building creation | Not implemented | Demo API only | Implement backend authorization/persistence/tests or hide/operationalize externally |
| Connected translation-draft creation | Not implemented | Demo API only | Implement backend workflow/tests or remove production promise/control |
| Independent security testing | Not included | Security acceptance plan | SAST/SCA/container/penetration evidence and finding closure |

## Go/no-go statement

- **Technical preproduction:** conditional go only after real secrets, TLS, database credentials, non-simulation provider policy, migrations, health, fabricated end-to-end tests, and monitoring are in place.
- **Production:** no-go until the DPO/controller signs the legal/DPIA/notice/retention decisions; security, accessibility, restore, incident, and identity-access exercises pass; authentication meets institutional policy; critical findings close; and connected feature gaps are resolved or explicitly removed from the production user experience.

Record the final decision, approvers, release digest/commit, evidence links, accepted residual risks, expiry/review date, and rollback authority.
