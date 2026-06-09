# CHPM Survey — Prototype front

Prototype Vue 3 + Vite illustrant un cahier des charges pour une plateforme de questionnaires adaptatifs, anonymisés et
administrables sans compétence informatique.

## Objectif

Cette version ne contient pas de backend. Elle sert à présenter visuellement le périmètre fonctionnel attendu :

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
produit : cartes, badges, shell applicatif, histogrammes simulés, sections statistiques, timeline et schémas visuels.
