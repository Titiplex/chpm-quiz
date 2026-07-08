# shared/

Types partagés entre le frontend Vue et le backend NestJS du projet CHPM Quiz.

- `types/rbac.ts` : rôles, permissions et profils utilisés par le routing front et les guards backend.
- `types/domain.ts` : entités métier stables du questionnaire, des invitations et des soumissions pseudonymisées.
- `types/api.ts` : contrats JSON partagés pour les endpoints frontend/backend.

## Hiérarchie d'autorité

La valeur technique persistée `admin` désigne maintenant l'**administrateur projet / chercheur / responsable central**. Elle est conservée pour éviter une migration enum inutile, mais elle ne doit pas être interprétée comme un super-admin identité.

Chaîne attendue :

```text
console locale sécurisée
  -> crée admin projet / chercheur et DPO
admin projet / chercheur
  -> crée responsables de site depuis le frontend
responsable de site
  -> crée modérateurs de son site depuis le frontend
modérateur
  -> invite et suit les répondants dans son périmètre
DPO
  -> hors frontend principal, accès exceptionnel code-email via console dédiée
```

Permissions structurantes :

- `user:createProjectAdmin` : console locale uniquement.
- `user:manageSiteAdmins` : admin projet uniquement, pour gérer les responsables de site.
- `user:manageModeratorsScoped` : responsable de site uniquement, pour gérer les modérateurs de son site.
- `identity:accessConfidential` et `identity:exportCodeEmail` : DPO uniquement, jamais consommées par la SPA Vue principale.
- `stats:readAggregatedScoped` : statistiques agrégées et seuillées.
- `stats:readPseudonymized` : accès contrôlé, sans email et sans reconstruction d'identité.
