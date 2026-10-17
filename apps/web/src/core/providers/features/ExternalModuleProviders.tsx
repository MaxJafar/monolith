import {
  type ComponentType,
  Fragment,
  type ReactNode,
  useEffect,
  useState
} from 'react'

import {
  type FederatedModule,
  loadRemoteModuleConfig,
  useFederation
} from '@monolith/federation'

import { devModeImports, devModePkgs } from '@/core/utils/devModeImports'

type ExtensionProvider = ComponentType<{ children: ReactNode }>

function InstalledProvider({
  module,
  children
}: {
  module: FederatedModule
  children: ReactNode
}) {
  const identity = JSON.stringify([
    module.id,
    module.remoteId,
    module.remoteEntryUrl,
    module.APIKeyAccess
  ])
  const [loaded, setLoaded] = useState<{
    identity: string
    component: ExtensionProvider
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadRemoteModuleConfig(module, devModeImports, devModePkgs).then(
      config => {
        if (!cancelled)
          setLoaded({ identity, component: config.provider ?? Fragment })
      },
      error => {
        if (!cancelled) {
          console.error(
            'Unable to activate addon provider ' + module.name,
            error
          )
          setLoaded({ identity, component: Fragment })
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [module, identity])

  const Provider = loaded?.identity === identity ? loaded.component : Fragment
  return <Provider>{children}</Provider>
}

export default function ExternalModuleProviders({
  children
}: {
  children: ReactNode
}) {
  const { moduleGroups, globalProviders } = useFederation()
  let tree = children
  for (const group of moduleGroups) {
    for (const item of group.items) {
      const module = item.rawModule
      if (!module?.hasProvider) continue
      const identity = JSON.stringify([
        module.id,
        module.remoteId,
        module.remoteEntryUrl,
        module.APIKeyAccess
      ])
      tree = (
        <InstalledProvider key={identity} module={module}>
          {tree}
        </InstalledProvider>
      )
    }
  }
  for (const Provider of globalProviders) tree = <Provider>{tree}</Provider>
  return tree
}
