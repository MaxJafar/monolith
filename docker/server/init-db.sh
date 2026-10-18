#!/bin/sh
set -eu
: "${MONOLITH_DB_APP_PASSWORD:?Set the application database password}"
# psql quoted variables preserve password bytes without constructing SQL in shell.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 \
  --set app_user="${MONOLITH_DB_APP_USER:-monolith_app}" \
  --set app_password="$MONOLITH_DB_APP_PASSWORD" --set database_name="$POSTGRES_DB" <<'SQL'
CREATE ROLE :"app_user" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD :'app_password';
GRANT CONNECT ON DATABASE :"database_name" TO :"app_user";
SQL
