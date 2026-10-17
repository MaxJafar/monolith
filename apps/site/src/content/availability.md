---
title: Release availability
description: Public source, preview downloads and supported installation paths.
section: Start here
order: 8
---

Monolith's current source is public on [GitHub](https://github.com/MaxJafar/monolith). The website and these docs are publicly accessible without a Vercel account. The website contains product information; your workspace runs on your own Monolith host.

## First preview

Version **0.1.0-preview.1** is available from [GitHub Releases](https://github.com/MaxJafar/monolith/releases/tag/v0.1.0-preview.1). The complete download set passed its platform builds, package verification and fresh-database server startup checks.

| Download                                                                                                                                  | Platform or purpose                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [Windows installer](https://github.com/MaxJafar/monolith/releases/download/v0.1.0-preview.1/monolith-0.1.0-preview.1-windows-amd64.exe)   | Windows x64, Tauri and WebView2.                                           |
| [macOS disk image](https://github.com/MaxJafar/monolith/releases/download/v0.1.0-preview.1/monolith-0.1.0-preview.1-darwin-universal.dmg) | Universal application for Apple Silicon and Intel.                         |
| [Linux x64 image](https://github.com/MaxJafar/monolith/releases/download/v0.1.0-preview.1/monolith-0.1.0-preview.1-linux-amd64.tar.gz)    | Docker server image for amd64 hosts.                                       |
| [Linux ARM64 image](https://github.com/MaxJafar/monolith/releases/download/v0.1.0-preview.1/monolith-0.1.0-preview.1-linux-arm64.tar.gz)  | Docker server image for arm64 hosts.                                       |
| [Server setup kit](https://github.com/MaxJafar/monolith/releases/download/v0.1.0-preview.1/monolith-0.1.0-preview.1-server-kit.zip)       | Compose configuration, environment template and installation instructions. |
| [MCP and CLI package](https://github.com/MaxJafar/monolith/releases/download/v0.1.0-preview.1/monolith-agent-tools-0.1.0-preview.1.tgz)   | Node.js bridge for external agent clients.                                 |
| [Addons and widgets](https://github.com/MaxJafar/monolith/releases/tag/v0.1.0-preview.1)                                                  | 14 independently versioned packages with a signed catalog.                 |
| [SHA256SUMS](https://github.com/MaxJafar/monolith/releases/download/v0.1.0-preview.1/SHA256SUMS)                                          | Checksums for the complete download set.                                   |

This is a **manual-install preview**. Windows installers are unsigned; macOS applications have an ad-hoc signature and are not notarized. Operating systems may block these downloads. Desktop clients require a separately hosted server. The browser client is included in the server image. See the [preview installation instructions](https://github.com/MaxJafar/monolith/blob/main/release/INSTALL.md).

Signed automatic application updates are not enabled in this preview. Their signing and platform verification requirements remain in place for production releases.

## Optional services

AI providers, weather, market data, coding activity, OAuth integrations and relay services need the appropriate host configuration or credentials. Scheduled automations need their worker. The Agents addon needs a configured execution worker.

The addon shop uses a signed catalog configured by the host administrator. A published catalog supplies downloads; the host still checks compatibility and migration approval before installation.

## Current boundaries

Monolith does not promise general offline synchronization or simultaneous live document co-editing. Native draft and conflict recovery are specific safeguards. Automatic server rollback restores a compatible runtime; it does not reverse database migrations.

Review the [update guide](/docs/updates), test with your installed addons and keep backups before adopting a new version for important work.

## Source and licenses

The source repository, issues and releases are public on [GitHub](https://github.com/MaxJafar/monolith). The repository's LICENSE, third-party notices and package-specific licenses govern distribution and reuse. The Monolith mark and cover are project assets.
