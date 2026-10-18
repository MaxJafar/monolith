import { lazy } from 'react'

import type { ModuleConfig, ModuleWidget } from '@monolith/configs'
import type { FederatedModule } from '@monolith/federation'

export type WidgetEntry = {
  moduleName: string
  component: Awaited<
    ReturnType<NonNullable<ModuleConfig['widgets']>[number]>
  >['default']
  icon: string
  minW: number
  minH: number
  maxW?: number
  maxH?: number
}

export async function resolveWidget(config: ModuleConfig, id: string) {
  const results = await Promise.allSettled(
    (config.widgets ?? []).map(importWidget => importWidget())
  )

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.config.id === id) {
      return { default: result.value.default }
    }
  }
  throw new Error('The installed addon does not provide widget ' + id)
}

/** Owns component identities for the current installed-addon inventory. */
export function createWidgetCatalog(
  loadConfig: (module: FederatedModule) => Promise<ModuleConfig>
) {
  let components = new Map<string, WidgetEntry['component']>()

  return (
    descriptors: readonly ModuleWidget[],
    modules: readonly FederatedModule[]
  ) => {
    const installed = new Map(modules.map(module => [module.name, module]))
    const next = new Map<string, WidgetEntry['component']>()
    const entries: Record<string, WidgetEntry> = Object.create(null)

    for (const descriptor of descriptors) {
      const module = installed.get(descriptor.moduleName)

      if (
        !module ||
        Object.prototype.hasOwnProperty.call(entries, descriptor.id)
      )
        continue

      const identity = JSON.stringify([
        module.id,
        module.remoteId,
        module.remoteEntryUrl,
        module.APIKeyAccess,
        descriptor.id
      ])
      const component =
        components.get(identity) ??
        lazy(async () => resolveWidget(await loadConfig(module), descriptor.id))
      next.set(identity, component)
      entries[descriptor.id] = {
        moduleName: module.name,
        component,
        icon: descriptor.icon,
        minW: descriptor.minW ?? 1,
        minH: descriptor.minH ?? 1,
        maxW: descriptor.maxW,
        maxH: descriptor.maxH
      }
    }
    components = next

    return entries
  }
}
