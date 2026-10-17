import { useEffect, useState } from 'react'
import { useRoutes } from 'react-router'

import type { ModuleConfig, ModuleGroup } from '@monolith/configs'
import {
  type FederatedModule,
  loadRemoteModuleConfig
} from '@monolith/federation'
import { ErrorScreen } from '@monolith/ui'

import { devModeImports, devModePkgs } from '@/core/utils/devModeImports'

import { buildChildRoutes } from '../utils/routeBuilder'
import RouteLoadingScreen from './RouteLoadingScreen'

export default function LazyRouteLoader({
  item,
  loadingMessage,
  systemView = false
}: {
  item: ModuleGroup['items'][number] & { rawModule?: FederatedModule }
  loadingMessage: string
  systemView?: boolean
}) {
  const [resolvedRoutes, setResolvedRoutes] = useState<
    ModuleConfig['routes'] | null
  >(null)

  const [error, setError] = useState<string | null>(null)
  const [canvas, setCanvas] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      if (!item.rawModule) return

      try {
        const unwrapped = await loadRemoteModuleConfig(
          item.rawModule,
          devModeImports,
          devModePkgs
        )

        if (!active) return

        setResolvedRoutes(unwrapped.routes)
        setCanvas(unwrapped.canvas ?? true)
      } catch (err) {
        if (!active) return

        setError(err instanceof Error ? err.message : 'Failed to load module')
      }
    }
    load()

    return () => {
      active = false
    }
  }, [item])

  const config = {
    canvas: !systemView && canvas,
    name: item.name || '',
    title: item.name,
    icon: item.icon,
    clearQueryOnUnmount: item.clearQueryOnUnmount ?? true
  }

  const routesElement = useRoutes(
    buildChildRoutes({
      routes: resolvedRoutes || {},
      APIKeyAccess: item.APIKeyAccess,
      loadingMessage,
      config
    })
  )

  if (error) {
    return <ErrorScreen message={error} />
  }

  if (!resolvedRoutes) {
    return <RouteLoadingScreen message={loadingMessage} />
  }

  return routesElement
}
