# Recette métier complète

## Administration questionnaire

1. Créer un questionnaire brouillon avec finalité, langue, période d'ouverture.
2. Ajouter groupes, questions, Likert, texte libre, popups et condition.
3. Prévisualiser le chemin conditionnel.
4. Publier la version.
5. Vérifier qu'une version publiée ne peut plus être modifiée en place.

Preuves : captures écrans admin, réponse API `/questionnaires`, audit log de publication.

## Modération

1. Se connecter comme modérateur.
2. Vérifier que seuls les bâtiments habilités sont visibles.
3. Créer une invitation email ou simulation selon environnement.
4. Vérifier absence d'email dans l'URL répondant.
5. Suivre statuts `sent`, `opened`, `draft`, `submitted`, `expired`.

Preuves : capture table invitations, logs sans email en clair, audit création invitation.

## Parcours répondant

1. Ouvrir le lien unique.
2. Lire notice et démarrer.
3. Répondre, ouvrir une popup, changer de page.
4. Interrompre puis reprendre.
5. Soumettre définitivement.
6. Réessayer de soumettre : l'API doit refuser.

Preuves : telemetry events, réponses draft puis verrouillées, statut invitation `submitted`.

## Statistiques

1. Vérifier volumes, completion, durée, popups par questionnaire/version/question/site.
2. Tester seuil anti-réidentification sous `STATISTICS_MIN_GROUP_SIZE`.
3. Exporter pseudonymisé et vérifier absence email/ciphertext.

Preuves : capture stats, export JSON avec `identityVaultExcluded=true`, audit export avec fingerprint.
