# Registre RGPD final - version préproduction

| Traitement | Finalité | Données | Destinataires | Stockage | Mesures |
| --- | --- | --- | --- | --- | --- |
| Questionnaires adaptatifs | Créer, publier, versionner des questionnaires | métadonnées, groupes, questions, règles, popups | administrateurs habilités | schéma public | RBAC, audit, version immutable |
| Invitations | Diffuser un lien unique et suivre les statuts | code public, bâtiment, statut, jeton hashé, email chiffré séparé | modérateurs périmétrés, DPO | public + identity | séparation logique, chiffrement email, expiration |
| Réponses et télémétrie | Passation, analyse de compréhension, statistiques | réponses, durées, événements popup/navigation, warnings identifiabilité | analystes/admins/DPO selon rôle | schéma public | pseudonymisation, seuils, audit exports |
| Notifications | Alerter sur soumissions ou événements | événements sans contenu de réponse | modérateurs/admins selon préférence | schéma public + provider email | pas de contenu sensible dans email |
| Accès judiciaire | Répondre à une demande formelle | correspondance code-email strictement visée | DPO, juridique, officier judiciaire | identity + audit | double validation, export chiffré, empreinte |

## Points à décider avant production réelle

- Base légale définitive par questionnaire et population.
- Durées de conservation signées.
- Qualification des questions pouvant relever de catégories particulières.
- Nécessité AIPD et résultat de l'analyse.
- Modalités d'information des répondants et canal d'exercice des droits.
