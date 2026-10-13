import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import type { RouteObject } from 'react-router'

import type { ModuleConfig, ModuleGroup } from '@lifeforge/configs'
import type { FederatedModule } from '@lifeforge/federation'
import { Box, ErrorScreen, ModuleWrapper, NotFoundScreen } from '@lifeforge/ui'

import APIKeyStatusProvider from '@/core/providers/features/APIKeyStatusProvider'

import LazyRouteLoader from '../components/LazyRouteLoader'
import RouteLoadingScreen from '../components/RouteLoadingScreen'
import { modulePath } from './navigation'

export interface RouteBuilderOptions {
  routes: ModuleConfig['routes']
  loadingMessage: string
  APIKeyAccess?: Record<string, { usage: string; required: boolean }>
  config: {
    name: string
    title: string
    icon: string
    translationNamespace?: string
    clearQueryOnUnmount: boolean
  }
}

/**
 * Builds child routes for a module with proper error boundaries and loading states
 */
export function buildChildRoutes({
  routes,
  APIKeyAccess,
  loadingMessage = 'loadingModule',
  config
}: RouteBuilderOptions): RouteObject[] {
  const childRoutes: RouteObject[] = Object.entries(routes).map(
    ([path, Component]) => ({
      path: path.startsWith('/') ? path.slice(1) : path,
      element: (
        <APIKeyStatusProvider APIKeyAccess={APIKeyAccess}>
          <Suspense
            key={`route-${path.startsWith('/') ? path.slice(1) : path}`}
            fallback={<RouteLoadingScreen message={loadingMessage} />}
          >
            <ErrorBoundary
              fallbackRender={({ error }) => (
                <ErrorScreen
                  showRetryButton
                  message={
                    error instanceof Error
                      ? error.message
                      : 'An unexpected error occurred in this module.'
                  }
                />
              )}
              resetKeys={[path]}
            >
              <ModuleWrapper config={config}>
                <Box className="zillion-route-enter" display="contents">
                  <Component />
                </Box>
              </ModuleWrapper>
            </ErrorBoundary>
          </Suspense>
        </APIKeyStatusProvider>
      )
    })
  )

  childRoutes.push({
    path: '*',
    element: <NotFoundScreen />
  })

  return childRoutes
}

/**
 * Creates route configuration for a module with optional provider wrapper
 */
export function createModuleRoute(
  item: ModuleGroup['items'][number] & { rawModule?: FederatedModule },
  loadingMessage: string
): RouteObject | RouteObject[] {
  if (!item.rawModule) {
    const routeConfig = {
      routes: item.routes,
      APIKeyAccess: item.APIKeyAccess,
      config: {
        name: item.name || '',
        title: item.name,
        translationNamespace: `common.${item.name}`,
        icon: item.icon,
        clearQueryOnUnmount: item.clearQueryOnUnmount ?? true
      },
      loadingMessage
    }

    return {
      path: modulePath(item.name),
      children: buildChildRoutes(routeConfig)
    }
  }

  return {
    path: `${modulePath(item.name)}/*`,
    element: <LazyRouteLoader item={item} loadingMessage={loadingMessage} />
  }
}
