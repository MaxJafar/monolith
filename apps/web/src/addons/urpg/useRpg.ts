import { useAuth } from '@monolith/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import {
  type Campaign,
  type RPGCommand,
  dayKey
} from '../../../../../modules/monolith--databases/urpgShared'

export function useRpg() {
  const { active } = useWorkspace(),
    { userData } = useAuth(),
    cache = useQueryClient()
  const enabled = !!active?.enabled_modules.includes('urpg')
  const options = workspaceAPI.urpg.snapshot
    .input({
      workspace_id: active?.id ?? '00000000-0000-4000-8000-000000000000'
    })
    .queryOptions()
  const key = [...options.queryKey, userData?.id]
  const query = useQuery({
    ...options,
    queryKey: key,
    enabled,
    staleTime: 15000,
    refetchOnWindowFocus: true
  })
  const state = query.data as Campaign | null | undefined
  const lock = useRef(false)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])
  async function execute(command: RPGCommand) {
    if (!active || !state || lock.current || active.role === 'viewer')
      return false
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const latest = cache.getQueryData<Campaign>(key) ?? state
      const updated = await workspaceAPI.urpg.command
        .input({ workspace_id: active.id })
        .mutate({ expected_revision: latest.revision, command })
      cache.setQueryData(key, updated)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      await query.refetch()
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return {
    state,
    execute,
    busy,
    error,
    query,
    enabled,
    readOnly: !active || active.role === 'viewer',
    workspaceId: active?.id ?? '',
    day: dayKey(
      now,
      state?.character.timezone ??
        Intl.DateTimeFormat().resolvedOptions().timeZone
    )
  }
}
