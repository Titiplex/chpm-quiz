#!/bin/sh
set -eu

env_file="${1:-.env.production}"

if [ ! -r "$env_file" ]; then
  echo "Production configuration is not readable: $env_file" >&2
  exit 1
fi

read_value() {
  key="$1"
  sed -n "s/^${key}=//p" "$env_file" | tail -n 1 | sed 's/^"//; s/"$//'
}

require_value() {
  key="$1"
  value="$(read_value "$key")"
  if [ -z "$value" ]; then
    echo "Missing required production setting: $key" >&2
    exit 1
  fi
}

for key in \
  CHPM_RELEASE_VERSION CHPM_HOSTNAME FRONTEND_ORIGIN TLS_CERT_DIR BACKUP_OUTPUT_DIR \
  POSTGRES_IMAGE NGINX_IMAGE NODE_IMAGE POSTGRES_DB POSTGRES_PASSWORD \
  POSTGRES_MIGRATOR_PASSWORD POSTGRES_OPERATIONAL_PASSWORD POSTGRES_IDENTITY_PASSWORD \
  POSTGRES_DPO_PASSWORD MIGRATION_DATABASE_URL OPERATIONAL_DATABASE_URL \
  IDENTITY_DATABASE_URL DPO_DATABASE_URL \
  RESPONDENT_TOKEN_SECRET EMAIL_ENCRYPTION_KEY_B64 EMAIL_HASH_PEPPER \
  JUDICIAL_EXPORT_KEY_B64 METRICS_TOKEN AUTH_PROVIDER EMAIL_PROVIDER \
  EMAIL_FROM BACKUP_ENCRYPTION_PASSPHRASE; do
  require_value "$key"
done

if grep -Eq '^[A-Z0-9_]+=.*(CHANGEME|replace-with-|example\.org)' "$env_file"; then
  echo "Production configuration still contains a placeholder or example.org value." >&2
  exit 1
fi

for key in POSTGRES_IMAGE NGINX_IMAGE NODE_IMAGE; do
  value="$(read_value "$key")"
  if ! printf '%s\n' "$value" | grep -Eq '@sha256:[a-f0-9]{64}$'; then
    echo "$key must use an immutable @sha256 digest." >&2
    exit 1
  fi
done

if [ "$(read_value AUTH_PROVIDER)" != "oidc" ]; then
  echo "Production authentication must use AUTH_PROVIDER=oidc." >&2
  exit 1
fi
for key in AUTH_OIDC_ISSUER AUTH_OIDC_CLIENT_ID AUTH_OIDC_CLIENT_SECRET AUTH_OIDC_REDIRECT_URI; do
  require_value "$key"
done
if [ -z "$(read_value AUTH_OIDC_REQUIRED_ACR)" ] && [ -z "$(read_value AUTH_OIDC_REQUIRED_AMR)" ]; then
  echo "OIDC must require an approved MFA ACR or AMR claim." >&2
  exit 1
fi

case "$(read_value EMAIL_PROVIDER)" in
  simulation|'')
    echo "A connected production email provider is required." >&2
    exit 1
    ;;
esac
case "$(read_value SMS_PROVIDER)" in
  simulation)
    echo "SMS_PROVIDER=simulation is forbidden in production." >&2
    exit 1
    ;;
esac

operational_url="$(read_value OPERATIONAL_DATABASE_URL)"
identity_url="$(read_value IDENTITY_DATABASE_URL)"
dpo_url="$(read_value DPO_DATABASE_URL)"
if [ "$operational_url" = "$identity_url" ] || [ "$operational_url" = "$dpo_url" ] || [ "$identity_url" = "$dpo_url" ]; then
  echo "Operational, identity, and DPO database URLs must be distinct." >&2
  exit 1
fi

database_user() {
  printf '%s\n' "$1" | sed -E 's#^[^:]+://([^:/@]+).*#\1#'
}

operational_user="$(database_user "$operational_url")"
identity_user="$(database_user "$identity_url")"
dpo_user="$(database_user "$dpo_url")"
if [ "$operational_user" = "$identity_user" ] || [ "$operational_user" = "$dpo_user" ] || [ "$identity_user" = "$dpo_user" ]; then
  echo "Operational, identity, and DPO URLs must use distinct database usernames." >&2
  exit 1
fi

echo "Production configuration preflight passed: $env_file"
