# Recette DPO

## Points à vérifier

1. Les écrans et notices utilisent `pseudonymisé` dans les textes techniques/RGPD.
2. Les interfaces métier ne montrent pas l'email du répondant.
3. La navigation Vue principale ne contient ni coffre identité, ni correspondance code-email, ni export confidentiel.
4. Le compte DPO ne dispose pas d'une navigation métier sensible dans la SPA.
5. La notice répondant explique finalité, droits, contact, durée estimée et soumission définitive.
6. Les réponses libres avertissent contre les identifiants directs.
7. Les statistiques agrégées appliquent un seuil minimal et affichent `effectif insuffisant` sous seuil.
8. Les exports pseudonymisés excluent explicitement la table identité, ne contiennent aucun email et sont journalisés avec empreinte.
9. L'accès code-email exige la console DPO dédiée, un login nominatif DPO, une justification, une référence de procédure et une liste explicite de codes publics.
10. La console DPO interdit la recherche libre par email et l'export massif non borné.
11. L'export DPO code-email est minimal, chiffré si écrit sur disque, hashé, horodaté et journalisé dans l'audit opérationnel et l'audit identity vault.
12. L'AIPD est décidée et documentée avant production.

## Décision attendue

- `GO DPO` uniquement si base légale, notice, durées, AIPD, procédure droits et procédure d'accès exceptionnel sont signées.
- `NO-GO DPO` si le questionnaire contient des données sensibles sans AIPD, si les durées restent non validées, ou si la console DPO peut être contournée par l'API principale ou le frontend métier.
