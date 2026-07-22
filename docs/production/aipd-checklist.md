# Data Protection Impact Assessment checklist

This is a technical screening aid, not legal advice and not a completed DPIA. The data controller and DPO/privacy owner must document the actual context, lawful basis, necessity, proportionality, risks, measures, residual risk, and approval.

| Question | Repository/preproduction observation | Required production decision/evidence |
| --- | --- | --- |
| Can answers include health, trauma, or other special-category data? | Yes, depending on questionnaire | Review every instrument and identify Article 9 condition/local basis |
| Are respondents vulnerable, dependent, or in a care/employment relationship? | Possible | Assess voluntariness, power imbalance, accessibility, and alternatives |
| Is systematic monitoring or behavioral telemetry used? | Limited navigation/help/time telemetry exists | Justify each event, minimize payload/lifetime, and explain it in the notice |
| Can indirect reidentification occur? | Yes through small cells, free text, timestamps, building, and rare patterns | Set/validate thresholds, limit dimensions, review free text, test linkage risk |
| Does code-to-contact correspondence exist? | Yes in a separate encrypted identity schema | Treat data as pseudonymized, not anonymous; restrict and audit access |
| Is identity access exceptional and proportionate? | Dedicated DPO screen/API and local-console workflow exist | Rehearse complete authorization/export/transfer/destruction procedure |
| Are processors/providers involved? | Email/SMS/hosting/monitoring may be used | Approve contracts, locations, subprocessors, transfer safeguards, and minimization |
| Are retention periods final? | Defaults are configuration placeholders | Approve per object/purpose and verify automated/manual deletion evidence |
| Are security measures tested? | Code and checklists exist | Complete penetration/security testing and close findings |
| Are backups restorable and deletions propagated? | Scripts exist | Execute restore, document RPO/RTO, retention, and deletion behavior |
| Can data-subject rights be fulfilled safely? | DPO procedure is designed | Document identity verification, scope, deadlines, exceptions, and audit |
| Is accessibility adequate for the population? | Automated/static checks exist | Complete manual WCAG 2.2 AA and assisted-workflow review |
| Is residual risk accepted? | Not decided by the repository | Obtain signed DPO/controller decision and consult authority if required |

## Minimum DPIA contents

- Processing description, data flow, actors, locations, processors, and technologies.
- Purpose, lawful basis, special-category condition, necessity, proportionality, and alternatives.
- Data categories, respondent population, scale, frequency, duration, and linkage potential.
- Threats and harms to confidentiality, integrity, availability, autonomy, fairness, and access.
- Implemented and organizational mitigations with named evidence.
- Residual likelihood/severity, action owners, deadlines, and formal approval.
- Reassessment triggers: new questionnaire, new site/population, new provider, new data field, lower threshold, identity workflow change, incident, or major architecture change.

Given the likely health/trauma context, vulnerable populations, identity correspondence, and small sites, assume a DPIA is required unless the responsible DPO documents a defensible contrary conclusion. Production is no-go until that decision and residual-risk acceptance are recorded.
