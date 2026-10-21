// SPDX-License-Identifier: 0BSD
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import type { RouteObject } from 'react-router'

import type { ModuleConfig, ModuleGroup } from '@monolith/configs'
import type { FederatedModule } from '@monolith/federation'
import { Box, ErrorScreen, ModuleWrapper, NotFoundScreen } from '@monolith/ui'

import APIKeyStatusProvider from '@/core/providers/features/APIKeyStatusProvider'

import LazyRouteLoader from '../components/LazyRouteLoader'
import RouteLoadingScreen from '../components/RouteLoadingScreen'
import { modulePath } from './navigation'

export type RouteItem = ModuleGroup['items'][number] & {
  rawModule?: FederatedModule
}
export interface RouteBuilderOptions {
  routes: ModuleConfig['routes']
  loadingMessage: string
  APIKeyAccess?: Record<string, { usage: string; required: boolean }>
  config: {
    name: string
    title: string
    icon: string
    translationNamespace?: string
    canvas?: boolean
    clearQueryOnUnmount: boolean
  }
}
export function buildChildRoutes(options: RouteBuilderOptions): RouteObject[] {
  const result: RouteObject[] = []
  for (const [url, View] of Object.entries(options.routes)) {
    const relative = url.replace(/^\/+/, '')
    result.push({
      path: relative,
      element: (
        <ErrorBoundary
          resetKeys={[relative]}
          fallbackRender={({ error }) => (
            <ErrorScreen
              showRetryButton
              message={
                error instanceof Error
                  ? error.message
                  : 'This page could not be displayed.'
              }
            />
          )}
        >
          <Suspense
            fallback={<RouteLoadingScreen message={options.loadingMessage} />}
          >
            <APIKeyStatusProvider APIKeyAccess={options.APIKeyAccess}>
              <ModuleWrapper config={options.config}>
                <Box className="zillion-route-enter" display="contents">
                  <View />
                </Box>
              </ModuleWrapper>
            </APIKeyStatusProvider>
          </Suspense>
        </ErrorBoundary>
      )
    })
  }
  result.push({ path: '*', element: <NotFoundScreen /> })
  return result
}
export function createModuleRoute(
  item: RouteItem,
  loadingMessage: string
): RouteObject {
  const path = modulePath(item.name)
  if (item.rawModule)
    return {
      path: path + '/*',
      element: <LazyRouteLoader item={item} loadingMessage={loadingMessage} />
    }
  return {
    path,
    children: buildChildRoutes({
      routes: item.routes,
      loadingMessage,
      APIKeyAccess: item.APIKeyAccess,
      config: {
        name: item.name,
        title: item.name,
        icon: item.icon,
        translationNamespace: 'common.' + item.name,
        canvas: item.name !== 'module-manager' && (item.canvas ?? true),
        clearQueryOnUnmount: item.clearQueryOnUnmount ?? true
      }
    })
  }
}
