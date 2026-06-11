# shared/

Types partagés initiaux entre le front et le futur backend CHPM Quiz.

- `types/rbac.ts` : rôles, permissions et profils utilisés par le routing front et le contrôle d’accès backend attendu.
- `types/domain.ts` : premières entités métier stables du questionnaire, des invitations et des soumissions anonymes.

Ces types restent volontairement sans dépendance Vue afin de pouvoir être réutilisés côté API.
