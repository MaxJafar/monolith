---
title: Self-hosting
description: Run a Monolith host and connect your browser and desktop clients.
section: Host & build
order: 30
---

The container stack includes PostgreSQL 17, a one-shot schema migration, the private TypeScript domain API and the public Go gateway. The gateway serves the built browser client and forwards domain requests. Native clients connect to that same public HTTPS origin.

## Prepare a new installation

Obtain the source and install its pinned pnpm dependencies. You need a working Docker host with Compose, sufficient storage for your data and release artifacts, and an HTTPS ingress you control.

Copy `env/.env.docker.example` to the ignored `env/.env.docker`. Configure independent random values for:

- `MONOLITH_DB_ADMIN_PASSWORD`
- `MONOLITH_DB_APP_PASSWORD`
- `MASTER_KEY`
- `JWT_SIGNING_KEY`
- `BOOTSTRAP_TOKEN`

Set `PUBLIC_URL` to your public HTTPS origin. Keep the bootstrap token private; it is used to create the first account. Preserve your keys and configuration in a secure backup.

## Start the stack

Run from the repository root:

```sh
pnpm native docker compose --env-file env/.env.docker config --quiet
pnpm native docker compose --env-file env/.env.docker build migrate
pnpm native docker compose --env-file env/.env.docker up -d
pnpm native docker compose --env-file env/.env.docker ps
```

The gateway binds to **127.0.0.1:8080** by default. Put your HTTPS ingress in front of it. `MONOLITH_HTTP_PORT` changes that host port. PostgreSQL and the private API do not expose host ports in this configuration.

Only the migration service receives the database administrator credentials. The application role is restricted and does not bypass row-level security.

## Verify the installation

Inspect Compose health and logs, open the public URL, complete onboarding and verify that you can create and reopen a page. Test from the actual client devices you plan to connect.

```sh
pnpm native docker compose --env-file env/.env.docker logs --tail=100 migrate server gateway
```

A successful source build or Compose validation is not a substitute for this live verification. Relay services and external integrations need their own configuration.

## Preserve data when upgrading

Back up the database, uploaded files and configuration before changing a stack. Keep the existing database and file volume mappings when moving an installation. Do not run two PostgreSQL containers against the same volume, and do not use volume-removal options during an upgrade.

For older installations, use the explicit migration mappings in `docs/MONOLITH-CONTAINERS.md` from your checkout. Creating a new empty volume is not a migration of existing data.

## Update operations

The [update supervisor](/docs/updates) runs on the Docker host, outside replaceable containers. It manages compatible signed releases, progress and health recovery. Schema-changing releases require a planned migration with a backup.

The public Monolith website on Vercel is a separate static site. The database and workspace backend belong on your configured host.
