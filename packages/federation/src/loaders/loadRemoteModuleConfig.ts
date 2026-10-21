// SPDX-License-Identifier: 0BSD
import { loadRemote } from '@module-federation/runtime'

import { globalProxyRegistry } from '@monolith/api'
import {
  type ModuleConfig,
  type ModuleGroup,
  addonPackageName,
  moduleConfigSchema
} from '@monolith/configs'

import type { FederatedModule } from '../utils/fetchModuleData'
import { type ModuleImporter, getBundledModules } from './bundledModules'
import { registerFederatedEntry } from './remoteRegistry'

export { registeredRemotesSet } from './remoteRegistry'

async function remoteManifest(module: FederatedModule): Promise<unknown> {
  const name = registerFederatedEntry(module)
  const loaded = await loadRemote<{ default?: unknown }>(name + '/Manifest')
  if (!loaded)
    throw new Error('The add-on manifest could not be loaded: ' + module.name)
  return loaded.default ?? loaded
}

function sourceImporter(
  name: string,
  imports: Record<string, ModuleImporter>,
  packages: Record<string, { name: string }>
) {
  const wanted = addonPackageName(name)
  return Object.entries(imports).find(([file]) => {
    const manifest = file.replace(/\/client\/manifest\.ts$/, '/package.json')
    return packages[manifest]?.name === wanted
  })?.[1]
}

export async function loadRemoteModuleConfig(
  module: FederatedModule,
  devModeImports: Record<string, ModuleImporter> = {},
  devModePkgs: Record<string, { name: string }> = {}
): Promise<ModuleGroup['items'][number]> {
  const bundled = getBundledModules()?.[addonPackageName(module.name)]
  const managed =
    new URLSearchParams(module.remoteEntryUrl.split('?')[1]).get('managed') ===
    '1'
  const source =
    import.meta.env.DEV && !managed
      ? sourceImporter(module.name, devModeImports, devModePkgs)
      : undefined
  let definition: unknown
  if (bundled) definition = (await bundled()).default
  else if (source) {
    try {
      definition = (await source()).default
    } catch (error) {
      console.warn('Add-on source import failed; loading its built entry', {
        name: module.name,
        error
      })
      definition = await remoteManifest(module)
    }
  } else definition = await remoteManifest(module)

  const validated = moduleConfigSchema.safeParse(definition)
  if (!validated.success)
    throw new Error(
      'Invalid add-on configuration for ' +
        module.name +
        ': ' +
        validated.error.message
    )
  // Keep the original contract object: the proxy registry uses object identity.
  const config = definition as ModuleConfig
  if (config.contract)
    globalProxyRegistry.set(config.contract, { remoteId: module.remoteId })
  return {
    name: module.name,
    id: module.id,
    remoteId: module.remoteId,
    icon: module.icon,
    category: module.category,
    APIKeyAccess: module.APIKeyAccess,
    routes: config.routes,
    widgets: config.widgets,
    contract: config.contract,
    provider: config.provider,
    subsection: config.subsection,
    hidden: config.hidden,
    disabled: config.disabled,
    clearQueryOnUnmount: config.clearQueryOnUnmount,
    canvas: config.canvas
  }
}
