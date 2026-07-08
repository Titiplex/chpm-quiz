# CHPM Survey

Application Vue 3 + Vite + API NestJS pour une plateforme de questionnaires adaptatifs, pseudonymisés et administrables sans compétence informatique.

## Backend minimal, authentification et base de données

Cette itération remplace la simulation locale de rôle par une vraie session serveur :

- API NestJS TypeScript dans `backend/` ;
- PostgreSQL via Docker Compose ;
- Prisma comme ORM ;
- modèles initiaux : utilisateurs, rôles, bâtiments, questionnaires, groupes, questions et sessions ;
- authentification email/mot de passe pour les comptes internes ;
- cookie HTTP-only `chpm_session` ;
- guards NestJS pour bloquer les routes selon le rôle ;
- écran `/login` côté front ;
- récupération du profil connecté via `/api/auth/me` ;
- menus et pages conditionnels selon les permissions backend ;
- listes de bâtiments et questionnaires chargées depuis PostgreSQL.

## Données de démonstration

Les comptes et jeux de données de démonstration sont réservés au développement local avec `VITE_DEMO_MODE=true`. Ils ne doivent pas être documentés comme identifiants de recette ou de production. En préproduction et production, les comptes internes sont créés côté backend via la console d’administration locale et les secrets restent hors front.

## Prérequis Node.js

Le projet est verrouillé sur Node `22.18.x` et npm `10.9.x`. Vérifier la version active avant d’installer les dépendances :

```sh
node -v
npm -v
```

Sous Windows, la commande `nvm` n’existe que si `nvm-windows` a été installé séparément. Sans gestionnaire de versions, installer directement Node.js `22.18.0` depuis l’installateur Windows officiel, puis rouvrir PowerShell. Avec un gestionnaire, sélectionner la version indiquée par `.node-version` / `.nvmrc`.

## Installation

Front :

```sh
npm install
```

Backend :

```sh
cd backend
npm install
cp .env.example .env
```

La configuration locale fournie dans `backend/.env.example` est alignée avec `backend/docker-compose.yml` : PostgreSQL démarre avec la base `chpm_quiz` et l’utilisateur `chpm` / `chpm`. Les variables `OPERATIONAL_DATABASE_URL` et `IDENTITY_DATABASE_URL` utilisent donc ces mêmes identifiants en développement, avec une séparation par schéma PostgreSQL (`public` et `identity`). En production, remplacer ces URLs par des comptes séparés et des mots de passe forts.

## Base PostgreSQL

Depuis la racine :

```sh
npm run db:up
```

Puis depuis `backend/` :

```sh
npm run prisma:migrate
npm run db:seed
```

## Développement

Terminal 1, backend :

```sh
npm run dev:backend
```

Terminal 2, frontend :

```sh
npm run dev:frontend
```

Le front appelle par défaut `http://localhost:3000/api` avec `credentials: include` pour transmettre le cookie
HTTP-only.

Le nom visible de l'application est piloté par `VITE_APP_NAME`. Cette valeur est utilisée dans la barre supérieure du front, dans le titre de l’onglet navigateur et dans les métadonnées HTML principales (`title`, `application-name`, `og:site_name`, `og:title`). La description exposée dans les métadonnées (`description`, `og:description`) est pilotée par `VITE_APP_DESCRIPTION`. Ces valeurs sont injectées dans `index.html` au build et réappliquées au runtime. Sans valeur explicite, les fallbacks restent génériques et réutilisables hors CH Montfavet.

```env
VITE_APP_NAME="Questionnaires institutionnels"
VITE_APP_DESCRIPTION="Plateforme de questionnaires, invitations, passation sécurisée et statistiques pseudonymisées."
```

## Textes et i18n éditables

Les libellés mutualisés du front sont dans `public/content/i18n/*.json`. Le sélecteur global de langue est visible dans la barre supérieure pour tous les profils, y compris avant connexion et sur GitHub Pages.

Pour ajouter une langue sans modifier le code Vue/TypeScript :

1. copier `public/content/i18n/fr.json` vers `public/content/i18n/<code>.json`, par exemple `de.json` ;
2. traduire uniquement les valeurs ;
3. lancer la validation.

Validation et manifeste dynamique :

```sh
npm run content:i18n:check
npm run content:i18n:manifest
```

Le build et le serveur de dev régénèrent automatiquement `public/content/i18n/locales.json`. C’est ce manifeste qui rend les langues visibles dans l’interface ; personne n’a besoin d’ajouter le code langue dans les composants.

La procédure d’édition est documentée dans `docs/content/i18n-editing.md`.

## Build

```sh
npm run build
npm run build:backend
```

## Endpoints API livrés

- `POST /api/auth/login` : connexion et pose du cookie HTTP-only.
- `GET /api/auth/me` : profil connecté et permissions.
- `POST /api/auth/logout` : suppression de session.
- `GET /api/buildings` : liste des bâtiments, filtrée pour les modérateurs.
- `GET /api/questionnaires` : questionnaires, groupes et questions ; les non-admins ne voient que les questionnaires
  publiés.
- Front attendu pour l’administration opérationnelle : `POST /api/admin/sites` crée un site projet, `POST /api/site/buildings` crée un bâtiment dans le site du responsable connecté, et `POST /api/questionnaires/:id/translations` crée un brouillon de traduction d’un questionnaire. Ces trois flux sont disponibles en mode démo front via `VITE_DEMO_MODE=true`.

## Critères d’acceptation couverts

- un utilisateur non authentifié est redirigé vers `/login` ;
- un modérateur ne voit pas les fonctions admin dans le menu ni dans l’accueil ;
- un modérateur reçoit un `403` côté API s’il tente une route admin ;
- les bâtiments et questionnaires affichés viennent de PostgreSQL ;
- les erreurs API sont affichées côté front via des alertes et le store de session/catalogue.


## Flux front d’administration métier

- Admin projet : page `/administration-projet`, bloc “Créer un site”, puis bloc “Créer un responsable de site”. L’admin projet ne crée pas directement les bâtiments ni les modérateurs.
- Responsable de site : page `/moderation`, section “Équipe du site”, bloc “Ajouter un bâtiment”, puis bloc “Ajouter un modérateur”. Les bâtiments créés sont immédiatement disponibles pour les modérateurs, invitations et terminaux du site.
- Constructeur questionnaire : page `/admin`, bloc “Langues et traductions”. Le sélecteur “Langue” ne traduit pas le contenu ; l’action “Créer le brouillon de langue” duplique la structure du questionnaire dans une nouvelle version de langue à traduire.

## Build GitHub Pages statique

Le workflow `.github/workflows/deploy.yml` active `VITE_STATIC_PAGES_DEMO=true`. Dans ce mode, le routeur ne publie que deux écrans publics :

- `/moderation` : point de vue modérateur figé, avec invitation simulée et suivi statique ;
- `/questionnaire` : ITQ patient autonome, sans jeton serveur, sans authentification et sans appel API.

Le questionnaire statique publié est l’International Trauma Questionnaire (ITQ), version `1.0-cn2r`, avec les 2 questions de contexte et les 18 items cotés en pages séparées. Les autres modules applicatifs restent présents dans le code pour le build connecté, mais ils sont exclus du routeur GitHub Pages. Le mode statique utilise aussi `VITE_ROUTER_MODE=hash` pour éviter les erreurs 404 au rechargement d’une URL Pages.

## Préproduction containerisée

Les passes production ajoutent une stack reproductible :

```sh
cp .env.preprod.example .env.preprod
# renseigner secrets, TLS_CERT_DIR, URLs DB et provider email
npm run preprod:up
curl -k https://<host>/healthz
```

Fichiers clés :

- `backend/Dockerfile` : image API NestJS avec healthcheck ;
- `Dockerfile.frontend` : build statique Vue servi par Nginx ;
- `docker-compose.preprod.yml` : Postgres, migrator Prisma, backend, frontend, reverse proxy TLS ;
- `ops/nginx/reverse-proxy.conf` : terminaison TLS, HSTS, logs JSON ;
- `docs/production/` et `docs/recette/` : procédures et matrices go/no-go.

Le go production réel reste conditionné à la validation DPO, au test de restauration, à la recette sécurité/accessibilité et à l'authentification interne définitive.
