// SPDX-License-Identifier: 0BSD
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { useAPIEndpoint } from '@monolith/api'

import { workspaceAPI } from '@/utils/workspaceAPI'

export type Location = {
  name: string
  formattedAddress: string
  location: { latitude: number; longitude: number }
}
export function validLocations(value: unknown): Location[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Location => {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      typeof item.formattedAddress !== 'string'
    )
      return false
    const point = item.location
    return (
      point &&
      Number.isFinite(point.latitude) &&
      Math.abs(point.latitude) <= 90 &&
      Number.isFinite(point.longitude) &&
      Math.abs(point.longitude) <= 180
    )
  })
}
export function useLocationSearch(query: string, disabled = false) {
  const host = useAPIEndpoint()
  const term = query.trim()
  const [settled, setSettled] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSettled(term), 350)
    return () => clearTimeout(timer)
  }, [term])
  const capability = useQuery(
    workspaceAPI
      .checkAPIKeys({ keys: 'gcloud' })
      .setHost(host)
      .queryOptions({ enabled: !disabled })
  )
  const enabled = !disabled && capability.data === true
  const search = useQuery(
    workspaceAPI.locations.search
      .setHost(host)
      .input({ q: settled })
      .queryOptions({
        enabled: enabled && settled.length > 0 && term === settled
      })
  )
  const waiting = !!term && (term !== settled || search.isFetching)
  const results =
    term && term === settled && enabled ? validLocations(search.data) : []
  return { capability, search, enabled, waiting, results, term }
}
