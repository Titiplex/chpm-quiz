#!/bin/sh
set -eu

backup_file="${1:-}"
if [ -z "$backup_file" ]; then
  echo "Usage: BACKUP_ENCRYPTION_PASSPHRASE=... RESTORE_TEST_OPERATIONAL_DATABASE_URL=... RESTORE_TEST_IDENTITY_DATABASE_URL=... $0 backup.tar.enc" >&2
  exit 2
fi

: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE is required}"
: "${RESTORE_TEST_OPERATIONAL_DATABASE_URL:?RESTORE_TEST_OPERATIONAL_DATABASE_URL is required}"
: "${RESTORE_TEST_IDENTITY_DATABASE_URL:?RESTORE_TEST_IDENTITY_DATABASE_URL is required}"

case "$RESTORE_TEST_OPERATIONAL_DATABASE_URL $RESTORE_TEST_IDENTITY_DATABASE_URL" in
  *prod*|*production*)
    echo "Refus: les URL de test de restauration ne doivent pas viser une base production." >&2
    exit 1
    ;;
esac

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 \
  -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
  -in "$backup_file" \
  -out "$workdir/backup.tar"

tar -C "$workdir" -xf "$workdir/backup.tar"
pg_restore --list "$workdir/operational.dump" >/dev/null
pg_restore --list "$workdir/identity.dump" >/dev/null
pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_TEST_OPERATIONAL_DATABASE_URL" "$workdir/operational.dump"
pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_TEST_IDENTITY_DATABASE_URL" "$workdir/identity.dump"

echo "Restore test completed successfully. Manifest:"
cat "$workdir/manifest.json"
