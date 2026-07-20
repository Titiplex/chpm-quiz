# Security acceptance plan

Use fabricated data in an isolated preproduction environment. Coordinate intrusive/load tests and do not include secrets/tokens/contact/answers in evidence.

| Test | Expected result | Evidence |
| --- | --- | --- |
| Unauthorized CORS origin | Browser cannot read credentialed response; no permissive origin header | Browser/network capture and server config |
| Session cookie | `HttpOnly`, `Secure` in production-like mode, approved `SameSite`, scoped path/lifetime | Browser cookie capture with value redacted |
| Login and enumeration | Generic failure, rate controls, no password/log leakage | API/log/metric evidence |
| Session expiry/revocation | Old cookie fails immediately after logout/reset/disable/revoke | Negative API tests and database/audit evidence |
| Role and cross-scope access | Every forbidden controller/object operation rejected/hidden | Automated authorization contracts + manual API matrix |
| Respondent token tamper/expiry | Rejected; no session/answer disclosed or written; invalid-attempt metric | API, database, metric evidence |
| Terminal token revoke/regenerate | Old token fails; assigned/cross-building rules enforced | API and audit evidence |
| DTO/unknown fields/limits | Invalid/extra/oversized payloads rejected without partial mutation | API and database checks |
| Final immutability | Published versions and submitted answers cannot be altered through supported APIs | Conflict results and integrity checks |
| Contact protection | No clear contact/hash/ciphertext in normal UI/API/log/export; encryption authentication fails safely | Searches/tests with fabricated markers |
| Pseudonymized export | Correct scope/suppression; fingerprint/audit; no identity/token/secret fields | Export schema/content and audit |
| Identity bypass | Business API/roles cannot decrypt/search/export; DPO console controls work | Negative service/API tests and console exercise |
| TLS | Valid chain/name, TLS 1.2/1.3 policy, redirect, HSTS | Independent TLS scan |
| Security headers | `nosniff`, no-referrer, restrictive permissions policy, expected cross-origin headers | `curl -I`/browser evidence |
| Rate limiting | Predictable `429` without proxy bypass; document single-instance limitation | Controlled test and architecture decision |
| Logging | Structured correlation without body, cookie, token, clear contact, answer, key, password | Redacted log sample and automated secret-marker search |
| Providers/SSRF/content | Approved endpoints/modes only; safe error handling and minimal payload | Config review and sandbox-provider evidence |
| Dependencies/images | No unaccepted critical/high vulnerabilities; build provenance/digests recorded | SCA/container scan and risk acceptance |
| Backup/key custody | Encrypted artifact/checksum, separated key, access logging | Backup evidence |
| Restoration | Both domains restored only to isolated targets and integrity/application checks pass | Restore report |
| Incident controls | Account/token/provider/terminal/export containment actions work | Tabletop/technical exercise report |

## Additional review

- Test CSRF assumptions for cookie-authenticated state-changing requests and document the chosen defense (SameSite/origin/CORS/reverse-proxy controls). Add explicit CSRF tokens if the deployment threat model requires them.
- Review XSS sinks, CSP deployment, dependency scripts, free-text rendering, CSV/spreadsheet formula injection in downstream exports, and generated PDF escaping.
- Review database least privilege, network segmentation, secret storage, key rotation/recovery, container users/filesystems/capabilities, patching, and administrative access.
- Review multi-instance/shared rate limiting before horizontal scaling.
- Perform an independent penetration test for a sensitive production deployment.

Any exploitable cross-scope access, identity/token/secret disclosure, authentication bypass, final-record mutation, small-cell disclosure, or unrestorable backup is release-blocking.
