import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { createApiClient } from '@monolith/api'
import type { ModuleConfig } from '@monolith/configs'
import { loadRemoteModuleConfig, useFederation } from '@monolith/federation'

import type databaseContract from '../../../../monolith--databases/client/contract'
import { databaseEvents, localDay } from '../utils/calendarModel'

export default function useDatabaseCalendar() {
  const federation = useFederation()

  const module = federation.moduleGroups
    .flatMap(group => group.items)
    .find(module => module.id === 'monolith--databases')
  const installedId = module?.remoteId
  const rawModule = module?.rawModule
  const existingContract = module?.contract as
    Partial<typeof databaseContract> | undefined

  const [attempt, setAttempt] = useState(0)

  const [manifest, setManifest] = useState<{
    moduleId: string | undefined
    contract: Partial<typeof databaseContract> | undefined
    status: 'idle' | 'loading' | 'ready' | 'error'
    error: Error | null
  }>({ moduleId: undefined, contract: undefined, status: 'idle', error: null })

  useEffect(() => {
    if (!installedId || existingContract) return
    let cancelled = false
    setManifest({
      moduleId: installedId,
      contract: undefined,
      status: 'loading',
      error: null
    })
    // Match the host's source loader in development: built manifests would
    // otherwise initialize a second copy of shared providers such as nuqs.
    // Vite removes these sibling imports from the production branch.
    const load = rawModule
      ? import.meta.env.DEV
        ? loadRemoteModuleConfig(
            rawModule,
            import.meta.glob<{ default: ModuleConfig }>(
              '../../../../monolith--databases/client/manifest.ts',
              { eager: false }
            ),
            import.meta.glob<{ name: string }>(
              '../../../../monolith--databases/package.json',
              { eager: true }
            )
          )
        : loadRemoteModuleConfig(rawModule)
      : Promise.reject(
          new Error('Database module manifest metadata is missing')
        )
    void load
      .then(config => {
        if (!cancelled)
          setManifest({
            moduleId: installedId,
            contract: config.contract as
              Partial<typeof databaseContract> | undefined,
            status: 'ready',
            error: null
          })
      })
      .catch(error => {
        if (!cancelled)
          setManifest({
            moduleId: installedId,
            contract: undefined,
            status: 'error',
            error:
              error instanceof Error
                ? error
                : new Error('Database manifest could not be loaded')
          })
      })

    // Dynamic federation imports cannot be aborted, but late results must not
    // attach a removed/replaced module's contract or update an unmounted hook.
    return () => {
      cancelled = true
    }
  }, [installedId, rawModule, existingContract, attempt])

  const currentManifest = manifest.moduleId === installedId ? manifest : null
  const contract = existingContract ?? currentManifest?.contract
  const manifestLoading =
    !!module &&
    !existingContract &&
    (!currentManifest ||
      currentManifest.status === 'idle' ||
      currentManifest.status === 'loading')
  const manifestError = currentManifest?.error ?? null
  const retryManifest = () => setAttempt(value => value + 1)
  const available = !!contract?.calendarFeed && !!contract.people
  // Use the registered remote contract object, so endpoint paths and keys retain
  // the database module's federation prefix and the shared authenticated client.
  const api = useMemo(
    () => createApiClient((contract ?? {}) as typeof databaseContract),
    [contract]
  )
  const feed = useQuery({
    ...api.calendarFeed
      .input({
        today: localDay(new Date()),
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
      .queryOptions(),
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: available
  })

  const people = useQuery({
    ...api.people.queryOptions(),
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: available
  })

  const model = useMemo(() => {
    try {
      return { events: feed.data ? databaseEvents(feed.data) : [], error: null }
    } catch (error) {
      return {
        events: [],
        error:
          error instanceof Error
            ? error
            : new Error('Invalid database calendar feed')
      }
    }
  }, [feed.data])

  return {
    feed,
    people,
    events: model.events,
    modelError: model.error,
    available,
    installed: !!module,
    loading: federation.loading || manifestLoading,
    manifestError,
    retryManifest,
    federationError: federation.error
  }
}
