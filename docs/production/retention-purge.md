# Procédure conservation et purge

## Paramètres opérationnels

| Variable | Défaut local | Décision production |
| --- | ---: | --- |
| `RESPONDENT_TOKEN_TTL_DAYS` | 30 | à valider métier/DPO |
| `DRAFT_RETENTION_DAYS` | 45 | à valider métier/DPO |
| `IDENTITY_RETENTION_DAYS` | 365 | à valider DPO/juridique |
| `AUDIT_RETENTION_DAYS` | 730 | à valider sécurité/DPO |
| `STATISTICS_MIN_GROUP_SIZE` | 5 | 10 recommandé pour petits sites ou données sensibles |

## Actions API

- Expiration invitations : `POST /api/compliance/maintenance/expire-invitations`.
- Nettoyage brouillons : `POST /api/compliance/maintenance/cleanup-drafts`.
- Politique exposée : `GET /api/compliance/retention-policy`.

## Règles

- Une invitation expirée ne doit plus permettre d'ouvrir ou de soumettre.
- Un brouillon supprimé ne doit pas supprimer une soumission verrouillée.
- La suppression de la correspondance email-code doit être validée par DPO et auditée.
- Les exports doivent expirer et être tracés par empreinte.
