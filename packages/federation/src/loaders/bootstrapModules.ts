// SPDX-License-Identifier: 0BSD
import type { FC, ReactNode } from 'react'

import { type ModuleGroup, addonPackageName } from '@monolith/configs'

import type { FederatedModuleGroup } from '../providers/FederationProvider'
import {
  type CategoryOrder,
  fetchCategoryOrder,
  fetchModuleManifest
} from '../utils/fetchModuleData'
import { sortRoutes } from '../utils/sortRoutes'
import { getBundledModules } from './bundledModules'
import { registerFederatedEntry } from './remoteRegistry'

export async function bootstrapModules(
  apiHost: string,
  coreModules: ModuleGroup['items'][number][] = []
): Promise<{
  moduleGroups: FederatedModuleGroup[]
  globalProviders: FC<{ children: ReactNode }>[]
  categoryTranslations: CategoryOrder
}> {
  const [manifests, categoryTranslations] = await Promise.all([
    fetchModuleManifest(apiHost),
    fetchCategoryOrder(apiHost)
  ])
  const groups = new Map<string, FederatedModuleGroup>()
  const add = (item: FederatedModuleGroup['items'][number]) => {
    let group = groups.get(item.category)
    if (!group) {
      group = { title: item.category, items: [] }
      groups.set(item.category, group)
    }
    group.items.push(item)
  }
  const globalProviders: FC<{ children: ReactNode }>[] = []
  for (const module of coreModules) {
    add(module)
    if (module.provider && !globalProviders.includes(module.provider))
      globalProviders.push(module.provider)
  }
  for (const module of manifests) {
    if (!getBundledModules()?.[addonPackageName(module.name)])
      registerFederatedEntry(module, apiHost)
    add({
      name: module.name,
      id: module.id,
      remoteId: module.remoteId,
      icon: module.icon,
      category: module.category,
      routes: {},
      widgets: [],
      hidden: module.hidden,
      APIKeyAccess: module.APIKeyAccess,
      subsection: module.subsection,
      rawModule: module
    })
  }
  return {
    moduleGroups: sortRoutes(Array.from(groups.values()), categoryTranslations),
    globalProviders,
    categoryTranslations
  }
}
