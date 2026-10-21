// SPDX-License-Identifier: 0BSD
import { type ComponentType, Suspense, lazy } from 'react'
import { Navigate, type RouteObject, useLocation } from 'react-router'

import type { ModuleGroup } from '@monolith/configs'
import { ErrorScreen, NotFoundScreen } from '@monolith/ui'

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

const Search = lazy(() => import('@/core/search/SystemSearchPage'))
const Rooms = lazy(() => import('@/core/rooms/RoomsPage'))
const Roleplay = lazy(() => import('@/addons/urpg/RpgPage'))
const workspaceAreas = [
  'calendar',
  'projects',
  'actions',
  'docs',
  'ideas',
  'journal',
  'blog',
  'dashboard',
  'databases'
]

function WorkspaceRoute(props: Parameters<typeof LazyRouteLoader>[0]) {
  const workspace = useWorkspace()
  const location = useLocation()
  if (workspace.loading) return <RouteLoadingScreen message="loadingUserData" />
  if (workspace.error || !workspace.active)
    return <ErrorScreen message={workspace.error || 'Workspace unavailable'} />
  const query = new URLSearchParams(location.search)
  if (!query.has('workspace')) {
    query.set('workspace', workspace.active.id)
    return (
      <Navigate replace to={location.pathname + '?' + query + location.hash} />
    )
  }
  return <LazyRouteLoader {...props} systemView />
}
function page(path: string, View: ComponentType): RouteObject {
  return {
    path,
    element: (
      <Suspense fallback={<RouteLoadingScreen message="loadingUserData" />}>
        <View />
      </Suspense>
    )
  }
}
export function DashboardRedirectHandler() {
  const location = useLocation()
  return (
    <Navigate
      replace
      to={workspaceRedirect(
        new URLSearchParams(location.search).get('redirect')
      )}
    />
  )
}
export function AuthRedirectHandler() {
  const location = useLocation()
  return (
    <Navigate
      replace
      to={
        '/auth?redirect=' +
        encodeURIComponent(location.pathname + location.search + location.hash)
      }
    />
  )
}
export async function createRouterConfig({
  routes,
  loadingMessage
}: {
  routes: ModuleGroup[]
  loadingMessage: string
}): Promise<RouteObject[]> {
  const available = await resolveModuleAvailability(
    routes.flatMap(group => group.items)
  )
  const enabled = available.filter(item => !item.disabled)
  const database = enabled.find(item => modulePath(item.name) === '/databases')
  const children: RouteObject[] = []
  const nativePaths = new Set(workspaceAreas.map(area => '/' + area))
  for (const item of enabled) {
    if (database && nativePaths.has(modulePath(item.name))) continue
    children.push(createModuleRoute(item, loadingMessage))
  }
  if (database) {
    for (const area of workspaceAreas)
      children.push({
        path: '/' + area + '/*',
        element: (
          <WorkspaceRoute item={database} loadingMessage={loadingMessage} />
        )
      })
  }
  const manager = enabled.find(item => item.name === 'module-manager')
  if (manager)
    children.push({
      ...createModuleRoute(manager, loadingMessage),
      path: '/addons'
    })
  children.push(
    page('/rooms', Rooms),
    page('/urpg', Roleplay),
    page('/search', Search),
    { path: '/page/:id', element: <CanvasPageRoute /> },
    { path: '/auth/*', element: <DashboardRedirectHandler /> },
    { index: true, element: <Navigate replace to="/dashboard" /> },
    { path: '*', element: <NotFoundScreen /> }
  )
  return [
    {
      path: '/',
      ErrorBoundary: RouteErrorScreen,
      element: <RootLayout />,
      children
    }
  ]
}
export function createAuthRouterConfig(): RouteObject[] {
  return [
    { path: '/', element: <Auth /> },
    { path: '/auth', element: <Auth /> },
    { path: '*', element: <AuthRedirectHandler /> }
  ]
}
export function createAuthLoadingConfig(): RouteObject[] {
  return [
    { path: '*', element: <RouteLoadingScreen message="loadingUserData" /> }
  ]
}
