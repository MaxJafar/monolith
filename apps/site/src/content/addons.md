---
title: Install addons and widgets
description: Choose packages, enable tools per workspace and manage versions.
section: Extend Monolith
order: 20
---

**Addons and Widgets** is Monolith’s in-app collection and download shop. The [public collection](/addons) is a guide to the available tools; your running host is where installation happens.

## Installation and enablement

Installing a package makes its code available on the host. Enabling it chooses which workspaces use it. These are separate actions with separate permissions.

1. Open Addons and Widgets in your Monolith installation.
2. Search or combine type, category and state filters to find a package.
3. Review its details and compatibility. A host administrator can download available releases from the configured catalog.
4. After installation, a workspace owner can enable the addon for that workspace.
5. For a widget package, use **Preview & configure**, then add or pin the widget.

## The addon collection

| Addon                              | Purpose                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| [Atlas](/addons/atlas)             | Visual maps, backlinks and discovery across workspace knowledge. |
| [Automations](/addons/automations) | Visual workflows, branching, HTTP steps and run history.         |
| [Agents](/addons/agents)           | Agent profiles, assignments, execution review and usage.         |
| [Redraw](/addons/redraw)           | Designs, whiteboards and connected visual ideas.                 |
| [Journal](/addons/journal)         | Dated entries connected to Docs and writing activity.            |
| [Wallet](/addons/wallet)           | Accounts, balances, transactions and balance widgets.            |
| [Wishlist](/addons/wishlist)       | Personal collections of things you want to return to.            |
| [Gym](/addons/gym)                 | Training plans, workout sessions and exercise history.           |
| [Tech Lab](/addons/tech-lab)       | Devices, hosted services and observed health.                    |

Achievements, Code Time, Flashcards, Pomodoro and Idea Box are [widget packages](/docs/widgets). The optional uRPG experience is currently included in the main client and does not have an independent downloadable package.

## Downloading and updating

Hosts can use a signed GitHub Releases catalog. The shop reports download progress, checks integrity and compatibility, then activates a verified package. The previous package is retained for recovery.

The [0.1.0-preview.1 release](https://github.com/MaxJafar/monolith/releases/tag/v0.1.0-preview.1) contains 14 addon and widget packages. A host administrator connects the signed catalog once; users then browse and download packages inside Monolith. Use the catalog matching your host version.

## Connect the preview catalog

For a **0.1.0-preview.1** host, set these values in its private environment configuration. In the server setup kit this is `env/.env.docker`. Replace the administrator placeholder with the UUID of the account authorized to install code.

```dotenv
MONOLITH_CORE_ONLY=1
MONOLITH_ADDON_CATALOG_URL=https://github.com/MaxJafar/monolith/releases/download/v0.1.0-preview.1/addon-catalog.signed.json
MONOLITH_ADDON_CATALOG_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAM6pM3OFz+fZRtGw2o+C9T7uWYuAg4pZsYjVvn64HZCM=\n-----END PUBLIC KEY-----'
MONOLITH_ADDON_ADMIN_IDS=YOUR_ACCOUNT_UUID
```

The key is also distributed as [addon-catalog-public.pem](https://github.com/MaxJafar/monolith/releases/download/v0.1.0-preview.1/addon-catalog-public.pem). Keep the backslash-n separators in the single-line environment value. Workspace ownership alone does not grant host installation rights. Existing hosts should keep their current core/addon selection until migration is complete.

For schema-bearing addons, first apply and verify the matching host migration. Then place this release's [addon-schemas.json](https://github.com/MaxJafar/monolith/releases/download/v0.1.0-preview.1/addon-schemas.json) in persistent host storage and set `MONOLITH_ADDON_SCHEMA_FILE` to its absolute path. With the server kit, a file placed in the files volume is available at `/monolith/storage/addon-schemas.json`. Approve the file only after migration succeeds. Atlas needs no additional schema.

Restart the API with the updated environment, open Addons and Widgets, and check for updates. A disabled action can indicate missing administrator permissions, catalog configuration, host compatibility or migration approval. The [release guide](https://github.com/MaxJafar/monolith/blob/main/docs/RELEASING.md) explains host storage and activation in detail.

## Package trust

Addons execute trusted application code and are not sandboxed. Install packages only from publishers you trust. Disabling an addon in a workspace is not the same action as uninstalling its code from the host or deleting its stored data.

## Build a release package

Maintainers can build all optional packages or one selected package:

```sh
pnpm release:addons
pnpm release:addons monolith--atlas
```

Runtime archives use the `.monolith-addon` format. The release builder produces package metadata, checksums and a signed catalog when signing is configured. A source tarball from `pnpm monolith addons pack` is a different format and cannot be installed through the runtime shop.

Each package has its own version. Separate repositories are optional. Review the maintained `docs/RELEASING.md` in your checkout for signing variables, complete catalog publication and schema approval artifacts.
