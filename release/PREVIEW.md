Monolith's first public preview brings pages, projects, calendar, connected databases, rooms, dashboard widgets and installable add-ons into one self-hosted workspace.

Downloads include:

- Windows x64 installer and a universal macOS disk image (Apple Silicon and Intel).
- Linux x64 and ARM64 server images, plus the server setup kit.
- Independently versioned add-on and widget packages with a signed catalog.
- The Node.js CLI/MCP package for Codex, Claude Code, OpenClaw and other compatible agents.
- `SHA256SUMS` and `manual-release.json` covering every download.

Read the [installation guide](https://github.com/MaxJafar/monolith/blob/main/release/INSTALL.md), [website](https://monolith-site-maxjafars-projects.vercel.app) and [documentation](https://monolith-site-maxjafars-projects.vercel.app/docs).

This is a **manual-install preview**. The Windows installer is unsigned. The macOS application uses an ad-hoc signature and is not notarized. Operating systems may block these downloads. Signed automatic application updates are not enabled in this preview; the release workflow retains its signing requirements for future production releases. Desktop clients require a separately hosted Monolith server.

Back up existing data before installing. Linux image archives larger than GitHub's per-file limit are split into numbered parts; download every part for your architecture. See the server kit instructions for loading them.

The repository license, third-party notices and package-specific licenses apply to the source and downloads.
