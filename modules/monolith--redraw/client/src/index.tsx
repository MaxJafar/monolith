import { useAPIEndpoint, useAuth } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'
import { Button, Stack, Text } from '@monolith/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router'

import { workspaceAPI } from '../manifest'
import { Dashboard, type Workspace } from './Dashboard'
import { Editor } from './Editor'
import { EditorProvider } from './EditorProvider'
import './redraw.css'

function ProjectEditor({
  workspace,
  id,
  onBack
}: {
  workspace: Workspace
  id: string
  onBack: () => void
}) {
  const { t } = useModuleTranslation(),
    { userData } = useAuth(),
    endpoint = useAPIEndpoint(),
    client = useQueryClient()

  const options = workspaceAPI.projects.get
    .input({ workspace_id: workspace.id, id })
    .queryOptions({
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      gcTime: 0,
      staleTime: 0
    })
  const queryKey = [...options.queryKey, endpoint, userData?.id]

  const query = useQuery({ ...options, queryKey, retry: false })

  if (query.isPending)
    return (
      <Text p="lg" role="status">
        {t('loading')}
      </Text>
    )
  if (!query.data || query.error)
    return (
      <Stack p="lg" role="alert">
        <Text>{t('errors.projectUnavailable')}</Text>
        <Button
          variant="secondary"
          onClick={() => {
            void query.refetch()
          }}
        >
          retry
        </Button>
        <Button variant="plain" onClick={onBack}>
          back
        </Button>
      </Stack>
    )

  return (
    <EditorProvider
      key={`${endpoint}:${workspace.id}:${id}:${userData?.id}`}
      project={query.data}
      readOnly={workspace.role === 'viewer' || query.data.archived}
      sync={async request => {
        const result = await workspaceAPI.collaboration.sync
          .input({ workspace_id: workspace.id })
          .mutate({ ...request, id })

        if (result.project) {
          client.setQueryData(queryKey, result.project)
          void client.invalidateQueries({
            queryKey: workspaceAPI.projects.list.key
          })
        }

        return result
      }}
    >
      <Editor onBack={onBack} />
    </EditorProvider>
  )
}

export default function Redraw() {
  const { userData } = useAuth(),
    endpoint = useAPIEndpoint(),
    { t } = useModuleTranslation()

  const [params] = useSearchParams()

  const navigate = useNavigate(),
    route = useParams()

  const options = workspaceAPI.workspaces.queryOptions({
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })

  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, endpoint, userData?.id],
    enabled: !!userData?.id
  })

  const workspace = params.get('workspace')
    ? query.data?.find(w => w.id === params.get('workspace'))
    : (query.data?.find(w => w.is_default) ?? query.data?.[0])

  if (query.isPending)
    return (
      <Text p="lg" role="status">
        {t('loading')}
      </Text>
    )
  if (!workspace)
    return (
      <Stack p="lg" role="alert">
        <Text>{t('errors.workspaceUnavailable')}</Text>
        <Button
          variant="secondary"
          onClick={() => {
            void query.refetch()
          }}
        >
          retry
        </Button>
      </Stack>
    )

  const open = (id?: string) => {
    const next = new URLSearchParams(params)
    next.set('workspace', workspace.id)
    if (id) next.set('project', id)
    else next.delete('project')

    navigate(`/redraw?${next}`)
  }
  const projectId = route.projectId ?? params.get('project')

  return projectId ? (
    <ProjectEditor
      key={`${endpoint}:${userData?.id}:${workspace.id}:${projectId}`}
      id={projectId}
      workspace={workspace}
      onBack={() => open()}
    />
  ) : (
    <Dashboard
      key={`${endpoint}:${userData?.id}:${workspace.id}`}
      open={open}
      workspace={workspace}
    />
  )
}
