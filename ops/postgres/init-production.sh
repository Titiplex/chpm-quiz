#!/bin/sh
set -eu

: "${POSTGRES_MIGRATOR_PASSWORD:?POSTGRES_MIGRATOR_PASSWORD is required}"
: "${POSTGRES_OPERATIONAL_PASSWORD:?POSTGRES_OPERATIONAL_PASSWORD is required}"
: "${POSTGRES_IDENTITY_PASSWORD:?POSTGRES_IDENTITY_PASSWORD is required}"
: "${POSTGRES_DPO_PASSWORD:?POSTGRES_DPO_PASSWORD is required}"

psql --set=ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=migrator_password="$POSTGRES_MIGRATOR_PASSWORD" \
  --set=operational_password="$POSTGRES_OPERATIONAL_PASSWORD" \
  --set=identity_password="$POSTGRES_IDENTITY_PASSWORD" \
  --set=dpo_password="$POSTGRES_DPO_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE chpm_migrator LOGIN PASSWORD %L', :'migrator_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chpm_migrator') \gexec
SELECT format('CREATE ROLE chpm_operational LOGIN PASSWORD %L', :'operational_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chpm_operational') \gexec
SELECT format('CREATE ROLE chpm_identity LOGIN PASSWORD %L', :'identity_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chpm_identity') \gexec
SELECT format('CREATE ROLE chpm_dpo LOGIN PASSWORD %L', :'dpo_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chpm_dpo') \gexec

SELECT format('ALTER ROLE chpm_migrator PASSWORD %L', :'migrator_password') \gexec
SELECT format('ALTER ROLE chpm_operational PASSWORD %L', :'operational_password') \gexec
SELECT format('ALTER ROLE chpm_identity PASSWORD %L', :'identity_password') \gexec
SELECT format('ALTER ROLE chpm_dpo PASSWORD %L', :'dpo_password') \gexec

ALTER SCHEMA public OWNER TO chpm_migrator;
CREATE SCHEMA IF NOT EXISTS identity AUTHORIZATION chpm_migrator;
ALTER SCHEMA identity OWNER TO chpm_migrator;

REVOKE ALL ON SCHEMA public, identity FROM PUBLIC;
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', current_database()) \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO chpm_migrator, chpm_operational, chpm_identity, chpm_dpo', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO chpm_operational;
GRANT USAGE ON SCHEMA identity TO chpm_identity;
GRANT USAGE ON SCHEMA public, identity TO chpm_dpo;

ALTER DEFAULT PRIVILEGES FOR ROLE chpm_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO chpm_operational;
ALTER DEFAULT PRIVILEGES FOR ROLE chpm_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO chpm_operational;
ALTER DEFAULT PRIVILEGES FOR ROLE chpm_migrator IN SCHEMA identity
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO chpm_identity;
ALTER DEFAULT PRIVILEGES FOR ROLE chpm_migrator IN SCHEMA identity
  GRANT USAGE, SELECT ON SEQUENCES TO chpm_identity;
SQL
