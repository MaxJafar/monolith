import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useSearchParams } from 'react-router'

import { useAuth } from '@monolith/api'

import type { TechLabSnapshot } from '../../shared'
import { workspaceAPI } from '../manifest'
import { TechLabContext } from './TechLabContext'
import { getSection } from './utils/navigation'

export function TechLabProvider({ children }: { children: ReactNode }) {
  const { userData } = useAuth()

  const ownerId = userData?.id ?? null

  const queryClient = useQueryClient()
  const mountedAt = useRef(Date.now())
  const alive = useRef(true)
  const locked = useRef(false)
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    alive.current = true

    return () => {
      alive.current = false
    }
  }, [])

  const query = useQuery(
    workspaceAPI.snapshot.queryOptions({
      queryKey: [...workspaceAPI.snapshot.key, ownerId],
      enabled: !!ownerId,
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchInterval: query =>
        (query.state.data?.settings.auto_refresh_seconds ?? 30) * 1000,
      refetchIntervalInBackground: false
    })
  )

  const data: TechLabSnapshot | undefined =
    ownerId && query.dataUpdatedAt >= mountedAt.current ? query.data : undefined
  const section = getSection(params.get('section'))
  const healthByService = useMemo(
    () =>
      new Map(data?.health.map(health => [health.service_id, health]) ?? []),
    [data?.health]
  )
  const devicesById = useMemo(
    () => new Map(data?.devices.map(device => [device.id, device]) ?? []),
    [data?.devices]
  )

  const updateParams = useCallback(
    (changes: Record<string, string | null>) => {
      setParams(
        previous => {
          const next = new URLSearchParams(previous)
          Object.entries(changes).forEach(([key, value]) => {
            if (value === null || value === '') next.delete(key)
            else next.set(key, value)
          })

          return next
        },
        { replace: true }
      )
    },
    [setParams]
  )

  const run = useCallback(
    async <T,>(
      operation: () => Promise<T>
    ): Promise<{ ok: true; value: T } | { ok: false }> => {
      if (!ownerId || locked.current) return { ok: false }
      locked.current = true
      setPending(true)
      setActionError(null)

      try {
        const value = await operation()

        if (!alive.current) return { ok: false }
        await queryClient.invalidateQueries({ queryKey: workspaceAPI.key })

        return { ok: true, value }
      } catch (error) {
        if (alive.current) {
          setActionError(error instanceof Error ? error.message : String(error))
          await queryClient.invalidateQueries({
            queryKey: [...workspaceAPI.snapshot.key, ownerId]
          })
        }

        return { ok: false }
      } finally {
        locked.current = false
        if (alive.current) setPending(false)
      }
    },
    [ownerId, queryClient]
  )

  const value = {
    ownerId,
    data,
    section,
    params,
    updateParams,
    healthByService,
    devicesById,
    pending,
    loading: query.isPending || (!data && query.isFetching),
    refreshing: query.isFetching,
    error: actionError ?? (query.error ? query.error.message : null),
    refresh: () => {
      setActionError(null)
      void query.refetch()
    },
    run
  }

  return <TechLabContext value={value}>{children}</TechLabContext>
}

export type TechLabState = {
  ownerId: string | null
  data: TechLabSnapshot | undefined
  section: ReturnType<typeof getSection>
  params: URLSearchParams
  updateParams: (changes: Record<string, string | null>) => void
  healthByService: Map<string, TechLabSnapshot['health'][number]>
  devicesById: Map<string, TechLabSnapshot['devices'][number]>
  pending: boolean
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh: () => void
  run: <T>(
    operation: () => Promise<T>
  ) => Promise<{ ok: true; value: T } | { ok: false }>
}
