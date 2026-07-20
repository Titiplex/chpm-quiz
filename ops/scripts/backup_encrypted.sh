#!/bin/sh
set -eu

: "${OPERATIONAL_DATABASE_URL:?OPERATIONAL_DATABASE_URL is required}"
: "${IDENTITY_DATABASE_URL:?IDENTITY_DATABASE_URL is required}"
: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE is required}"

output_dir="${BACKUP_OUTPUT_DIR:-/backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
workdir="$(mktemp -d)"
mkdir -p "$output_dir"
trap 'rm -rf "$workdir"' EXIT

operational_url="${OPERATIONAL_DATABASE_URL%%\?*}"
identity_url="${IDENTITY_DATABASE_URL%%\?*}"

pg_dump --format=custom --no-owner --schema=public --file="$workdir/operational.dump" "$operational_url"
pg_dump --format=custom --no-owner --schema=identity --file="$workdir/identity.dump" "$identity_url"

cat > "$workdir/manifest.json" <<MANIFEST
{"createdAt":"$timestamp","format":"pg_dump custom","schemas":["public","identity"],"separationPreserved":true,"encryption":"aes-256-cbc-pbkdf2-600000"}
MANIFEST

tar -C "$workdir" -cf "$workdir/chpm-backup-$timestamp.tar" manifest.json operational.dump identity.dump
openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt \
  -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
  -in "$workdir/chpm-backup-$timestamp.tar" \
  -out "$output_dir/chpm-backup-$timestamp.tar.enc"
sha256sum "$output_dir/chpm-backup-$timestamp.tar.enc" > "$output_dir/chpm-backup-$timestamp.tar.enc.sha256"

echo "Encrypted backup written to $output_dir/chpm-backup-$timestamp.tar.enc"
