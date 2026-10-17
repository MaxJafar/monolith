# Monolith MCP and CLI

Monolith's agent bridge lets Codex, Claude Code, OpenClaw and other stdio MCP clients work with the same workspace data as the app. A JSON CLI exposes the same operations for shell-based agents and scripts. The bridge runs on the agent's machine and connects to a local or hosted Monolith gateway over HTTPS.

This is separate from the Agents addon, which runs assigned jobs through external agent runtimes. You do not need that addon to connect an MCP client.

## Build and sign in

Use Node.js 22.16 or later and the repository's pnpm version. The server must include the authenticated `/api/integrations/catalog` endpoint introduced with this integration, and its public gateway must support device sessions.

Restart or redeploy the Monolith API with this code before connecting. An older running API returns 404 for the tool catalog.

```sh
pnpm install
pnpm agent:build
pnpm --silent agent auth login --server https://monolith.example.com --email you@example.com
pnpm --silent agent doctor
```

Enter your password at the hidden prompt, then an authenticator code if your account uses two-factor authentication. For a local gateway, an origin such as `http://127.0.0.1:8080` works. Use the gateway's configured `PUBLIC_URL`, not the private TypeScript API port or a URL ending in `/api`.

`auth login --credentials-stdin` accepts a JSON object with `email`, `password` and optional `code` from a secret manager or another process. Passwords and tokens are never command-line options. Avoid putting credentials in shell history or agent instructions.

Profiles are independent revocable device sessions. Use `--profile work` before a command to select another account/server. Credentials live under `~/.monolith/agents/<profile>.json`, outside the repository; `MONOLITH_CONFIG_DIR` can select a different private directory. On POSIX systems directories use mode 0700 and files 0600; on Windows they inherit the selected directory's ACLs. These files contain refresh credentials, so keep the directory private and out of shared/synced folders. Passwords are not retained.

```sh
pnpm --silent agent --profile work auth status
pnpm --silent agent --profile work auth logout
```

Logout revokes the server session and removes its local profile. If a server is permanently unavailable, `auth logout --local-only` forgets the file; revoke the device session in Monolith separately. Access tokens refresh automatically with a filesystem lock shared by simultaneous CLI and MCP processes, preventing refresh-token replay.

## Connect an agent

Generate a configuration for the agent you use:

```sh
pnpm --silent agent config --client codex
pnpm --silent agent config --client claude
pnpm --silent agent config --client openclaw
pnpm --silent agent config --client cursor
pnpm --silent agent config --client vscode
pnpm --silent agent config --client generic
```

The output contains absolute Node and script paths plus the profile name, with no passwords or tokens. Regenerate it if you move the checkout or Node installation. These commands print configuration; they do not edit other applications' settings. Sign in before connecting so the agent can discover tools immediately.

| Client                               | Where to merge the generated entry                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Codex CLI, desktop and IDE extension | The `mcp_servers.monolith` section in your Codex `config.toml`                                                            |
| Claude Code                          | The `mcpServers.monolith` entry in project `.mcp.json`, or register the generated command/arguments with `claude mcp add` |
| OpenClaw                             | The `mcp.servers.monolith` entry in OpenClaw configuration, or Settings → MCP → Stdio                                     |
| Cursor and Claude Desktop            | The `mcpServers.monolith` entry in the client's MCP configuration                                                         |
| VS Code                              | The `servers.monolith` entry in `.vscode/mcp.json`                                                                        |
| Other clients                        | Any client that can launch a standard MCP stdio server can use the generated command and argument array                   |

Follow the official [Codex MCP setup](https://developers.openai.com/codex/mcp), [Claude Code MCP setup](https://code.claude.com/docs/en/mcp), [OpenClaw MCP setup](https://docs.openclaw.ai/tools/mcp), [Cursor MCP setup](https://cursor.com/docs/mcp) and [VS Code MCP setup](https://code.visualstudio.com/docs/agent-customization/mcp-servers) for config location and scope. OpenClaw installations with native MCP support can verify the connection with `openclaw mcp doctor monolith --probe`; older versions need their supported stdio MCP adapter. Existing settings should be merged, not replaced.

By default the bridge exposes read operations. To let an agent create and edit data, generate the configuration with writes enabled:

```sh
pnpm --silent agent --allow-writes config --client codex
```

`--allow-deletes` additionally exposes deletions and requires `--allow-writes`. Agents should still follow the user's instructions and their client's approval policy. These switches constrain the bridge; the underlying login session has the account's normal permissions. They are not server-enforced reduced-scope tokens or a sandbox against a local agent that can read your credential files.

The generated configuration launches Node directly, keeping stdout exclusively for MCP JSON-RPC. To run it manually use `pnpm --silent mcp`. It does not expose a public HTTP MCP listener, and browser-only clients requiring a remote OAuth MCP URL cannot connect directly to this stdio bridge.

## Available operations

Schemas come from the running server's registered API contracts. Only an explicit list of reviewed routes is exposed; uninstalled modules disappear from discovery. The CLI and MCP server use the original endpoints, preserving validation, workspace roles, row-level security and mutation observers.

| Area                | Operations                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Workspaces          | List accessible workspaces and read sidebar navigation                                                                        |
| Pages               | List pages, read metadata, create pages, change metadata and delete with revision protection                                  |
| Canonical documents | Read, initialize and save page, record or note snapshots with `expectedRevision`                                              |
| Databases           | Read workspace database snapshots and people; create, update and delete databases                                             |
| Records             | Create, update, comment, link and delete records                                                                              |
| Fields and views    | Create, update and delete typed fields and saved views                                                                        |
| Projects and tasks  | List, create, update and delete owned projects, columns and tasks; read project categories/statuses/technologies/visibilities |
| Calendar            | Read calendars/categories; list, read, create, update and delete events                                                       |
| Search              | Find and resolve authorized workspace entity references                                                                       |

Shared pages and databases use workspace membership. Native projects, tasks and calendar endpoints use the signed-in account's own items. The catalog does not offer account administration, secrets, shell execution, addon installation, publishing or outbound messaging.

## Use the CLI

All successful command results are JSON except `config` and help. Failures go to stderr as JSON and exit nonzero. `call` wraps the result in `{"data": ...}`; the full `monolith_` prefix is optional on CLI tool names.

```sh
pnpm --silent agent tools list
pnpm --silent agent tools describe pages_create
pnpm --silent agent call workspaces_list
pnpm --silent agent --allow-writes call pages_create --file page.json
```

`page.json`:

```json
{
  "query": { "workspace_id": "YOUR-WORKSPACE-UUID" },
  "body": { "title": "Release checklist" }
}
```

`--file -` reads JSON from stdin. `--json` accepts small inline arguments. Use `tools describe <name>` for the current input shape instead of guessing required fields. The same command options work on Windows, macOS and Linux; file input avoids shell quoting differences.

An agent can start with: “Use Monolith to find my release workspace, create a checklist page and add the remaining tasks to my project.” The `monolith://guide` MCP resource explains the supported workflow.

## Editing documents without losing changes

1. Find the page/record/note ID and workspace ID.
2. Call `monolith_document_read` with `{ "workspaceId": "...", "kind": "page", "id": "..." }`. If the existing source has not been initialized, call `monolith_document_initialize` with writes enabled. The workspace must already have the canonical editor enabled.
3. Edit the returned BlockSuite JSON snapshot, preserving unrelated blocks, IDs and properties. Rich text uses BlockSuite text delta objects; it is not an HTML or Markdown replacement API. `monolith_pages_metadata` returns metadata and a legacy body, so use `document_read` for current content.
4. Call `monolith_document_save` with that snapshot and the revision from the read in `expectedRevision`.

A conflicting save returns HTTP 409 and current-document details. Re-read and reconcile changes before trying again. The bridge does not force overwrites or retry failed mutations after timeouts. Read-only recovery documents remain read-only. Database record property edits use the database tools; canonical document body edits use the document tools.

HTTP requests and responses are capped at 8 MiB; individual MCP results at 3 MB to fit clients' transport limits. If an MCP result is too large, inspect it through the CLI. A size error after a write does not undo that write, so do not repeat it blindly.

## Verification

```sh
pnpm agent:test
pnpm --filter @monolith/agent-tools typecheck
pnpm --filter @monolith/server exec vitest run src/lib/integrations/catalog.test.ts
```

The agent tests start loopback fixtures and real MCP stdio child processes. They cover login/TOTP, concurrent refresh, logout/revocation, permissions, JSON schema validation, CLI input/output and revision conflicts.

For a running development API and gateway backed by the isolated local database on port 55432, `pnpm exec node tools/agent-integration-smoke.mjs` exercises real page, document, database, project and task operations, MCP, CLI and viewer/cross-account isolation. It creates synthetic accounts and removes them afterward. The gateway defaults to `http://127.0.0.1:8789`; override it with `MONOLITH_AGENT_TEST_SERVER`. It refuses production or remote database targets.

The bridge uses the official [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/server). Protocol tests verify the shared MCP transport; they do not represent a test run inside every third-party agent application.

Verified on Windows on 2026-10-17: 19 CLI/MCP tests, four catalog tests, API typechecking and the production API build passed. The live gateway check discovered 54 tools and verified real mutations, revision conflicts, viewer/cross-account isolation and session revocation. The existing Windows development API also logged Todo List/Gym calendar import warnings; those external calendar adapters are outside this bridge's verification coverage.
