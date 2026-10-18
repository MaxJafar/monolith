import { useAPIEndpoint, useAuth } from '@monolith/api'
import { useQuery } from '@tanstack/react-query'

import { workspaceAPI } from '../manifest'

export function useComments(workspace_id: string, project_id: string) {
  const { userData } = useAuth(),
    endpoint = useAPIEndpoint()
  const options = workspaceAPI.comments.list
    .input({ workspace_id, project_id })
    .queryOptions({ refetchInterval: 2000, retry: false, gcTime: 0 })

  return useQuery({
    ...options,
    queryKey: [...options.queryKey, endpoint, userData?.id],
    enabled: !!userData?.id
  })
}
