import { useEffect, useMemo, useState } from 'react'
import { type DataRouter, createBrowserRouter } from 'react-router'

import { useAuth } from '@monolith/api'
import { useFederation } from '@monolith/federation'

import {
  createAuthLoadingConfig,
  createAuthRouterConfig,
  createRouterConfig
} from '../utils/routerFactory'

export function useAppRouter() {
  const { auth, authLoading, userData } = useAuth()
  const { moduleGroups, loading: moduleGroupsLoading } = useFederation()

  const [appRouter, setAppRouter] = useState<{
    router: DataRouter
    ownerId: string
  } | null>(null)

  const [routerId, setRouterId] = useState(0)

  const ownerId = userData?.id ?? null

  const loadingRouter = useMemo(
    () => createBrowserRouter(createAuthLoadingConfig()),
    []
  )
  const authRouter = useMemo(
    () => createBrowserRouter(createAuthRouterConfig()),
    []
  )
  useEffect(() => {
    if (!auth || !ownerId) {
      setAppRouter(null)

      return
    }

    if (authLoading || moduleGroupsLoading || moduleGroups.length === 0) {
      return
    }

    let cancelled = false

    createRouterConfig({
      routes: moduleGroups,
      loadingMessage: 'loadingModule'
    }).then(routerConfig => {
      if (!cancelled) {
        setAppRouter({ router: createBrowserRouter(routerConfig), ownerId })
        setRouterId(id => id + 1)
      }
    })

    return () => {
      cancelled = true
    }
  }, [auth, ownerId, authLoading, moduleGroups, moduleGroupsLoading])

  useEffect(() => () => appRouter?.router.dispose(), [appRouter])

  const router = useMemo(() => {
    if (
      authLoading ||
      moduleGroupsLoading ||
      (auth && moduleGroups.length === 0)
    ) {
      return loadingRouter
    }

    if (!auth) {
      return authRouter
    }

    return appRouter?.ownerId === ownerId ? appRouter.router : loadingRouter
  }, [
    auth,
    ownerId,
    authLoading,
    moduleGroupsLoading,
    moduleGroups,
    appRouter,
    loadingRouter,
    authRouter
  ])

  const routerKey = useMemo(() => {
    if (
      authLoading ||
      moduleGroupsLoading ||
      (auth && moduleGroups.length === 0)
    ) {
      return 'loading'
    }

    if (!auth) {
      return 'auth'
    }

    return appRouter?.ownerId === ownerId
      ? `app-${ownerId}-${routerId}`
      : 'loading'
  }, [
    auth,
    ownerId,
    authLoading,
    moduleGroupsLoading,
    moduleGroups,
    appRouter,
    routerId
  ])

  return { router, isAuthenticated: !!auth, routerKey }
}
