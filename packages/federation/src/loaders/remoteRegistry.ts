// SPDX-License-Identifier: 0BSD
import { getInstance, init, registerRemotes } from '@module-federation/runtime'

import type { FederatedModule } from '../utils/fetchModuleData'
import { resolveRemoteEntry } from './remoteEntry'

export const registeredRemotesSet = new Set<string>()
const locations = new Map<string, string>()
const manifestLocations = new WeakMap<FederatedModule, string>()

export function registerFederatedEntry(
  module: FederatedModule,
  host?: string
): string {
  const name = 'm_' + module.remoteId
  const entry =
    host === undefined
      ? (manifestLocations.get(module) ??
        resolveRemoteEntry(module.remoteEntryUrl))
      : resolveRemoteEntry(module.remoteEntryUrl, host)
  const runtime = getInstance()
  const old = locations.get(name)
  if (!runtime)
    init({ name: 'host', remotes: [{ name, entry, type: 'module' }] })
  else if (old !== entry || !registeredRemotesSet.has(name)) {
    registerRemotes([{ name, entry, type: 'module' }], {
      force: old !== undefined && old !== entry
    })
  }
  locations.set(name, entry)
  manifestLocations.set(module, entry)
  registeredRemotesSet.add(name)
  return name
}
