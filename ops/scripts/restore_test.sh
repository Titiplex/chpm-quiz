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
: "${RESTORE_TEST_CONFIRMATION:?RESTORE_TEST_CONFIRMATION is required}"

if [ "$RESTORE_TEST_CONFIRMATION" != "RESTORE INTO DISPOSABLE DATABASES" ]; then
  echo "Refused: set RESTORE_TEST_CONFIRMATION exactly to RESTORE INTO DISPOSABLE DATABASES." >&2
  exit 1
fi

case "$RESTORE_TEST_OPERATIONAL_DATABASE_URL $RESTORE_TEST_IDENTITY_DATABASE_URL" in
  *prod*|*production*)
    echo "Refus: les URL de test de restauration ne doivent pas viser une base production." >&2
    exit 1
    ;;
esac

operational_url="${RESTORE_TEST_OPERATIONAL_DATABASE_URL%%\?*}"
identity_url="${RESTORE_TEST_IDENTITY_DATABASE_URL%%\?*}"
operational_db="$(psql "$operational_url" -Atc 'SELECT current_database()')"
identity_db="$(psql "$identity_url" -Atc 'SELECT current_database()')"
case "$operational_db" in
  *_restore_test*) ;;
  *)
    echo "Refused: the operational target database name must contain _restore_test." >&2
    exit 1
    ;;
esac
case "$identity_db" in
  *_restore_test*) ;;
  *)
    echo "Refused: the identity target database name must contain _restore_test." >&2
    exit 1
    ;;
esac

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

if [ -f "$backup_file.sha256" ]; then
  (cd "$(dirname "$backup_file")" && sha256sum -c "$(basename "$backup_file").sha256")
else
  echo "Refused: the encrypted backup checksum file is missing." >&2
  exit 1
fi

openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 \
  -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
  -in "$backup_file" \
  -out "$workdir/backup.tar"

tar -C "$workdir" -xf "$workdir/backup.tar"
pg_restore --list "$workdir/operational.dump" >/dev/null
pg_restore --list "$workdir/identity.dump" >/dev/null
pg_restore --clean --if-exists --no-owner --schema=public --dbname="$operational_url" "$workdir/operational.dump"
pg_restore --clean --if-exists --no-owner --schema=identity --dbname="$identity_url" "$workdir/identity.dump"

echo "Restore test completed successfully. Manifest:"
cat "$workdir/manifest.json"
