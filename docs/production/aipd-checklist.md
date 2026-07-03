# Checklist AIPD

| Question | Statut préproduction | Action avant production |
| --- | --- | --- |
| Les réponses peuvent-elles contenir des données sensibles ? | Possible | Revue question par question avec DPO |
| Les répondants sont-ils vulnérables ou captifs ? | À qualifier | Analyse contexte hospitalier/site |
| Une réidentification indirecte est-elle possible ? | Oui si petits effectifs | Seuil 10 recommandé et filtres limités |
| La table email-code existe-t-elle ? | Oui | Traiter comme pseudonymisé, pas anonymisé |
| L'accès identité est-il exceptionnel ? | Partiellement implémenté | Tester workflow complet et coffre documentaire |
| Les mesures de sécurité sont-elles testées ? | Préparées | Recette sécurité complète |
| Les sauvegardes sont-elles restaurées ? | Script fourni | Exécuter test de restauration et archiver preuve |
| Le risque résiduel est-il acceptable ? | Non décidé | Avis DPO/responsable de traitement |

Conclusion préproduction : l'AIPD est probablement nécessaire si les questionnaires portent sur santé, vulnérabilité, trauma ou petits sites. Le go production doit attendre la décision formelle du DPO.
