# backend/

Socle backend préparatoire pour la semaine 1. Aucun serveur applicatif n’est encore livré ici : le dossier fixe seulement les conventions attendues pour la suite.

Structure proposée :

- `src/config/` : lecture de configuration et variables d’environnement.
- `src/http/` : future couche API HTTP.
- `src/modules/` : modules métier isolés, par exemple invitations, questionnaires, réponses, statistiques et audit.

Le front reste une démo autonome cette semaine. La connexion API passera par `VITE_API_BASE_URL` côté frontend et par les types de `shared/`.
