import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { loadRemoteModuleConfig, useFederation } from '@monolith/federation'

import { devModeImports, devModePkgs } from '@/core/utils/devModeImports'
import workspaceAPI from '@/core/utils/workspaceAPI'

import NotFoundWidget from '../components/NotFoundWidget'
import { type WidgetEntry, createWidgetCatalog } from './widgetCatalog'

export type { WidgetEntry } from './widgetCatalog'

interface WidgetContextValue {
  widgets: Record<string, WidgetEntry>
  loading: boolean
  getComponent: (id: string) => {
    component: WidgetEntry['component']
    name: string | undefined
  }
}

const WidgetContext = createContext<WidgetContextValue>({
  widgets: {},
  loading: true,
  getComponent: () => ({ component: NotFoundWidget, name: undefined })
})

export function useWidgets() {
  return useContext(WidgetContext)
}

export default function WidgetProvider({
  children
}: {
  children: React.ReactNode
}) {
  const { moduleGroups, loading: loadingModules } = useFederation()

  const modules = useMemo(
    () =>
      moduleGroups.flatMap(group =>
        group.items.flatMap(item => (item.rawModule ? [item.rawModule] : []))
      ),
    [moduleGroups]
  )
  const inventory = JSON.stringify(
    modules.map(module => [module.id, module.remoteEntryUrl])
  )
  const enabled = modules.length > 0
  const query = useQuery({
    queryKey: workspaceAPI.modules.widgets.key,
    queryFn: () => workspaceAPI.modules.widgets.query(),
    enabled
  })
  const [catalog] = useState(() =>
    createWidgetCatalog(module =>
      loadRemoteModuleConfig(module, devModeImports, devModePkgs)
    )
  )

  // The inventory may change without changing the endpoint's contract key.
  // Current modules always filter cached descriptors before anything renders.
  const refetchWidgets = query.refetch
  useEffect(() => {
    if (enabled) void refetchWidgets()
  }, [inventory, enabled, refetchWidgets])

  const widgets = useMemo(
    () => catalog(query.data ?? [], modules),
    [catalog, query.data, modules]
  )
  const loading = loadingModules || (modules.length > 0 && query.isPending)
  const value = useMemo<WidgetContextValue>(
    () => ({
      widgets,
      loading,
      getComponent(id) {
        const entry = widgets[id]

        return {
          component: entry?.component ?? NotFoundWidget,
          name: entry?.moduleName
        }
      }
    }),
    [widgets, loading]
  )

  return <WidgetContext value={value}>{children}</WidgetContext>
}
