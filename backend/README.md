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
