# Recette DPO

## Points à vérifier

1. Les écrans et notices utilisent `pseudonymisé` dans les textes techniques/RGPD.
2. Les interfaces métier ne montrent pas l'email du répondant.
3. La notice explique finalité, droits, contact, durée estimée et soumission définitive.
4. Les réponses libres avertissent contre les identifiants directs.
5. Les statistiques appliquent un seuil minimal et affichent `effectif insuffisant`.
6. Les exports pseudonymisés sont journalisés avec auteur, rôle, périmètre, colonnes implicites et empreinte.
7. L'accès email-code exige demande, validation et export minimal chiffré.
8. La politique de conservation est cohérente avec le traitement réel.
9. L'AIPD est décidée et documentée avant production.

## Décision attendue

- `GO DPO` uniquement si base légale, notice, durées, AIPD, procédure droits et procédure judiciaire sont signées.
- `NO-GO DPO` si le questionnaire contient données sensibles sans AIPD ou si les durées restent non validées.
