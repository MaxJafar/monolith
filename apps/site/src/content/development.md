---
title: Development and releases
description: Find the source, build the maintained clients and prepare versioned artifacts.
section: Host & build
order: 32
---

Monolith uses a pnpm workspace for the browser, API, native shells, shared packages and optional tools. Start with [installation](/docs/installation) for a local workspace.

Read [Architecture](/docs/architecture) for request flow, document persistence and the boundaries between native features, addons and widgets. The public repository contains the maintained application source. Check [release availability](/docs/availability) for the current distribution status.

## Repository map

| Path                 | Responsibility                                                |
| -------------------- | ------------------------------------------------------------- |
| `apps/web`           | Shared browser workspace.                                     |
| `apps/api`           | Domain API, authentication and addon lifecycle.               |
| `apps/gateway`       | Go host, canonical documents and device sessions.             |
| `apps/desktop`       | Windows Tauri/WebView2 shell.                                 |
| `apps/desktop-macos` | macOS AppKit/WKWebView shell.                                 |
| `apps/site`          | This static product and documentation website.                |
| `packages`           | Shared UI, contracts, editor blocks, runtime and agent tools. |
| `modules`            | Core storage modules and optional packages.                   |
| `locales`            | Maintained language packs.                                    |
| `tools`              | Development, migration, packaging and verification commands.  |
| `docs`               | Detailed engineering, deployment and verification guides.     |

## Check a build

Use Node 22.23+ and the pinned pnpm version. Run checks appropriate to the change:

```sh
pnpm core:check
pnpm typecheck
pnpm build
pnpm gateway:test
pnpm agent:test
pnpm desktop:bundle
```

Windows native builds and tests require a Windows build host. macOS application signing, testing and packaging require a Mac. Source compilation alone does not verify installed native updates.

## Build this website

```sh
pnpm site:dev
pnpm site:build
pnpm site:check
```

The site is static Astro output. Product metadata lives in `apps/site/src/data`, and public guides live in `apps/site/src/content`. Brand assets and licensed fonts are served locally.

Vercel can build the site using `apps/site` as its root directory with access to the workspace lockfile. See `apps/site/README.md` for the isolated deployment and verification commands. The website needs no database or workspace credentials.

## Prepare a platform release

Align release versions deliberately, run supported-platform checks and review migrations against a backup:

```sh
pnpm release:version 1.0.0
pnpm updater:test
```

The example version is illustrative; choose your release version. The platform release workflow runs for version tags and publishes only after the required artifacts and signed manifest are uploaded successfully. A failed upload leaves a draft release.

Review `docs/RELEASING.md` and `docs/UPDATES.md` in the checkout for exact platform build commands, secrets, schema gates and installer verification. Do not tag a release until the corresponding reviewed commit is ready.

## Build an addon release

```sh
pnpm release:addons
```

Each optional package is independently versioned. Publish a complete signed catalog for the collection your host should offer, and test installed packages with the target host. Read [addon installation](/docs/addons) for runtime packages versus source tarballs.
