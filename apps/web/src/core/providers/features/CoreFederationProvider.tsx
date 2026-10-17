import { useCallback, useEffect, useRef } from 'react'

import { useAuth } from '@monolith/api'
import { bootstrapModules, useFederation } from '@monolith/federation'

import { CORE_MODULES } from '@/system'

export default function CoreFederationProvider({
  children
}: {
  children: React.ReactNode
}) {
  const { auth } = useAuth()
  const {
    setModuleGroups,
    setGlobalProviders,
    setCategoryTranslations,
    setLoading,
    setError,
    refetch
  } = useFederation()
  const generation = useRef(0)
  const authenticated = Boolean(auth)

  const refresh = useCallback(async () => {
    const request = ++generation.current
    if (!authenticated) return
    setLoading(true)
    setError(null)
    try {
      if (import.meta.env.DEV) {
        const { registerDevelopmentShares } =
          await import('./developmentShares')
        await registerDevelopmentShares()
      }
      const result = await bootstrapModules(
        import.meta.env.VITE_API_HOST || '',
        CORE_MODULES
      )
      if (request !== generation.current) return
      setModuleGroups(result.moduleGroups)
      setGlobalProviders(result.globalProviders)
      setCategoryTranslations(result.categoryTranslations)
    } catch (error) {
      if (request === generation.current) {
        setError(
          error instanceof Error ? error : new Error('Unable to load addons')
        )
      }
    } finally {
      if (request === generation.current) setLoading(false)
    }
  }, [
    authenticated,
    setModuleGroups,
    setGlobalProviders,
    setCategoryTranslations,
    setLoading,
    setError
  ])

  useEffect(() => {
    refetch.current = refresh
    if (authenticated) void refresh()
    else {
      setModuleGroups([])
      setGlobalProviders([])
      setCategoryTranslations({})
      setError(null)
      setLoading(false)
    }
    return () => {
      ++generation.current
      refetch.current = async () => {}
    }
  }, [
    authenticated,
    refresh,
    refetch,
    setModuleGroups,
    setGlobalProviders,
    setCategoryTranslations,
    setLoading,
    setError
  ])

  return children
}
