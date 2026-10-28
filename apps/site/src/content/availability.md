---
title: Release availability
description: Public downloads, automatic updates and supported installation paths.
section: Start here
order: 8
---

Monolith's current source is public on [GitHub](https://github.com/MaxJafar/monolith). The website and these docs are publicly accessible without a Vercel account. The website contains product information; your workspace runs on your own Monolith host.

## Current release

Version **0.1.19** is available from [GitHub Releases](https://github.com/MaxJafar/monolith/releases/tag/v0.1.19). This is the recommended release. It removes the manual Restore previous version button and includes the 0.1.18 Day, Week and Month calendar widget views and large page icons, on top of the 0.1.17 page icon and cover popover, the 0.1.16 desktop window fixes and the 0.1.15 page editing and security fixes for the replacement Monolith source under 0BSD.

| Download                                                                                                                                  | Platform or purpose                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [Windows installer](https://github.com/MaxJafar/monolith/releases/download/v0.1.19/monolith-0.1.19-windows-amd64.exe)   | Windows x64, Tauri and WebView2.                                           |
| [macOS disk image](https://github.com/MaxJafar/monolith/releases/download/v0.1.19/monolith-0.1.19-darwin-universal.dmg) | Universal application for Apple Silicon and Intel.                         |
| [Linux x64 image](https://github.com/MaxJafar/monolith/releases/download/v0.1.19/monolith-0.1.19-linux-amd64.tar.gz)    | Docker server image for amd64 hosts.                                       |
| [Linux ARM64 image](https://github.com/MaxJafar/monolith/releases/download/v0.1.19/monolith-0.1.19-linux-arm64.tar.gz)  | Docker server image for arm64 hosts.                                       |
| [Server setup kit](https://github.com/MaxJafar/monolith/releases/download/v0.1.19/monolith-0.1.19-server-kit.zip)       | Compose configuration, environment template and installation instructions. |
| [MCP and CLI package](https://github.com/MaxJafar/monolith/releases/download/v0.1.19/monolith-agent-tools-0.1.19.tgz)   | Node.js bridge for external agent clients.                                 |
| [Addons and widgets](https://github.com/MaxJafar/monolith/releases/tag/v0.1.19)                                                  | Six optional addon packages with a signed catalog.                 |
| [SHA256SUMS](https://github.com/MaxJafar/monolith/releases/download/v0.1.19/SHA256SUMS)                                          | Checksums for the complete download set.                                   |

This release supports **automatic updates with unsigned installers**. Windows installers are unsigned; macOS applications have an ad-hoc signature and are not notarized. Operating systems may block these downloads. Desktop clients require a separately hosted server. The browser client is included in the server image. See the [installation instructions](https://github.com/MaxJafar/monolith/blob/main/release/INSTALL.md).

Automatic downloads, notifications, installation and rollback use authenticated GitHub release archives. Existing 0.1.3 and preview desktop clients need this installer once to receive the trusted update key. Hosted servers need the external update supervisor. OS publisher signing can be added later using the same update feed.

Version 0.1.19 removes the manual Restore previous version button from Updates; failed updates still recover automatically. Version 0.1.18 added Day, Week and Month views with hover previews to the Calendar widget, showed page icons large above the title, and tidied Schedule & guests and project cards. Version 0.1.17 added a compact popover for a page's icon and cover and fixed the customization and settings dialogs collapsing their content. Version 0.1.16 kept the desktop Updates button in the window corner and made the Windows installer refresh taskbar icons. Version 0.1.15 fixed dragging text on pages and saving pages with links, restricted sign-in provider changes to host administrators listed in `MONOLITH_AUTH_ADMIN_IDS`, blocked remote requests to private networks and kept large uploads from timing out. All five keep the 0.1.14 schema fingerprint, so servers on 0.1.14 or later update automatically. Version 0.1.14 replaced the inherited core and retired inherited addon packages; upgrading a server from an earlier release still requires a database backup and the 0.1.14 planned migration. Runtime rollback does not undo that migration. See [updates and recovery](/docs/updates).

## Optional services

AI providers, weather, market data, coding activity, OAuth integrations and relay services need the appropriate host configuration or credentials. Scheduled automations need their worker. The Agents addon needs a configured execution worker.

The addon shop uses a signed catalog configured by the host administrator. A published catalog supplies downloads; the host still checks compatibility and migration approval before installation.

## Current boundaries

Monolith does not promise general offline synchronization or simultaneous live document co-editing. Native draft and conflict recovery are specific safeguards. Automatic server rollback restores a compatible runtime; it does not reverse database migrations.

Review the [update guide](/docs/updates), test with your installed addons and keep backups before adopting a new version for important work.

## Source and licenses

Monolith’s current first-party source is open source under [0BSD](https://github.com/MaxJafar/monolith/blob/main/LICENSE), allowing use, modification and redistribution, including commercial use. The source repository, issues and releases are public on [GitHub](https://github.com/MaxJafar/monolith).

Third-party dependencies and bundled assets retain their own licenses and notices. See [third-party notices](https://github.com/MaxJafar/monolith/blob/main/THIRD_PARTY_NOTICES.md) and [source provenance](https://github.com/MaxJafar/monolith/blob/main/legal/source-provenance.json). The license change applies starting with release 0.1.13 and the replacement source on main; older release archives keep the licenses included with those archives. The Monolith mark and cover are original project assets.
