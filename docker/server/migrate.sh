#!/bin/sh
set -eu
: "${DATABASE_ADMIN_URL:?Migration service requires administrator database access}"
cd /zillion
pnpm db:push
psql "$DATABASE_ADMIN_URL" --set ON_ERROR_STOP=1 <<'SQL'
GRANT USAGE ON SCHEMA public TO zillion_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO zillion_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO zillion_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO zillion_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO zillion_app;
SQL
