// SPDX-License-Identifier: 0BSD
import { useEffect, useMemo, useState } from 'react'
import { useRoutes } from 'react-router'

import type { ModuleConfig } from '@monolith/configs'
import { loadRemoteModuleConfig } from '@monolith/federation'
import { ErrorScreen } from '@monolith/ui'

import { devModeImports, devModePkgs } from '@/core/utils/devModeImports'

import { type RouteItem, buildChildRoutes } from '../utils/routeBuilder'
import RouteLoadingScreen from './RouteLoadingScreen'

type Resolution =
  { item: RouteItem; config: ModuleConfig } | { item: RouteItem; error: string }
export default function LazyRouteLoader({
  item,
  loadingMessage,
  systemView = false
}: {
  item: RouteItem
  loadingMessage: string
  systemView?: boolean
}) {
  const [result, setResult] = useState<Resolution | null>(null)
  useEffect(() => {
    let live = true
    const work = item.rawModule
      ? loadRemoteModuleConfig(item.rawModule, devModeImports, devModePkgs)
      : Promise.resolve(item)
    void work.then(
      config => {
        if (live) setResult({ item, config })
      },
      failure => {
        if (live)
          setResult({
            item,
            error:
              failure instanceof Error
                ? failure.message
                : 'The addon could not be opened.'
          })
      }
    )
    return () => {
      live = false
    }
  }, [item])
  const current = result?.item === item ? result : null
  const definitions = useMemo(
    () =>
      buildChildRoutes({
        routes: current && 'config' in current ? current.config.routes : {},
        APIKeyAccess: item.APIKeyAccess,
        loadingMessage,
        config: {
          name: item.name,
          title: item.name,
          icon: item.icon,
          canvas:
            !systemView &&
            (current && 'config' in current
              ? (current.config.canvas ?? true)
              : true),
          clearQueryOnUnmount: item.clearQueryOnUnmount ?? true
        }
      }),
    [current, item, loadingMessage, systemView]
  )
  const page = useRoutes(definitions)
  if (!current) return <RouteLoadingScreen message={loadingMessage} />
  if ('error' in current)
    return <ErrorScreen showRetryButton message={current.error} />
  return page
}
