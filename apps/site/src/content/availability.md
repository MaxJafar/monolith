---
title: Release availability
description: Public source, preview downloads and supported installation paths.
section: Start here
order: 8
---

Monolith's current source is public on [GitHub](https://github.com/MaxJafar/monolith). The website and these docs are publicly accessible without a Vercel account. The website contains product information; your workspace runs on your own Monolith host.

## First preview

Version **0.1.0-preview.1** is being built and verified for the first public distribution. The release workflow publishes the complete download set only after every platform and package check passes. Check [GitHub Releases](https://github.com/MaxJafar/monolith/releases) for published downloads.

| Distribution | Installation path |
| --- | --- |
| Browser | Build from public source and open your configured host. |
| Windows x64 | Preview installer for Tauri/WebView2. |
| macOS | Universal disk image for Apple Silicon and Intel. |
| Linux host | amd64 or arm64 Docker image plus the server setup kit. |
| MCP and CLI | Node.js package for external agent clients. |
| Addons and widgets | Independently versioned packages and a signed catalog. |

This is a **manual-install preview**. Windows installers are unsigned; macOS applications have an ad-hoc signature and are not notarized. Operating systems may block these downloads. Desktop clients require a separately hosted server. See the [preview installation instructions](https://github.com/MaxJafar/monolith/blob/main/release/INSTALL.md).

Signed automatic application updates are not enabled in this preview. Their signing and platform verification requirements remain in place for production releases.

## Optional services

AI providers, weather, market data, coding activity, OAuth integrations and relay services need the appropriate host configuration or credentials. Scheduled automations need their worker. The Agents addon needs a configured execution worker.

The addon shop uses a signed catalog configured by the host administrator. A published catalog supplies downloads; the host still checks compatibility and migration approval before installation.

## Current boundaries

Monolith does not promise general offline synchronization or simultaneous live document co-editing. Native draft and conflict recovery are specific safeguards. Automatic server rollback restores a compatible runtime; it does not reverse database migrations.

Review the [update guide](/docs/updates), test with your installed addons and keep backups before adopting a new version for important work.

## Source and licenses

The source repository, issues and releases are public on [GitHub](https://github.com/MaxJafar/monolith). The repository's LICENSE, third-party notices and package-specific licenses govern distribution and reuse. The Monolith mark and cover are project assets.
