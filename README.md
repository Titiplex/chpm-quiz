# Survey App

Prototype Vue 3 + Vite pour une plateforme de questionnaires adaptatifs, anonymisés et
administrables sans compétence informatique.

## Objectif

Périmètre fonctionnel attendu :

- constructeur de questionnaires adaptatifs ;
- groupes de questions, ordre conditionnel et mélange aléatoire ;
- réponses libres et échelles Likert ;
- popups explicatifs configurables ;
- télémétrie de compréhension : temps de réponse, popups ouvertes, progression ;
- invitations par modérateur avec email et code unique ;
- reprise avant soumission, soumission unique ensuite ;
- séparation visuelle entre base métier et base email ;
- statistiques administrateur par question, questionnaire, soumission anonyme et bâtiment.

## Écrans

- `/` : vue d’ensemble du cahier des charges illustré.
- `/admin` : constructeur visuel administrateur.
- `/moderation` : interface modérateur pour invitations et suivi par bâtiment.
- `/questionnaire` : expérience répondant.
- `/stats` : panel statistique administrateur.
- `/architecture` : architecture visuelle des données et des droits.

## Socle applicatif

Maquette d'un front structurée et typée :

- layout commun avec navigation conditionnelle ;
- faux utilisateur connecté, piloté par un sélecteur de rôle Administrateur / Modérateur / Répondant ;
- garde de routes par rôle avec page d’accès refusé ;
- composants communs pour en-têtes, KPI et affichage du rôle courant ;
- types partagés dans `shared/` pour le RBAC et les premières entités métier ;
- dossier `backend/` préparé pour la future API centrale ;
- configuration `.env.example` pour le nom de l’app, le rôle démo par défaut et l’URL API.

### Droits visibles dans la démo

| Rôle           | Pages visibles                                                                   |
|----------------|----------------------------------------------------------------------------------|
| Administrateur | Accueil, Admin, Modération, Questionnaire, Statistiques, Architecture / sécurité |
| Modérateur     | Accueil, Modération, Questionnaire                                               |
| Répondant      | Accueil, Questionnaire                                                           |

Le changement de rôle se fait directement dans le bandeau supérieur. Si un rôle tente d’ouvrir une page interdite, le
routeur redirige vers `/403`.

## Installation

```sh
npm install
```

## Développement

```sh
npm run dev
```

## Build

```sh
npm run build
```

## Tests

```sh
npm run test:unit -- --run --pool=forks
```

## Note technique

Bootstrap reste la base CSS de la démo d’origine. Le prototype ajoute `src/assets/demo.css` pour obtenir un rendu plus
produit : cartes, badges, shell applicatif, histogrammes simulés, sections statistiques, timeline, schémas visuels et
contrôles de rôle.

Le backend n’est pas encore implémenté. Le dossier `backend/` documente la structure cible et les variables attendues
pour la suite.
