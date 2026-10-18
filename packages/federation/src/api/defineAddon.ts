import { createApiClient } from '@monolith/api'
import type { ProxyTree } from '@monolith/api'
import type { ModuleConfig } from '@monolith/configs'

/**
 * Wraps a module configuration and automatically appends a type-safe `workspaceAPI` proxy client
 * resolved dynamically from the module's contract.
 */
export default function defineAddon<T extends ModuleConfig>(
  config: T
): T & {
  workspaceAPI: T['contract'] extends undefined
    ? undefined
    : ProxyTree<T['contract']>
} {
  return {
    ...config,
    workspaceAPI: createApiClient(config.contract || {})
  } as any
}
