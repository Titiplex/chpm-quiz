# Procédure sauvegarde et restauration

## Sauvegarde chiffrée

```sh
npm run backup:encrypted
```

Le job sauvegarde séparément les schémas `public` et `identity`, crée un manifeste, archive le tout puis chiffre avec OpenSSL AES-256-CBC + PBKDF2. La passphrase doit venir du vault via `BACKUP_ENCRYPTION_PASSPHRASE`.

## Vérification de sauvegarde

Chaque sauvegarde produit :

- `chpm-backup-<timestamp>.tar.enc` ;
- `chpm-backup-<timestamp>.tar.enc.sha256`.

Contrôler l'empreinte :

```sh
sha256sum -c chpm-backup-<timestamp>.tar.enc.sha256
```

## Test de restauration

Ne jamais tester une restauration sur la base de production.

```sh
BACKUP_ENCRYPTION_PASSPHRASE=... \
RESTORE_TEST_OPERATIONAL_DATABASE_URL=postgresql://.../restore_test?schema=public \
RESTORE_TEST_IDENTITY_DATABASE_URL=postgresql://.../restore_test?schema=identity \
ops/scripts/restore_test.sh backups/chpm-backup-<timestamp>.tar.enc
```

Critères de réussite : extraction OK, `pg_restore --list` OK, restauration des deux schémas OK, manifeste lisible, séparation public/identity conservée.

## Rythme recommandé

- Sauvegarde quotidienne minimum.
- Test de restauration mensuel.
- Test de restauration obligatoire avant go-live et après modification de schéma sensible.
