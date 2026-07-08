# Backend

API centrale NestJS TypeScript pour la semaine 2.

## Stack

- NestJS ;
- Prisma ;
- PostgreSQL ;
- sessions persistées en base ;
- cookie HTTP-only ;
- guards `SessionAuthGuard` et `RolesGuard`.

### Prérequis Node.js

Le backend cible Node `22.18.x` et npm `10.9.x`. Si PowerShell répond que `nvm` est introuvable, c’est normal : `nvm` n’est pas livré avec Node.js. Installer soit Node.js `22.18.0` directement, soit un gestionnaire de versions Windows comme `nvm-windows` ou Volta, puis rouvrir PowerShell.

```sh
node -v
npm -v
```

## Démarrage

```sh
npm install
cp .env.example .env
docker compose up -d
npm run prisma:migrate
npm run db:seed
npm run dev
```

Sous PowerShell, remplacer `cp .env.example .env` par :

```powershell
Copy-Item .env.example .env
```

La configuration `.env.example` locale utilise les mêmes identifiants que `docker-compose.yml` : `chpm` / `chpm` sur `localhost:5432`, base `chpm_quiz`. `OPERATIONAL_DATABASE_URL` pointe vers le schéma `public`; `IDENTITY_DATABASE_URL` pointe vers le schéma `identity`.

Si une ancienne base Docker a déjà été initialisée avec d’autres identifiants, réinitialiser le volume local :

```powershell
docker compose down -v
docker compose up -d
npm run prisma:migrate
npm run db:seed
npm run dev
```

`docker compose down -v` supprime les données PostgreSQL locales.

L’API écoute par défaut sur `http://localhost:3000/api`.



## Hiérarchie des rôles et gestion des comptes

Le modèle opérationnel est hiérarchique et cloisonné :

```text
console locale sécurisée
  -> crée les administrateurs projet / chercheurs et les DPO
administrateur projet / chercheur (`admin` technique)
  -> gère les responsables de site via `/api/admin/site-admins`
responsable de site (`site_manager`)
  -> gère les modérateurs de son site via `/api/site/moderators`
modérateur (`moderator`)
  -> crée, relance et suit les invitations dans son périmètre
DPO (`dpo`)
  -> accède exceptionnellement au code-email hors API métier via console dédiée
```

La valeur technique `admin` est conservée en base pour compatibilité Prisma, mais elle signifie **administrateur projet / chercheur / responsable central**. Elle ne donne aucun droit sur les emails répondants, la table identité ou l'identity vault.

## Console locale de gestion des comptes sensibles

La console `npm run user:console` sert uniquement au bootstrap et aux opérations sensibles hors navigateur. Elle permet :

- créer un administrateur projet / chercheur (`admin`) ;
- créer un DPO (`dpo`) ;
- créer un administrateur technique (`technical_admin`) si nécessaire ;
- réinitialiser le mot de passe d'un compte sensible ;
- désactiver un compte sensible ;
- révoquer ses sessions ;
- journaliser chaque action dans `audit_logs`.

Elle ne sert plus à gérer quotidiennement les responsables de site ou les modérateurs. Ces opérations passent par le frontend et par les endpoints RBAC/ABAC dédiés.

Démarrer depuis `backend` :

```powershell
npm run user:console
```

La console ouvre un prompt :

```text
chpm-sensitive-users>>
```

Commandes disponibles :

```text
create          créer un compte sensible autorisé
reset-password  réinitialiser le mot de passe et révoquer les sessions
disable         désactiver le compte et révoquer les sessions
revoke-sessions révoquer les sessions sans changer le compte
list            lister les comptes sensibles sans secret
help            afficher l'aide
exit            quitter
```

Sécurité appliquée : terminal interactif local, blocage prudent en production, confirmation si la base n'est pas locale, mot de passe fort ou généré, hash bcrypt, révocation de sessions, protection contre la désactivation du dernier admin projet actif et audit source `local-sensitive-user-console`.

## Gestion frontend/API des responsables de site

Un administrateur projet / chercheur peut gérer les responsables de site depuis le frontend “Administration projet” ou via :

- `GET /api/admin/sites` ;
- `GET /api/admin/site-admins` ;
- `POST /api/admin/site-admins` ;
- `PATCH /api/admin/site-admins/:id` ;
- `POST /api/admin/site-admins/:id/reset-password` ;
- `POST /api/admin/site-admins/:id/revoke-sessions`.

Ces routes sont réservées à `admin`. Elles ne permettent pas de créer un autre admin projet, un DPO, un administrateur technique ou un responsable judiciaire. Toute création, désactivation, changement de site, reset ou révocation est auditée ; les sessions sont révoquées après mutation sensible.

## Gestion frontend/API des modérateurs de site

Un responsable de site peut gérer les modérateurs de son propre site uniquement :

- `GET /api/site/team` ;
- `POST /api/site/moderators` ;
- `PATCH /api/site/moderators/:id` ;
- `POST /api/site/moderators/:id/reset-password` ;
- `POST /api/site/moderators/:id/revoke-sessions`.

Les garde-fous backend sont : RBAC explicite, ABAC par site/bâtiment, refus des bâtiments hors site, impossibilité de créer ou modifier un rôle supérieur/spécialisé, mot de passe temporaire affiché une seule fois, révocation des sessions et audit `user.siteModerator.*`.

## Console DPO dédiée

L'accès exceptionnel code-email ne passe plus par la SPA Vue ni par l'API métier principale. Il passe par :

```powershell
npm run dpo:console
# ou
npm run identity-vault:console
```

Fonctions minimales : login nominatif DPO, justification obligatoire, référence de procédure, liste explicite de codes publics, interdiction de recherche libre par email, export minimal code-email, chiffrement fichier, empreinte SHA-256 et double audit opérationnel + identity vault. Un administrateur projet / chercheur ne peut pas exécuter cette console avec succès.

## Comptes seedés

- `admin@chpm.local` / `Admin123!`
- `moderateur@chpm.local` / `Moderator123!`
- `repondant@chpm.local` / `Respondent123!`

## Sécurité

- mot de passe hashé avec bcrypt ;
- session opaque stockée en base sous forme de hash SHA-256 ;
- cookie HTTP-only non lisible par JavaScript ;
- durée de session configurable par `SESSION_TTL_HOURS` ;
- CORS limité à `FRONTEND_ORIGIN` ;
- validation DTO avec `class-validator` ;
- RBAC appliqué côté serveur.
