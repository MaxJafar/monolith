// SPDX-License-Identifier: 0BSD
import { type ProxyTree, createApiClient } from '@monolith/api'
import type { ModuleConfig } from '@monolith/configs'

type AddonWithClient<T extends ModuleConfig> = T & {
  workspaceAPI: T['contract'] extends undefined
    ? undefined
    : ProxyTree<T['contract']>
}

export default function defineAddon<T extends ModuleConfig>(
  config: T
): AddonWithClient<T> {
  const workspaceAPI =
    config.contract === undefined ? undefined : createApiClient(config.contract)
  return Object.assign({}, config, { workspaceAPI }) as AddonWithClient<T>
}
