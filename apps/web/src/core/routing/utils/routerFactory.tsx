import { Suspense, lazy } from 'react'
import { Navigate, type RouteObject } from 'react-router'

import type { ModuleGroup } from '@lifeforge/configs'
import { NotFoundScreen } from '@lifeforge/ui'

import Auth from '@/system/auth'

import CanvasPageRoute from '../components/CanvasPageRoute'
import RootLayout from '../components/RootLayout'
import RouteErrorScreen from '../components/RouteErrorScreen'
import RouteLoadingScreen from '../components/RouteLoadingScreen'
import { resolveModuleAvailability } from './moduleAvailability'
import { workspaceRedirect } from './navigation'
import { createModuleRoute } from './routeBuilder'

const SystemSearchPage = lazy(() => import('@/core/search/SystemSearchPage'))

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

  const moduleRoutes = enabledItems.flatMap(item =>
    createModuleRoute(item, loadingMessage)
  )

  return [
    {
      path: '/',
      ErrorBoundary: RouteErrorScreen,
      element: <RootLayout />,
      children: [
        ...moduleRoutes,
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
