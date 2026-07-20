# Permissions and scope matrix

Legend: `Yes` means allowed within the stated scope; `Conditional` requires the stated exceptional procedure; `No` means prohibited. This matrix documents intended behavior. NestJS guards and service-level checks are authoritative enforcement.

The persisted technical role `admin` means **project administrator/researcher**, not an identity/DPO super-administrator.

| Action | Respondent | Moderator | Site manager | Questionnaire admin | Analyst | Project admin | DPO | Judicial officer | Technical admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Complete token-assigned questionnaire | Yes, token scope | No | No | No | No | No | No | No | No |
| Create/resend/list invitations | No | Yes, building | Yes, site | No | No | No | No | No | No |
| Enter paper responses | No | Yes, building | Yes, site | No | No | No | No | No | No |
| View clear respondent contact | No | No | No | No | No | No | Conditional, DPO console | No | No |
| View code-to-contact mapping | No | No | No | No | No | No | Conditional, DPO console | No | No |
| Read published questionnaires | Token version | Yes | Yes | Yes | Yes | Yes | No | No | No |
| Create/edit draft questionnaires | No | No | No | Yes | No | Yes | No | No | No |
| Publish questionnaire version | No | No | No | Yes | No | Yes | No | No | No |
| Manage conditional rules | No | No | No | Yes | No | Yes | No | No | No |
| Read aggregate thresholded statistics | No | No | Yes, site | Yes, authorized | Yes, authorized | Yes, organization | No | No | No |
| Read individual pseudonymized submission | No | No | No | No | Yes | No | No | No | No |
| Export pseudonymized data | No | No | No | No | Yes, thresholds/scope | Yes, thresholds/scope | No | No | No |
| Manage site-manager accounts | No | No | No | No | No | Yes, project sites | No | No | No |
| Manage moderator accounts | No | No | Yes, own site | No | No | No | No | No | No |
| Provision sensitive roles | No | No | No | No | No | No | No | No | Conditional, approved local console |
| Administer terminal devices | No | Read scoped list | Yes, site | No | No | Yes, organization | No | No | Yes, organization |
| Read operational audit logs | No | No | No | No | No | Yes | Yes | Yes | Yes |
| Read technical metrics | No | No | No | No | No | No | No | No | Yes |
| Read technical register/retention | No | No | No | No | Yes | Yes | No | Yes | Yes |
| Run retention maintenance | No | No | No | No | No | Yes | No | No | Yes |
| Create/advance judicial request | No | No | No | No | No | No | No | Yes | No |
| Export code-to-contact | No | No | No | No | No | No | Conditional: explicit codes + authority + justification + encryption + dual audit | No | No |

## Scope rules

- Project administrators operate within their organization/project and cannot read the identity domain.
- Site managers operate only on their assigned site and its buildings.
- Moderators operate only on their assigned building.
- Questionnaire administrators are limited by questionnaire ownership/organization checks.
- Analysts receive authorized analytics scope and are the only role with individual pseudonymized submission detail.
- Technical administrators operate infrastructure/terminals/maintenance without clear respondent contact access.
- Judicial officers manage request state but do not independently decrypt identity data.
- DPO identity access occurs outside the SPA through the dedicated console and approved procedure.

Out-of-scope objects may return `404` to avoid confirming existence. A frontend page/menu is never an authorization boundary.

## Non-negotiable controls

- No routine role receives clear respondent contact or identity-vault fields through the business API.
- Superior/peer/specialized roles cannot be created through ordinary delegated account screens.
- Sensitive account/scope changes revoke sessions and create audit evidence.
- Published questionnaire versions and final submissions are immutable.
- Small-cell suppression and export identity exclusion are enforced server-side.
- One-time temporary passwords and terminal tokens are not logged or redisplayed.
