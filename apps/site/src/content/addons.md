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

No public catalog is configured by default. A disabled update action or missing download may mean the administrator has not configured a signed catalog. Compatibility follows the package’s declared host requirements; database-changing packages need their approved host migration first.

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
