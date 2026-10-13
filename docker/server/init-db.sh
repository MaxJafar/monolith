#!/bin/sh
set -eu
: "${ZILLION_DB_APP_PASSWORD:?Set the application database password}"
# psql quoted variables preserve password bytes without constructing SQL in shell.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 \
  --set app_password="$ZILLION_DB_APP_PASSWORD" --set database_name="$POSTGRES_DB" <<'SQL'
CREATE ROLE zillion_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD :'app_password';
GRANT CONNECT ON DATABASE :"database_name" TO zillion_app;
SQL
