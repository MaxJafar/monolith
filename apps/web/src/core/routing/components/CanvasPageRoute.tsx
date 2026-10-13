import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useParams } from 'react-router'

import { useAuth } from '@lifeforge/api'
import { validateCanvasPage } from '@lifeforge/blocks'
import { Box, Text, WorkspaceCanvas } from '@lifeforge/ui'

import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

export default function CanvasPageRoute() {
  const { id = '' } = useParams(),
    { userData } = useAuth(),
    { activate, workspaces } = useWorkspace(),
    cache = useQueryClient()
  const endpoint = workspaceAPI.workspaces.getPage.input({ id })
  const options = endpoint.queryOptions()
  const metadata = useQuery<Awaited<ReturnType<typeof endpoint.query>>>({
    queryKey: [...options.queryKey, userData?.id],
    queryFn: () => endpoint.query(),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: false,
    enabled: !!id
  })
  useEffect(() => {
    if (metadata.data?.page.workspace_id)
      activate(metadata.data.page.workspace_id)
  }, [metadata.data?.page.workspace_id, workspaces])
  if (metadata.isLoading) return <Text role="status">Loading page…</Text>
  if (!metadata.data)
    return (
      <Text role="alert">{metadata.error?.message || 'Page unavailable'}</Text>
    )

  const selected = metadata.data
  validateCanvasPage(selected.page.body)

  return (
    <Box
      flex="1"
      minHeight="0"
      overflowY="auto"
      pt="lg"
      px={{ base: 'md', sm: '2xl' }}
    >
      <WorkspaceCanvas
        key={id}
        native={null}
        storage={{
          queryKey: [...options.queryKey, userData?.id, 'content'],
          initialPage: selected.page.body,
          initialDataUpdatedAt: metadata.dataUpdatedAt,
          readOnly: selected.role === 'viewer',
          load: async () => {
            const result = await endpoint.query()
            validateCanvasPage(result.page.body)

            return { page: result.page.body }
          },
          save: async page => {
            const result = await workspaceAPI.workspaces.savePage.mutate({
              id,
              workspace_id: selected.page.workspace_id,
              parent_id: selected.page.parent_id,
              page,
              expected_revision: page.revision
            })
            validateCanvasPage(result.body)

            return { page: result.body }
          },
          onSaved: async () => {
            await Promise.all([
              cache.invalidateQueries(
                { queryKey: workspaceAPI.workspaces.pages.key },
                { throwOnError: true }
              ),
              cache.invalidateQueries(
                {
                  queryKey: [...options.queryKey, userData?.id],
                  exact: true
                },
                { throwOnError: true }
              )
            ])
          }
        }}
        title={selected.page.title}
      />
    </Box>
  )
}
