# Audit clavier et lecteur d’écran — passe 7

Date cible : avant livraison production.
Périmètre critique : parcours répondant `/r/:token`, création d’invitation, coffre email, conformité.

## Parcours répondant

- Tab atteint la notice RGPD, la case de consentement, chaque bulle d’aide, chaque choix Likert, les boutons précédent/suivant et la confirmation finale.
- Shift+Tab revient en arrière sans piège clavier.
- Entrée/Espace active les boutons, choix Likert et cases de consentement.
- Le focus visible reste perceptible sur fond clair et sur cartes colorées.
- Le lecteur d’écran annonce : titre de question, aide, caractère obligatoire, libellé complet de chaque valeur Likert et statut verrouillé.
- La boîte de confirmation finale est annoncée comme dialogue et décrit l’irréversibilité de la soumission.

## Modération / invitations

- Tous les champs d’email, bâtiment, questionnaire et préférences de notification ont un label visible.
- Les erreurs de création d’invitation sont annoncées via `role="alert"`.
- En production, aucun token complet n’est affiché dans le dashboard.

## Conformité / coffre email

- Les boutons de maintenance RGPD sont accessibles au clavier.
- L’empreinte, le coffre documentaire, le statut de validation DPO/juridique et le compte rendu de clôture sont lisibles sans couleur.
- Aucune réponse API judiciaire n’affiche d’email ou de ciphertext dans l’interface.

## Responsive mobile

- Le Likert passe en colonne sur petits écrans.
- Les tableaux RGPD restent défilables horizontalement.
- Les cibles tactiles principales restent au moins à 44 px de hauteur.
