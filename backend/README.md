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


## Console locale de gestion des comptes internes

Les comptes à responsabilité (admin global, gestionnaire de site, modérateur, DPO, analyste, responsable judiciaire, administrateur technique) se créent côté serveur avec une console interactive locale. Elle n’expose aucune route HTTP, ne crée pas de comptes répondants et journalise les créations, mises à jour, désactivations et resets de mot de passe dans `audit_logs`.

Démarrer depuis `backend` :

```powershell
npm run user:console
```

La console ouvre un prompt :

```text
chpm-users>>
```

Commandes disponibles :

```text
create          créer ou mettre à jour un compte interne
disable         désactiver un compte et révoquer ses sessions
reset-password  réinitialiser le mot de passe et révoquer ses sessions
list            lister les comptes internes sans afficher de secret
help            afficher l’aide
exit            quitter
```

Sécurité appliquée par la console :

- exécution uniquement dans un terminal interactif local ;
- blocage par défaut en `NODE_ENV=production` / `APP_ENV=production` ;
- confirmation textuelle supplémentaire si la base PostgreSQL ne pointe pas vers `localhost` ;
- rôles humains explicitement autorisés, sans `respondent` ni `service_account` ;
- périmètre obligatoire pour les rôles locaux : bâtiment pour `moderator`, site pour `site_manager` ;
- mot de passe saisi masqué ou généré automatiquement ;
- politique minimale : 12 caractères, majuscule, minuscule, chiffre et caractère spécial ;
- hash bcrypt avec 12 rounds minimum ;
- révocation des sessions après création/mise à jour, reset ou désactivation ;
- impossibilité de désactiver le dernier administrateur global actif ;
- confirmation textuelle avant toute mutation ;
- audit systématique avec source `local-user-console`.

Exemple d’utilisation :

```text
chpm-users>> create
Email : admin.site@chpm.local
Nom affiché : Admin Site
Rôle : 2
Site : 1
Générer un mot de passe temporaire fort automatiquement ? [O/n]
Tapez "CREER" pour appliquer : CREER
```

Le mot de passe généré est affiché une seule fois et doit être transmis par un canal sûr.

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
