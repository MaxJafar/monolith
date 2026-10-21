// SPDX-License-Identifier: 0BSD
import { RouterProvider } from 'react-router'

import { ErrorScreen } from '@monolith/ui'

import RouteLoadingScreen from '../components/RouteLoadingScreen'
import { useAppRouter } from '../hooks/useAppRouter'

export default function AppRoutesProvider() {
  const state = useAppRouter()
  if (state.error) return <ErrorScreen showRetryButton message={state.error} />
  return state.router ? (
    <RouterProvider key={state.routerKey} router={state.router} />
  ) : (
    <RouteLoadingScreen message="loadingUserData" />
  )
}
