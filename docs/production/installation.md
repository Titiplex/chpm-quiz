# Guide d'installation préproduction

## Objectif

Recréer un environnement préproduction à partir du dépôt, des variables d'environnement, des migrations Prisma et des certificats TLS.

## Prérequis

- Docker Engine et Docker Compose v2.
- Un nom DNS pointant vers le reverse proxy.
- Un certificat TLS valide dans `TLS_CERT_DIR` avec `fullchain.pem` et `privkey.pem`.
- Secrets injectés depuis un vault ou un gestionnaire de secrets : mots de passe PostgreSQL, clés AES 32 octets base64, pepper HMAC, clés provider email, passphrase de sauvegarde.

## Installation

```sh
cp .env.preprod.example .env.preprod
# éditer toutes les valeurs replace-with-*
openssl rand -base64 32 # EMAIL_ENCRYPTION_KEY_B64
openssl rand -base64 32 # JUDICIAL_EXPORT_KEY_B64
openssl rand -base64 48 # RESPONDENT_TOKEN_SECRET / EMAIL_HASH_PEPPER
npm run preprod:up
```

Le compose exécute d'abord `migrator`, puis démarre l'API, le front statique Nginx et le reverse proxy TLS. Les migrations sont exécutées par `prisma migrate deploy`, pas par `migrate dev`.

## Vérifications immédiates

```sh
curl -k https://<host>/healthz
curl -k https://<host>/api/health/ready
npm run preprod:logs
```

La préproduction n'est considérée recréée que si :

1. `reverse-proxy`, `frontend`, `backend` et `postgres` sont healthy.
2. `/api/health/ready` répond `status: ok`.
3. Les logs backend sont au format JSON et incluent `correlationId`.
4. Le cookie de session est `HttpOnly`, `Secure`, `SameSite=strict` ou mieux selon la politique.
5. Aucun secret n'est présent dans le bundle front : seules les variables `VITE_*` publiques sont utilisées.

## Rotation des secrets

- `RESPONDENT_TOKEN_SECRET` : rotation planifiée avec invalidation des anciennes invitations non soumises, ou fenêtre de double validation si un mécanisme multi-secret est ajouté.
- `EMAIL_ENCRYPTION_KEY_B64` : rotation par ré-encryption contrôlée du coffre identité ; ne pas remplacer brutalement sans migration.
- `EMAIL_HASH_PEPPER` : rotation avec recalcul des hash email si l'ancien pepper est encore disponible.
- `JUDICIAL_EXPORT_KEY_B64` : rotation sans impact sur les données, mais vérifier la déchiffrabilité des exports actifs avant purge.
