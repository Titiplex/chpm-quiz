# Backend

API centrale NestJS TypeScript pour la semaine 2.

## Stack

- NestJS ;
- Prisma ;
- PostgreSQL ;
- sessions persistées en base ;
- cookie HTTP-only ;
- guards `SessionAuthGuard` et `RolesGuard`.

## Démarrage

```sh
npm install
cp .env.example .env
docker compose up -d
npm run prisma:migrate
npm run db:seed
npm run dev
```

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
