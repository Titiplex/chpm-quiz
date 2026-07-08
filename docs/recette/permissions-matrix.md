# Matrice permissions finale

Légende : `✓` autorisé, `●` autorisé sous condition stricte de périmètre/procédure, `✗` interdit.

Terminologie : la valeur technique persistée `admin` correspond à l'**administrateur projet / chercheur / responsable central**. Elle ne correspond pas à un super-admin DPO.

| Action | Répondant | Modérateur | Responsable de site | Admin questionnaires | Analyste | Admin projet / chercheur | DPO | Judiciaire | Tech admin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Répondre au questionnaire assigné | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Créer invitation dans périmètre | ✗ | ✓ bâtiment | ✓ site | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Relancer / suivre statuts d'invitations | ✗ | ✓ bâtiment | ✓ site | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Voir email répondant | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ● console DPO uniquement | ✗ | ✗ |
| Voir correspondance code-email | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ● console DPO uniquement | ✗ | ✗ |
| Modifier questionnaire brouillon | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Publier questionnaire | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Configurer popups/glossaire | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Consulter statistiques agrégées seuillées | ✗ | ✗ | ✓ site | ✓ | ✓ | ✓ global | ✗ | ✗ | ✗ |
| Consulter soumission pseudonymisée individuelle | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Exporter données pseudonymisées sans email | ✗ | ✗ | ✗ | ✗ | ✓ seuils | ✓ seuils | ✗ | ✗ | ✗ |
| Créer admin projet / chercheur | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ● console locale sécurisée |
| Créer responsable de site | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ frontend/API projet | ✗ | ✗ | ✗ |
| Créer/modifier modérateur | ✗ | ✗ | ✓ site uniquement | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Créer DPO | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ● console locale sécurisée |
| Accéder identity vault | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ● console DPO dédiée | ✗ | ✗ |
| Exporter code-email | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ● codes explicites + justification + procédure + audit + chiffrement | ✗ | ✗ |
| Gérer sites/questionnaires/modérateurs comme super-admin métier | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ selon rôle projet, sans identité | ✗ | ✗ | ✗ |
| Consulter journaux d'audit opérationnels | ✗ | ✗ | ✗ | ✗ | ✗ | ● | ● audit, pas identité en clair | ● | ✓ |
| Consulter métriques techniques | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

## Règles non négociables

- Les administrateurs projet / chercheurs ne voient jamais les emails répondants, la table identité ou l'identity vault.
- Les responsables de site ne voient jamais les emails répondants et ne sortent jamais de leur site.
- Les modérateurs ne gèrent aucun rôle et ne voient aucune réponse confidentielle.
- Le DPO n'est pas un super-admin métier : il n'administre ni questionnaire, ni site, ni modérateur par défaut.
- L'accès DPO à la correspondance code-email se fait hors SPA Vue, via `npm run dpo:console` ou `npm run identity-vault:console`.
- Toute mutation sensible doit créer un audit log et révoquer les sessions si le compte ou son périmètre change.
