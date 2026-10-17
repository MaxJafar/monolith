import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Policy } from './types.js'

export function agentConfig(
  client: string,
  profile: string,
  policy: Policy,
  entry = resolve(dirname(fileURLToPath(import.meta.url)), 'cli.js')
) {
  const args = [
    entry,
    '--profile',
    profile,
    ...(policy.allowWrites ? ['--allow-writes'] : []),
    ...(policy.allowDeletes ? ['--allow-deletes'] : []),
    'mcp'
  ]
  const definition = {
    command: process.execPath,
    args,
    ...(process.env.MONOLITH_CONFIG_DIR
      ? {
          env: { MONOLITH_CONFIG_DIR: resolve(process.env.MONOLITH_CONFIG_DIR) }
        }
      : {})
  }
  if (client === 'codex')
    return `[mcp_servers.monolith]\ncommand = ${JSON.stringify(definition.command)}\nargs = ${JSON.stringify(args)}\nstartup_timeout_sec = 30\ntool_timeout_sec = 180\n${definition.env ? `[mcp_servers.monolith.env]\nMONOLITH_CONFIG_DIR = ${JSON.stringify(definition.env.MONOLITH_CONFIG_DIR)}\n` : ''}`
  if (client === 'openclaw')
    return JSON.stringify(
      {
        mcp: {
          servers: {
            monolith: { transport: 'stdio', enabled: true, ...definition }
          }
        }
      },
      null,
      2
    )
  if (client === 'vscode')
    return JSON.stringify(
      { servers: { monolith: { type: 'stdio', ...definition } } },
      null,
      2
    )
  return JSON.stringify({ mcpServers: { monolith: definition } }, null, 2)
}
