import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@monolith/api'

import { useDatabases } from '@/DatabaseProvider'
import { workspaceAPI } from '@/manifest'

export function useCalendarSchedules(enabled = true) {
  const { workspaceId } = useDatabases()
  const { userData } = useAuth()

  const endpoint = workspaceAPI.calendar.list.input({
    workspace_id: workspaceId ?? ''
  })
  const options = endpoint.queryOptions()
  const query = useQuery({
    ...options,
    initialData: undefined,
    queryKey: [...options.queryKey, userData?.id],
    enabled: enabled && !!workspaceId && !!userData?.id,
    refetchInterval: enabled ? 30000 : false,
    refetchOnWindowFocus: true
  })

  return { ...query, workspaceId, actor: userData?.id }
}
