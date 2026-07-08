# Modifier les textes et traductions sans toucher au code

Les textes mutualisés du front sont exposés dans des fichiers JSON éditables dans `public/content/i18n/` :

- `fr.json` pour le français, langue de référence et fallback obligatoire ;
- `en.json` pour l’anglais ;
- tout autre fichier `<code-langue>.json`, par exemple `de.json`, `es.json` ou `it.json`.

Ces fichiers concernent uniquement l’interface globale : navigation, connexion, boutons communs, messages d’accès, etc. Ils ne traduisent pas le contenu clinique des questionnaires. Les questionnaires gardent leur propre workflow de version/traduction.

Le front lit `public/content/i18n/locales.json` au démarrage pour savoir quelles langues afficher dans le sélecteur global. Ce manifeste est généré automatiquement à partir des fichiers JSON présents dans le dossier.

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

- `fr.json` existe comme langue de référence ;
- tous les fichiers `*.json` du dossier, sauf `locales.json`, contiennent les mêmes clés que `fr.json` ;
- chaque valeur est une chaîne non vide ;
- les variables entre accolades sont conservées d’une langue à l’autre.

## Ajouter une langue

1. Copier `public/content/i18n/fr.json` vers un nouveau fichier nommé avec le code langue :

   ```sh
   cp public/content/i18n/fr.json public/content/i18n/de.json
   ```

2. Traduire uniquement les valeurs à droite des clés.
3. Vérifier le fichier :

   ```sh
   npm run content:i18n:check
   ```

4. Régénérer la liste des langues visibles :

   ```sh
   npm run content:i18n:manifest
   ```

Le manifeste produit ressemble à ceci :

```json
{
  "locales": [
    { "code": "fr", "label": "French", "nativeLabel": "Français", "direction": "ltr" },
    { "code": "de", "label": "German", "nativeLabel": "Deutsch", "direction": "ltr" }
  ]
}
```

Le serveur de développement et le build régénèrent ce manifeste automatiquement avant de démarrer ou de compiler. La commande manuelle sert surtout à contrôler le résultat avant commit.
