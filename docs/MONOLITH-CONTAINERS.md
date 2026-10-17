# Monolith containers

The stack contains PostgreSQL 17, a one-shot schema migration, the private TypeScript domain API and the public Go gateway. The gateway serves the built web client and forwards domain requests to the private API. Native clients connect to that same public HTTPS origin. No hosted addon registry is required.

## New installations

Copy `env/.env.docker.example` to the ignored `env/.env.docker`. Set independent random hex values for `MONOLITH_DB_ADMIN_PASSWORD`, `MONOLITH_DB_APP_PASSWORD`, `MASTER_KEY`, `JWT_SIGNING_KEY` and `BOOTSTRAP_TOKEN`. Set `PUBLIC_URL` to your HTTPS origin. Keep the bootstrap token private; it is used to create the first account.

```sh
pnpm native docker compose --env-file env/.env.docker config --quiet
pnpm native docker compose --env-file env/.env.docker build migrate
pnpm native docker compose --env-file env/.env.docker up -d
pnpm native docker compose --env-file env/.env.docker ps
```

The gateway binds to `127.0.0.1:8080` by default. Place your HTTPS ingress in front of it. `MONOLITH_HTTP_PORT` changes that host port. PostgreSQL and the private API have no host ports.

The default database and roles are `monolith`, `monolith_admin` and `monolith_app`. Only the migration service receives administrator credentials. The application role is neither a superuser nor a BYPASSRLS role. Initialization uses quoted psql variables for role names and passwords.

## Existing installations

Branding does not rename an existing database, role or volume. Before switching Compose projects, back up the database and file volume, stop the previous stack, and configure these explicit mappings in `env/.env.docker` for a stack created by the earlier configuration:

```dotenv
MONOLITH_DB_NAME=zillionos
MONOLITH_DB_ADMIN_USER=zillion_admin
MONOLITH_DB_APP_USER=zillion_app
MONOLITH_DATABASE_VOLUME=zillionos_zillion_database
MONOLITH_FILES_VOLUME=zillionos_zillion_files
```

Verify the actual previous volume names with `pnpm native docker volume ls`; custom Compose project names use different prefixes. Copy the existing password values from the old `ZILLION_DB_*` variables into the corresponding `MONOLITH_DB_*` variables. Retain `MASTER_KEY` and `JWT_SIGNING_KEY`. Do not run two PostgreSQL containers against the same volume. A new volume is an empty installation, not a migration of existing data.

Addon table namespaces and API route IDs are intentionally retained by the compatibility adapter. The schema tool refuses unmapped legacy ownership rather than assigning records to an inferred owner.

## Rebuild and rollback

```sh
pnpm native docker compose --env-file env/.env.docker build migrate
pnpm native docker compose --env-file env/.env.docker up -d --force-recreate migrate server gateway
pnpm native docker compose --env-file env/.env.docker logs --tail=100 migrate server gateway
```

A failed migration prevents API startup. Keep the previous images and matching database backup for rollback. Normal `down` retains volumes; do not add the volume-removal option during an upgrade.

The image uses the pinned pnpm workspace, retains its license notices and runs as the unprivileged Node user. Source/schema tooling remains in the image because trusted addons are loaded from the workspace. This is an incremental core migration: the Go gateway does not yet replace all TypeScript domain routes.

Container execution must be verified on a host with Docker; a successful source build or YAML validation alone does not verify a running deployment.