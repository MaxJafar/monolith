---
title: Release availability
description: Understand the development build, client downloads and optional services.
section: Start here
order: 8
---

Monolith is in active development. The source tree used for these guides is version **0.0.0**. This website does not offer a managed Monolith workspace or a separate account service.

These guides describe the current development workspace. The GitHub README and website documentation are published separately from the application rewrite. The published application source still predates some features, including the latest release and agent tooling; use a matching development checkout before following those commands.

The repository and Releases were checked on **17 October 2026**: the repository was private and no releases were published. Updating this website or the README does not publish an installer, an addon catalog or a new application version.

## Ways to use Monolith

| Distribution | Current path                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Browser      | Build from source and open your local or self-hosted gateway.                                    |
| Windows      | Build the Tauri/WebView2 shell on Windows, or use a signed release when one is published.        |
| macOS        | Build the AppKit/WKWebView shell on a Mac, or use a signed and notarized release when available. |
| Linux host   | Run the documented Docker Compose stack behind your HTTPS ingress.                               |
| MCP and CLI  | Build the agent tools package and connect to an updated gateway/API.                             |

Check the actual [GitHub Releases](https://github.com/MaxJafar/monolith/releases) before downloading. A release builder or update screen in the source does not mean a signed public artifact has already been published. This site links to Releases instead of inventing download URLs.

## Optional services

AI providers, weather, market data, coding activity, OAuth integrations and relay services need the appropriate host configuration or credentials. Scheduled automations need their worker. The Agents addon needs a configured execution worker.

The addon shop uses a catalog configured by the host administrator. It does not assume a public catalog exists by default.

## Current boundaries

Monolith does not promise general offline synchronization or simultaneous live document co-editing. Native draft and conflict recovery are specific safeguards, not a complete offline sync system. Automatic server rollback restores a compatible runtime; it does not reverse database migrations.

Review the [update guide](/docs/updates), test with your installed addons and keep backups before adopting a new version for important work.

## Source and licenses

The source repository is on [GitHub](https://github.com/MaxJafar/monolith) and is currently private while the release is being prepared. Repository and release links require access. The repository’s LICENSE, third-party notices and package-specific licenses govern distribution and reuse. The Monolith mark and cover are project assets.
