---
title: Installation
description: Build the current source and open your first Monolith workspace.
section: Start here
order: 2
---

The current checkout is a development build. You can run it from source today. For a shared host behind HTTPS, use the [container setup](/docs/self-hosting).

## What you need

- Node.js **22.23 or later**.
- **pnpm 11.21.0**, matching the repository’s `packageManager` field.
- **PostgreSQL 17** for local development.
- Git to obtain the source.

Set `POSTGRES_BIN` to the PostgreSQL `bin` directory if it is not discovered. Typical locations are `C:\Program Files\PostgreSQL\17\bin` on Windows and `/opt/homebrew/opt/postgresql@17/bin` on macOS.

## Get the source

The repository is currently private while the release is being prepared. Cloning it and opening source links requires GitHub access to the repository.

Use a checkout containing the current Monolith changes. The published default branch may lag behind this development documentation; see [release availability](/docs/availability) before expecting the latest addons, updater or agent tools in a fresh clone.

```sh
git clone https://github.com/MaxJafar/monolith.git
cd monolith
pnpm install --frozen-lockfile
```

The repository uses pnpm workspaces. Run these commands from the repository root.

## Start a local workspace

```sh
pnpm build
pnpm local:setup
pnpm db:push
pnpm dev
```

Open **http://localhost:5173**. A new database uses onboarding to create the first account. The development API uses port **3636**, and the isolated local PostgreSQL service uses **55432**.

`local:setup` creates ignored configuration with random secrets and separate database roles for application access and schema management. Keep that configuration local. The normal application connection must use a non-superuser role without `BYPASSRLS`.

## Stop and return later

Stop the development process in its terminal. To stop the checkout’s development database while preserving its files:

```sh
pnpm local:stop
```

Run `pnpm local:setup` and `pnpm dev` when you return. Apply schema changes deliberately when updating your checkout; back up any data you want to keep first.

## Next steps

Create a page, explore the [native sections](/docs/workspace) and arrange your [dashboard](/docs/widgets). To use desktop clients or an agent bridge against a shared host, configure the public gateway with the [self-hosting guide](/docs/self-hosting).

If a command fails, start with [troubleshooting](/docs/troubleshooting). Package build output and a running server are separate checks; do not assume a completed build means the database and host are configured.
