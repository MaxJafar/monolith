import type { ModuleGroup } from '@monolith/configs'
import { ErrorScreen, NotFoundScreen } from '@monolith/ui'
import { Suspense, lazy } from 'react'
import { Navigate, type RouteObject, useLocation } from 'react-router'

import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import Auth from '@/system/auth'

import CanvasPageRoute from '../components/CanvasPageRoute'
import LazyRouteLoader from '../components/LazyRouteLoader'
import RootLayout from '../components/RootLayout'
import RouteErrorScreen from '../components/RouteErrorScreen'
import RouteLoadingScreen from '../components/RouteLoadingScreen'
import { resolveModuleAvailability } from './moduleAvailability'
import { modulePath, workspaceRedirect } from './navigation'
import { createModuleRoute } from './routeBuilder'

const SystemSearchPage = lazy(() => import('@/core/search/SystemSearchPage'))
const RoomsPage = lazy(() => import('@/core/rooms/RoomsPage'))
const RpgPage = lazy(() => import('@/addons/urpg/RpgPage'))

function SystemRoute(props: Parameters<typeof LazyRouteLoader>[0]) {
  const { active, loading, error } = useWorkspace(),
    location = useLocation()

  if (loading) return <RouteLoadingScreen message="loadingUserData" />
  if (error || !active)
    return <ErrorScreen message={error || 'Workspace unavailable'} />

  const params = new URLSearchParams(location.search)

  if (!params.has('workspace')) {
    params.set('workspace', active.id)

    return (
      <Navigate replace to={`${location.pathname}?${params}${location.hash}`} />
    )
  }

  return <LazyRouteLoader {...props} systemView />
}

interface CreateRouterConfigOptions {
  routes: ModuleGroup[]
  loadingMessage: string
}

/**
 * Component for handling dashboard redirects with query parameters
 */
export function DashboardRedirectHandler() {
  const searchParams = new URLSearchParams(window.location.search)

  const redirect = searchParams.get('redirect')

  return <Navigate replace to={workspaceRedirect(redirect)} />
}

export function AuthRedirectHandler() {
  const { pathname, search, hash } = window.location

  const fullPath = `${pathname}${search}${hash}`

  return (
    <Navigate replace to={`/auth?redirect=${encodeURIComponent(fullPath)}`} />
  )
}

/**
 * Creates the main router configuration based on authentication state
 */
export async function createRouterConfig({
  routes,
  loadingMessage
}: CreateRouterConfigOptions): Promise<RouteObject[]> {
  const allItems = routes.flatMap(category => category.items)

  const resolvedItems = await resolveModuleAvailability(allItems)

  const enabledItems = resolvedItems.filter(item => !item.disabled)

  const database = enabledItems.find(
    item => modulePath(item.name) === '/databases'
  )
  const systemPaths = [
    '/calendar',
    '/projects',
    '/dashboard',
    '/databases',
    '/blog'
  ]
  const moduleRoutes = enabledItems
    .filter(item => !database || !systemPaths.includes(modulePath(item.name)))
    .flatMap(item => createModuleRoute(item, loadingMessage))

  if (database)
    for (const area of [
      'calendar',
      'projects',
      'actions',
      'docs',
      'ideas',
      'journal',
      'blog',
      'dashboard',
      'databases'
    ])
      moduleRoutes.push({
        path: `/${area}/*`,
        element: <SystemRoute item={database} loadingMessage={loadingMessage} />
      })

  const calendar = enabledItems.find(
    item => modulePath(item.name) === '/calendar'
  )

  if (calendar)
    moduleRoutes.push({
      path: '/calendar/sources/*',
      element: (
        <LazyRouteLoader
          systemView
          item={calendar}
          loadingMessage={loadingMessage}
        />
      )
    })

  const manager = enabledItems.find(item => item.name === 'module-manager')

  if (manager)
    moduleRoutes.push({
      ...(createModuleRoute(manager, loadingMessage) as RouteObject),
      path: '/addons'
    })

  return [
    {
      path: '/',
      ErrorBoundary: RouteErrorScreen,
      element: <RootLayout />,
      children: [
        ...moduleRoutes,
        {
          path: '/rooms',
          element: (
            <Suspense
              fallback={<RouteLoadingScreen message="loadingUserData" />}
            >
              <RoomsPage />
            </Suspense>
          )
        },
        {
          path: '/urpg',
          element: (
            <Suspense
              fallback={<RouteLoadingScreen message="loadingUserData" />}
            >
              <RpgPage />
            </Suspense>
          )
        },
        {
          path: '/search',
          element: (
            <Suspense
              fallback={<RouteLoadingScreen message="loadingUserData" />}
            >
              <SystemSearchPage />
            </Suspense>
          )
        },
        { path: '/page/:id', element: <CanvasPageRoute /> },
        {
          path: '/auth/*',
          element: <DashboardRedirectHandler />
        },
        {
          path: '/',
          element: <Navigate replace to="/dashboard" />
        },
        {
          path: '*',
          element: <NotFoundScreen />
        }
      ]
    }
  ]
}

/**
 * Creates authentication-only router configuration
 */
export function createAuthRouterConfig(): RouteObject[] {
  return [
    {
      path: '/',
      element: <Auth />
    },
    {
      path: '/auth',
      element: <Auth />
    },
    {
      path: '*',
      element: <AuthRedirectHandler />
    }
  ]
}

/**
 * Creates a loading screen configuration for when session token is being verified
 */
export function createAuthLoadingConfig(): RouteObject[] {
  return [
    {
      path: '*',
      element: <RouteLoadingScreen message="loadingUserData" />
    }
  ]
}
