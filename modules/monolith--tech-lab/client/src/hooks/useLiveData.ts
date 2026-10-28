import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useTechLab } from '@/TechLabContext'
import { workspaceAPI } from '@/manifest'
import { recordTelemetry } from '@/utils/telemetryHistory'

/** Live Glances reading for one device; every widget shares the same cache. */
export function useDeviceTelemetry(id: string | undefined, intervalMs = 5000) {
  const { ownerId } = useTechLab()

  const query = useQuery(
    workspaceAPI.devices.telemetry.input({ id: id ?? '' }).queryOptions({
      queryKey: [...workspaceAPI.devices.telemetry.key, ownerId, id],
      enabled: !!ownerId && !!id,
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchInterval: intervalMs,
      refetchIntervalInBackground: false
    })
  )

  useEffect(() => {
    if (id && query.data) recordTelemetry(id, query.data)
  }, [id, query.data])

  return query
}

export function useMonitorTimeline() {
  const { ownerId } = useTechLab()

  return useQuery(
    workspaceAPI.timeline.input({ hours: 24, buckets: 48 }).queryOptions({
      queryKey: [...workspaceAPI.timeline.key, ownerId, 24, 48],
      enabled: !!ownerId,
      staleTime: 30000,
      refetchInterval: 60000,
      refetchIntervalInBackground: false
    })
  )
}

export function useUptimeKuma(url: string) {
  const { ownerId } = useTechLab()

  return useQuery(
    workspaceAPI.uptimeKuma.input({ url }).queryOptions({
      queryKey: [...workspaceAPI.uptimeKuma.key, ownerId, url],
      enabled: !!ownerId && !!url,
      staleTime: 0,
      refetchInterval: 60000,
      refetchIntervalInBackground: false,
      retry: 1
    })
  )
}
