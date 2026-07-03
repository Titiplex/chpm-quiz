# Recette accessibilité WCAG 2.2 AA

## Parcours à tester

- Connexion interne.
- Création invitation.
- Parcours répondant complet au clavier.
- Likert au clavier et lecteur d'écran.
- Ouverture/fermeture popup explicative.
- Autosave et messages d'erreur.
- Confirmation de soumission finale.
- Statistiques et tableaux horizontaux.

## Critères

| Critère | Attendu |
| --- | --- |
| Navigation clavier | aucun piège, ordre logique, Shift+Tab OK |
| Focus visible | focus toujours perceptible |
| Labels | chaque champ a un label explicite |
| Erreurs | annoncées avec texte compréhensible |
| Contraste | ratio AA sur textes et contrôles |
| Likert | rôle/nom/état annoncés, ancres explicites |
| Dialogues | popup et confirmation annoncées comme dialogues |
| Responsive | cibles tactiles suffisantes, pas de perte de contenu |

Preuves : rapport manuel, captures, résultats tests `npm run test:a11y`.
