# Procédure incident et violation potentielle de données

## Déclenchement

Un incident est ouvert dès qu'un des cas suivants survient : suspicion d'accès non autorisé, perte de disponibilité prolongée, fuite de token, export inhabituel, erreur de chiffrement, altération de données, accès au coffre identité hors procédure.

## Étapes

1. Qualifier : service touché, heure, volumétrie, données potentiellement affectées.
2. Contenir : suspendre les comptes, désactiver invitations, couper le provider email ou isoler le service concerné.
3. Préserver les preuves : logs JSON, audit logs, empreintes d'exports, hash des sauvegardes.
4. Évaluer RGPD : nature des données, nombre de personnes, réidentification possible, mesures de protection effectives.
5. Décider notification : autorité sous 72h si violation de données personnelles avec risque ; personnes concernées si risque élevé.
6. Remédier : correctif, rotation secrets, révocation tokens, restauration si nécessaire.
7. Clôturer : compte rendu, causes racines, actions préventives, validation DPO/sécurité.

## Interdits

- Ne pas extraire le coffre email pour comprendre un incident sans procédure judiciaire/DPO formalisée.
- Ne pas communiquer un incident comme anonymisé tant que la table email-code existe.
- Ne pas supprimer les traces avant décision DPO/sécurité.
