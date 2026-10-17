#!/bin/sh
set -eu
: "${DATABASE_ADMIN_URL:?Migration service requires administrator database access}"
cd /monolith
pnpm db:push
psql "$DATABASE_ADMIN_URL" --set ON_ERROR_STOP=1 --set app_user="${MONOLITH_DB_APP_USER:-monolith_app}" <<'SQL'
GRANT USAGE ON SCHEMA public TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
SQL
pnpm exec /monolith/monolith-gateway schema
