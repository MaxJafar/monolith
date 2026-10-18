import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'

import { useAPIEndpoint, useAuth } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'
import { Button, Stack, Text } from '@monolith/ui'

import { workspaceAPI } from '../manifest'
import { AutomationProvider } from './AutomationProvider'
import { Dashboard } from './Dashboard'
import { Editor } from './Editor'
import './automations.css'

function WorkspaceAutomations({
  workspace,
  readOnly,
  identity
}: {
  workspace: string
  readOnly: boolean
  identity: string
}) {
  const { t } = useModuleTranslation(),
    [params, setParams] = useSearchParams()
  const options = workspaceAPI.flows.list
    .input({ workspace_id: workspace })
    .queryOptions({ refetchOnWindowFocus: false })
  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, identity]
  })
  const id = params.get('workflow'),
    flow = query.data?.find(value => value.id === id)
  const open = (id?: string) => {
    const next = new URLSearchParams(params)
    next.set('workspace', workspace)
    if (id) next.set('workflow', id)
    else next.delete('workflow')
    setParams(next)
  }
  if (query.isPending)
    return (
      <Text p="lg" role="status">
        {t('loading')}
      </Text>
    )
  if (query.error)
    return (
      <Stack p="lg" role="alert">
        <Text>{query.error.message}</Text>
        <Button onClick={() => void query.refetch()}>retry</Button>
      </Stack>
    )
  if (id && !flow)
    return (
      <Stack p="lg">
        <Text>{t('workflowUnavailable')}</Text>
        <Button onClick={() => open()}>back</Button>
        <Button onClick={() => void query.refetch()}>retry</Button>
      </Stack>
    )
  if (flow)
    return (
      <AutomationProvider key={flow.id} initial={flow} readOnly={readOnly}>
        <Editor onBack={() => open()} />
      </AutomationProvider>
    )
  return (
    <Dashboard
      workflows={query.data ?? []}
      workspace={workspace}
      readOnly={readOnly}
      open={id => {
        void query.refetch().then(() => open(id))
      }}
    />
  )
}
export default function Automations() {
  const { t } = useModuleTranslation(),
    { userData } = useAuth(),
    endpoint = useAPIEndpoint(),
    [params] = useSearchParams()
  const options = workspaceAPI.workspaces.queryOptions({
    refetchOnWindowFocus: true
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
        <Text>{t('workspaceUnavailable')}</Text>
        <Button onClick={() => void query.refetch()}>retry</Button>
      </Stack>
    )
  const identity = `${endpoint}:${userData?.id}:${workspace.id}`
  return (
    <WorkspaceAutomations
      key={identity}
      identity={identity}
      workspace={workspace.id}
      readOnly={workspace.role === 'viewer'}
    />
  )
}
