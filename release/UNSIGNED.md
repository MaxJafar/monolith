Monolith brings pages, projects, calendar, connected databases, rooms, dashboard widgets and installable add-ons into one self-hosted workspace.

Downloads include:

- Windows x64 installer and a universal macOS disk image (Apple Silicon and Intel).
- Linux x64 and ARM64 server images, plus the server setup kit.
- Independently versioned add-on and widget packages with a signed catalog.
- The Node.js CLI/MCP package for Codex, Claude Code, OpenClaw and other compatible agents.
- `SHA256SUMS`, `release-downloads.json` and the signed `monolith-release.json` update manifest.

Read the [installation guide](https://github.com/MaxJafar/monolith/blob/main/release/INSTALL.md), [website](https://monolith-site-maxjafars-projects.vercel.app) and [documentation](https://monolith-site-maxjafars-projects.vercel.app/docs).

The Windows installer is unsigned. The macOS application uses an ad-hoc signature and is not notarized. Operating systems may block the initial installation. **Automatic updates remain enabled:** installed clients authenticate update manifests and archive checksums with the pinned Monolith release key. Downloads, installation preferences, notifications, progress and rollback are available in Settings → Updates. Desktop restarts wait for two background idle minutes and clean drafts; the server supervisor installs during its configured maintenance window. See [installation and updates](../docs/UPDATES.md) for setup. Desktop clients require a separately hosted Monolith server.

Back up existing data before installing. Linux image archives larger than GitHub's per-file limit are split into numbered parts; download every part for your architecture. See the server kit instructions for loading them.

The repository license, third-party notices and package-specific licenses apply to the source and downloads.
