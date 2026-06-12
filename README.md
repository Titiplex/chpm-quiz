# Survey App

Prototype Vue 3 + Vite pour une plateforme de questionnaires adaptatifs, anonymisés et
administrables sans compétence informatique.

Prototype Vue 3 + Vite + API NestJS illustrant le cahier des charges pour une plateforme de questionnaires adaptatifs,
anonymisés et administrables sans compétence informatique.

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

## Démo

Comptes seedés :

| Rôle           | Email                   | Mot de passe     | Accès visible                                                |
|----------------|-------------------------|------------------|--------------------------------------------------------------|
| Administrateur | `admin@chpm.local`      | `Admin123!`      | Admin, modération, questionnaire, statistiques, architecture |
| Modérateur     | `moderateur@chpm.local` | `Moderator123!`  | Modération et questionnaire ; bâtiment Montréal A uniquement |
| Répondant      | `repondant@chpm.local`  | `Respondent123!` | Questionnaire uniquement                                     |

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

## Critères d’acceptation couverts

- un utilisateur non authentifié est redirigé vers `/login` ;
- un modérateur ne voit pas les fonctions admin dans le menu ni dans l’accueil ;
- un modérateur reçoit un `403` côté API s’il tente une route admin ;
- les bâtiments et questionnaires affichés viennent de PostgreSQL ;
- les erreurs API sont affichées côté front via des alertes et le store de session/catalogue.
