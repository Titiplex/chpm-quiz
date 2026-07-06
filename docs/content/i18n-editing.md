# Modifier les textes et traductions sans toucher au code

Les textes mutualisés du front sont exposés dans des fichiers JSON éditables :

- `public/content/i18n/fr.json` pour le français ;
- `public/content/i18n/en.json` pour l’anglais.

Ces fichiers sont servis tels quels par le front. En production, il est donc possible de corriger un libellé, une consigne ou une traduction en remplaçant le fichier JSON publié, sans modifier les composants Vue ni recompiler l’application, si l’infrastructure permet de publier le dossier `public/content` indépendamment.

## Règles d’édition

1. Garder exactement les mêmes clés dans chaque langue.
2. Modifier uniquement la partie droite, entre guillemets.
3. Ne jamais supprimer les variables entre accolades, par exemple `{points}`, `{label}` ou `{level}`.
4. Utiliser des guillemets doubles valides JSON. Un guillemet dans une phrase doit être échappé avec `\"`.
5. Ne pas ajouter de données personnelles, d’exemples patients réels, d’emails réels ou de secrets dans ces fichiers.

Exemple :

```json
{
  "auth.login": "Connexion",
  "respondent.likert.group": "Échelle Likert {points} points pour {label}"
}
```

## Validation avant livraison

Depuis la racine du projet :

```sh
npm run content:i18n:check
```

La commande vérifie que :

- `fr.json` et `en.json` existent ;
- les deux fichiers contiennent les mêmes clés ;
- chaque valeur est une chaîne non vide ;
- les variables entre accolades sont conservées d’une langue à l’autre.

## Ajouter une langue plus tard

Le socle actuel expose `fr` et `en`. Pour une troisième langue, il faudra :

1. créer `public/content/i18n/<langue>.json` ;
2. ajouter le code langue dans `supportedLocales` côté `src/i18n/index.ts` ;
3. ajouter cette langue dans `scripts/validate-i18n-content.mjs` ;
4. traduire toutes les clés existantes ;
5. lancer `npm run content:i18n:check`.
