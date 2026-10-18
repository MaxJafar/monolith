# Monolith agent tools

The `monolith-agent` command provides a JSON CLI and MCP stdio server for Monolith. It connects to a local or hosted Monolith gateway using a revocable device login and exposes workspace, page, document, database, project, task and calendar operations.

From the Monolith repository:

```sh
pnpm agent:build
pnpm --silent agent auth login --server https://monolith.example.com --email you@example.com
pnpm --silent agent doctor
pnpm --silent agent --allow-writes config --client codex
```

Supported configuration formats: `codex`, `claude`, `openclaw`, `cursor`, `vscode` and `generic`. Configuration contains no credentials. Writes require `--allow-writes`; deletions also require `--allow-deletes`. Monolith's normal account and workspace permissions remain in force.

After building, the portable entry point is `dist/cli.js`; the package declares the `monolith-agent` binary. Launch it directly with Node for MCP, without a package-manager banner on stdout. The package is not published to a registry by this change.

See the [complete setup, CLI and document-editing guide](https://github.com/MaxJafar/monolith/blob/main/docs/AGENT-TOOLS.md).
