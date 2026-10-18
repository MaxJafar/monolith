---
title: Release availability
description: Public downloads, automatic updates and supported installation paths.
section: Start here
order: 8
---

Monolith's current source is public on [GitHub](https://github.com/MaxJafar/monolith). The website and these docs are publicly accessible without a Vercel account. The website contains product information; your workspace runs on your own Monolith host.

## Current release

Version **0.1.8** is available from [GitHub Releases](https://github.com/MaxJafar/monolith/releases/tag/v0.1.8). The complete download set passed its platform builds, package verification and fresh-database server startup checks.

| Download                                                                                                                                  | Platform or purpose                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [Windows installer](https://github.com/MaxJafar/monolith/releases/download/v0.1.8/monolith-0.1.8-windows-amd64.exe)   | Windows x64, Tauri and WebView2.                                           |
| [macOS disk image](https://github.com/MaxJafar/monolith/releases/download/v0.1.8/monolith-0.1.8-darwin-universal.dmg) | Universal application for Apple Silicon and Intel.                         |
| [Linux x64 image](https://github.com/MaxJafar/monolith/releases/download/v0.1.8/monolith-0.1.8-linux-amd64.tar.gz)    | Docker server image for amd64 hosts.                                       |
| [Linux ARM64 image](https://github.com/MaxJafar/monolith/releases/download/v0.1.8/monolith-0.1.8-linux-arm64.tar.gz)  | Docker server image for arm64 hosts.                                       |
| [Server setup kit](https://github.com/MaxJafar/monolith/releases/download/v0.1.8/monolith-0.1.8-server-kit.zip)       | Compose configuration, environment template and installation instructions. |
| [MCP and CLI package](https://github.com/MaxJafar/monolith/releases/download/v0.1.8/monolith-agent-tools-0.1.8.tgz)   | Node.js bridge for external agent clients.                                 |
| [Addons and widgets](https://github.com/MaxJafar/monolith/releases/tag/v0.1.8)                                                  | 14 independently versioned packages with a signed catalog.                 |
| [SHA256SUMS](https://github.com/MaxJafar/monolith/releases/download/v0.1.8/SHA256SUMS)                                          | Checksums for the complete download set.                                   |

This release supports **automatic updates with unsigned installers**. Windows installers are unsigned; macOS applications have an ad-hoc signature and are not notarized. Operating systems may block these downloads. Desktop clients require a separately hosted server. The browser client is included in the server image. See the [installation instructions](https://github.com/MaxJafar/monolith/blob/main/release/INSTALL.md).

Automatic downloads, notifications, installation and rollback use authenticated GitHub release archives. Existing 0.1.3 and preview desktop clients need this installer once to receive the trusted update key. Hosted servers need the external update supervisor. OS publisher signing can be added later using the same update feed.

Version 0.1.8 adds calendar drag and resize, recurring tasks/events, shared invitations and reminders. Clients on 0.1.7 update automatically. Server administrators must back up and apply the calendar schema migration before activating this release; automatic installation resumes for subsequent compatible versions. See [Calendar](/docs/projects-calendar) and the [calendar deployment guide](https://github.com/MaxJafar/monolith/blob/v0.1.8/docs/CALENDAR.md).

## Optional services

AI providers, weather, market data, coding activity, OAuth integrations and relay services need the appropriate host configuration or credentials. Scheduled automations need their worker. The Agents addon needs a configured execution worker.

The addon shop uses a signed catalog configured by the host administrator. A published catalog supplies downloads; the host still checks compatibility and migration approval before installation.

## Current boundaries

Monolith does not promise general offline synchronization or simultaneous live document co-editing. Native draft and conflict recovery are specific safeguards. Automatic server rollback restores a compatible runtime; it does not reverse database migrations.

Review the [update guide](/docs/updates), test with your installed addons and keep backups before adopting a new version for important work.

## Source and licenses

The source repository, issues and releases are public on [GitHub](https://github.com/MaxJafar/monolith). The repository's LICENSE, third-party notices and package-specific licenses govern distribution and reuse. The Monolith mark and cover are project assets.
