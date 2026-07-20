# Backup and restoration procedure

Define organization-approved recovery point (RPO), recovery time (RTO), retention, storage location, key custody, and access roles before production. The repository scripts provide a baseline, not a managed backup service.

## Create an encrypted backup

From the repository root in the configured preproduction/production maintenance environment:

```powershell
npm run backup:encrypted
```

The job exports the `public` and `identity` schemas separately, writes a manifest, archives the set, and encrypts it with OpenSSL AES-256-CBC using PBKDF2. `BACKUP_ENCRYPTION_PASSPHRASE` must be injected from an approved secret manager and must not appear in command history or logs.

Each backup produces:

- `chpm-backup-<timestamp>.tar.enc`
- `chpm-backup-<timestamp>.tar.enc.sha256`

Store encrypted archive, checksum, manifest metadata, job logs, and key reference according to policy. Keep decryption material separate from backup storage.

## Verify the artifact

On a trusted host with the backup and checksum:

```powershell
Get-FileHash .\chpm-backup-<timestamp>.tar.enc -Algorithm SHA256
Get-Content .\chpm-backup-<timestamp>.tar.enc.sha256
```

Compare values exactly. A matching checksum verifies transfer integrity, not decryptability or restorability.

## Test restoration

Never test against production or any database name/host that could be confused with production. Create isolated disposable operational and identity targets with restricted networking.

In a POSIX maintenance shell (the supplied script is Bash):

```sh
BACKUP_ENCRYPTION_PASSPHRASE='from-approved-secret-injection' \
RESTORE_TEST_OPERATIONAL_DATABASE_URL='postgresql://.../restore_test?schema=public' \
RESTORE_TEST_IDENTITY_DATABASE_URL='postgresql://.../restore_test?schema=identity' \
ops/scripts/restore_test.sh backups/chpm-backup-<timestamp>.tar.enc
```

Success criteria:

1. Checksum verification and decryption succeed.
2. Archive/manifest are readable and match the expected environment/time/schema versions.
3. `pg_restore --list` succeeds for both dumps.
4. Both schemas restore into the isolated targets without unexpected errors.
5. Migration/version checks and representative integrity counts pass.
6. The API can start against restored data and readiness passes.
7. Operational and identity database privileges remain separated.
8. Test data, plaintext artifacts, temporary secrets, and restore infrastructure are securely removed after evidence is approved.

## Schedule and evidence

- Run backups at least daily, or more frequently when the approved RPO requires it.
- Monitor every job and alert on missing, late, unusually small/large, or failed artifacts.
- Perform a full restoration test at least monthly, before go-live, after sensitive schema/backup changes, and after a provider/storage migration.
- Retain dated evidence: artifact ID, checksum, key reference, tester, timings, restored versions, validation results, defects, cleanup, and approval.

An untested backup is not a recovery control.
