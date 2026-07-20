# GDPR processing register — technical draft

This is an engineering inventory for the data controller's Article 30 record and DPIA. It is not complete until the controller/DPO confirms purposes, lawful bases, Article 9 conditions, categories of people, recipients/processors, transfers, exact retention, and organizational controls.

| Processing activity | Purpose | Data and people | Authorized application recipients | Storage/processors | Technical safeguards |
| --- | --- | --- | --- | --- | --- |
| Staff account administration | Authenticate staff and enforce delegated scope | Professional identity/contact, role, organization/site/building, sessions, device/IP metadata | Project/site/technical administrators according to role | Operational schema, logs | Bcrypt, hashed sessions, RBAC/ABAC, revocation, audit |
| Invitations and delivery | Send/assign a unique link and follow operational status | Public code, questionnaire/version, site/building, expiry/status, encrypted/hash contact, terminal assignment | Scoped moderators/site managers; provider receives minimal delivery data | Operational + identity schemas; approved email/SMS providers | Schema/credential separation, AES-GCM, HMAC, masking, token hash/signature, expiry, audit |
| Questionnaire response | Present/adapt questionnaire, autosave, finalize | Pseudonymous code, answers/free text, state, timestamps, warnings | Respondent; scoped/authorized statistical roles after submission | Operational schema | Signed token, scope/state validation, final lock, no direct contact in normal response data |
| Interaction telemetry | Improve operation/understanding under approved purpose | Navigation/help/answer-change/duration events, question IDs, time | Authorized analytics/project roles through controlled statistics | Operational schema | Event allow-list, payload validation, pseudonymization, retention, notice |
| Statistics and pseudonymized export | Monitor collection and perform approved analysis | Aggregates, public codes, answers, building/version/time, telemetry counts | Site/project/questionnaire/analyst roles according to operation | Operational schema, controlled export storage | Minimum-cell suppression, role/scope checks, identity exclusion, fingerprint, audit |
| Notifications | Alert staff about approved operational events | Internal recipient/subscription, event metadata, public code where allowed | Subscribed authorized staff; provider | Operational schema + approved provider | No answer body/direct respondent contact in notices, scope checks, audit |
| Terminals and paper workflow | Enable non-digital/assisted participation | Device/building/token hash, assigned invitation; paper/transcribed answers and minimal note | Scoped operations staff and respondent | Operational schema, managed device, controlled paper | One-time token return, revocation, dual token, scope, locked paper submission, paper policy |
| Compliance and audit | Accountability, retention, security, incident/legal evidence | Staff actor, role, action, object/public code, justification, IP/user agent, metadata, fingerprints | Specifically authorized project/DPO/judicial/technical roles | Operational audit + identity-vault audit + controlled logs | Minimal logging, correlation, access control, retention, no secrets/clear contact/answer bodies |
| Exceptional identity access | Fulfil approved rights/legal request | Explicit code-to-contact mappings and request evidence | Named DPO through dedicated console; approved recipient | Identity schema + encrypted short-lived export + audit | Formal approvals, explicit codes, no free email search, AES encryption, fingerprint, expiry, dual audit |
| Backup and recovery | Restore service/data after failure | Encrypted copies of operational and identity domains | Restricted operations/recovery personnel | Approved encrypted backup storage | Separate dumps, encryption, checksum, key separation, restore tests, retention |

## Categories requiring explicit completion

- Controller/joint controllers/representatives and DPO contacts.
- Respondent/staff categories, including vulnerable populations.
- Detailed purposes, lawful bases, Article 9 conditions, and necessity/proportionality.
- Named processors/subprocessors, hosting/provider regions, international transfers, and safeguards.
- Per-object retention and deletion evidence, including backups/providers/paper/derived data.
- Security/organizational measures, access-review cadence, training, incident and rights processes.
- Automated decision-making: the repository does not implement automated clinical diagnosis; confirm actual downstream use.

## Explicit exclusions and boundaries

- Project administrators/researchers are not recipients of code-to-contact mappings.
- Site managers and moderators do not receive clear respondent contacts from normal APIs.
- Analysts receive only authorized aggregate/pseudonymized data, never the identity domain.
- The DPO does not use ordinary business screens for protected identity access; only the dedicated `/coffre-email` module/API or approved break-glass console may execute a validated request.
- The normal operational API returns neither clear respondent contact, identity ciphertext/hash, nor DPO export.

Review this record and the DPIA whenever purpose, questionnaire, population, site, provider, data field, telemetry, threshold, export, retention, or identity-access behavior changes.
