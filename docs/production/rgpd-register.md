# Registre RGPD simplifié

| Traitement | Finalité | Données | Destinataires applicatifs | Stockage | Mesures |
| --- | --- | --- | --- | --- | --- |
| Invitations | Diffuser un lien unique et suivre les statuts | code public, bâtiment, statut, jeton hashé, email chiffré séparé | modérateurs périmétrés, responsables de site | schéma public + schéma identity séparé | séparation logique, chiffrement email, expiration, absence d'email dans API métier |
| Réponses et télémétrie | Passation, analyse de compréhension, statistiques | réponses, durées, événements popup/navigation, warnings identifiabilité | analystes et admins projet uniquement sous forme agrégée/pseudonymisée selon rôle | schéma public | pseudonymisation, seuils anti-réidentification, audit exports |
| Administration projet | Nommer responsables de site et contrôler les périmètres | email et identité professionnelle des comptes internes | admins projet / chercheurs | schéma public | RBAC, audit, reset temporaire, révocation de sessions |
| Administration de site | Gérer les modérateurs d'un site | email et identité professionnelle des modérateurs | responsables de site du périmètre | schéma public | ABAC site/bâtiment, audit, révocation de sessions |
| Notifications | Alerter sur soumissions ou événements | événements sans contenu de réponse, destinataires internes | rôles opérationnels selon préférence | schéma public + provider email | pas de contenu sensible dans email, pas d'email répondant exposé |
| Accès exceptionnel code-email | Répondre à une demande formelle ou exercer un droit sous contrôle DPO | correspondance code-email strictement visée | DPO uniquement via console serveur dédiée | schéma identity + audit | login nominatif DPO, justification, référence procédure, codes explicites, export chiffré, empreinte |
| Audit et sécurité | Traçabilité des actions sensibles | acteur, action, périmètre, horodatage, métadonnées minimales | admins habilités, DPO pour contrôle, sécurité technique | schéma public + identity audit | corrélation, rétention longue, pas de secret ni email en clair |

## Exclusions explicites

- Les administrateurs projet / chercheurs ne sont pas destinataires de la correspondance code-email.
- Les responsables de site et modérateurs ne sont pas destinataires des emails répondants.
- Le DPO n'utilise pas la SPA métier principale pour consulter les données protégées.
- L'API opérationnelle courante ne retourne ni email répondant, ni champ identity vault, ni export code-email.
