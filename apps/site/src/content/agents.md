---
title: MCP and CLI
description: Connect Codex, Claude Code, OpenClaw and other agents to Monolith.
section: Extend Monolith
order: 24
---

Monolith’s bridge exposes reviewed workspace operations through a **stdio MCP server** and a **JSON CLI**. It runs on your agent’s machine and connects to your Monolith gateway. The Agents addon is not required.

## Build and sign in

Your server must include the integration catalog endpoint and device-session support. Restart or redeploy an older API before connecting.

```sh
pnpm agent:build
pnpm --silent agent auth login --server https://monolith.example.com --email you@example.com
pnpm --silent agent doctor
```

Replace the example URL and email with your gateway origin and account. Use the HTTPS origin without `/api`, not the private domain API port. A local origin such as `http://127.0.0.1:8080` is also supported.

Enter your password at the hidden prompt and an authenticator code if your account uses two-factor authentication. Passwords are not command-line options.

## Generate a client configuration

```sh
pnpm --silent agent config --client codex
pnpm --silent agent config --client claude
pnpm --silent agent config --client openclaw
pnpm --silent agent config --client cursor
pnpm --silent agent config --client vscode
```

Each command prints configuration with absolute executable paths. It does not edit the other application’s settings. Merge the generated entry into the relevant config:

| Client                  | Entry                                                   |
| ----------------------- | ------------------------------------------------------- |
| Codex                   | `mcp_servers.monolith` in `config.toml`                 |
| Claude Code             | `mcpServers.monolith` in `.mcp.json`                    |
| OpenClaw                | `mcp.servers.monolith` or its MCP stdio settings        |
| Cursor / Claude Desktop | `mcpServers.monolith` in the client’s MCP configuration |
| VS Code                 | `servers.monolith` in `.vscode/mcp.json`                |

Use `--client generic` for another stdio MCP client. Older OpenClaw versions may need their supported stdio adapter. Regenerate configuration if you move the checkout or Node installation.

## Choose write access

The bridge starts in read mode. To expose creation and editing:

```sh
pnpm --silent agent --allow-writes config --client codex
```

`--allow-deletes` also requires `--allow-writes` and exposes deletion operations. Account permissions and revision checks apply. These switches constrain the bridge, not the underlying account session; they are not a sandbox against a local agent that can read your credentials.

## Use the CLI

```sh
pnpm --silent agent tools list
pnpm --silent agent tools describe pages_create
pnpm --silent agent call workspaces_list
pnpm --silent agent --allow-writes call pages_create --file page.json
```

Inspect the running tool schema before preparing `page.json`. Successful results are JSON, except help and configuration output. Errors go to stderr and exit nonzero.

The catalog covers workspaces, page metadata, canonical documents, databases, records, fields, views, projects, tasks, calendar events and entity search. Installed modules and permissions affect availability. Account administration, secrets, shell execution, addon installation, publishing and outbound messaging are not exposed.

## Sessions and limits

Profiles store revocable device credentials under `~/.monolith/agents/`, outside the checkout. Keep that directory private. Access tokens refresh automatically. Use `--profile work` before a command to select a separate account or host.

```sh
pnpm --silent agent --profile work auth status
pnpm --silent agent --profile work auth logout
```

Logout revokes the session and removes the local profile. If the server is permanently unavailable, `auth logout --local-only` forgets the local file; revoke its device session separately.

The bridge has no public HTTP MCP listener. Browser-only clients that require a remote OAuth MCP URL cannot connect directly. A revision conflict needs a fresh read and deliberate resolution; the bridge does not blindly retry the write.
