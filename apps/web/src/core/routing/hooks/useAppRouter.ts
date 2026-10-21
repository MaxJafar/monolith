// SPDX-License-Identifier: 0BSD
import { useEffect, useRef, useState } from 'react'
import {
  type DataRouter,
  type RouteObject,
  createBrowserRouter
} from 'react-router'

import { useAuth } from '@monolith/api'
import { useFederation } from '@monolith/federation'

import {
  createAuthLoadingConfig,
  createAuthRouterConfig,
  createRouterConfig
} from '../utils/routerFactory'

interface RouterSnapshot {
  router: DataRouter
  owner: string
  key: string
}
export function useAppRouter() {
  const { auth, authLoading, userData } = useAuth()
  const { moduleGroups, loading, error: moduleError } = useFederation()
  const authenticated = Boolean(auth)
  const owner = authenticated ? (userData?.id ?? '') : 'anonymous'
  const [snapshot, setSnapshot] = useState<RouterSnapshot | null>(null)
  const revision = useRef(0)
  const [failure, setFailure] = useState<string | null>(null)
  const waiting =
    authLoading ||
    (authenticated && (loading || !userData?.id || moduleGroups.length === 0))
  useEffect(() => {
    let live = true
    let owned: DataRouter | undefined
    setFailure(null)
    const activate = (routes: RouteObject[], kind: string) => {
      if (!live) return
      owned = createBrowserRouter(routes)
      setSnapshot({
        router: owned,
        owner,
        key: kind + ':' + owner + ':' + ++revision.current
      })
    }
    if (waiting) activate(createAuthLoadingConfig(), 'loading')
    else if (!authenticated) activate(createAuthRouterConfig(), 'auth')
    else
      void createRouterConfig({
        routes: moduleGroups,
        loadingMessage: 'loadingModule'
      }).then(
        routes => activate(routes, 'app'),
        error => {
          if (live)
            setFailure(
              error instanceof Error
                ? error.message
                : 'Navigation could not be prepared.'
            )
        }
      )
    return () => {
      live = false
      owned?.dispose()
    }
  }, [authenticated, owner, waiting, moduleGroups])
  return {
    router: snapshot?.owner === owner ? snapshot.router : null,
    routerKey: snapshot?.key ?? 'loading',
    isAuthenticated: authenticated,
    error: failure || (authenticated ? (moduleError?.message ?? null) : null)
  }
}
