import { useAuth } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'
import { Button, ChoiceSelect, Flex, Stack, Text } from '@monolith/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useDatabases } from '@/DatabaseProvider'
import { workspaceAPI } from '@/manifest'

export function WorkspacePagesBrowser() {
  const { t } = useModuleTranslation(),
    { userData } = useAuth(),
    { readOnly } = useDatabases(),
    [params] = useSearchParams(),
    navigate = useNavigate(),
    cache = useQueryClient()
  const workspace = params.get('workspace') ?? ''
  const endpoint = workspaceAPI.workspaces.pages.input({ workspace_id: workspace }),
    options = endpoint.queryOptions()
  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id]
  })
  const [title, setTitle] = useState(''),
    [parent, setParent] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const pages =
    query.data?.filter(page => page.route_key.startsWith('/page/')) ?? []
  async function create() {
    setBusy(true)
    setError('')
    try {
      const page = await workspaceAPI.workspaces.createPage
        .input({ workspace_id: workspace })
        .mutate({ title, parent_id: parent || null })
      await cache.invalidateQueries({ queryKey: workspaceAPI.workspaces.pages.key })
      navigate(`/page/${page.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Stack gap="lg">
      <Text as="h2">{t('sections.documents')}</Text>
      {!readOnly && (
        <Flex gap="sm" wrap="wrap">
          <input
            aria-label={t('inputs.recordTitle')}
            placeholder={t('inputs.recordTitle')}
            value={title}
            onChange={event => setTitle(event.target.value)}
          />
          <ChoiceSelect
            label={t('parentPage')}
            value={parent}
            onChange={setParent}
            options={[
              { value: '', label: t('topLevelPage') },
              ...pages.map(page => ({ value: page.id, label: page.title }))
            ]}
          />
          <Button
            namespace={false}
            disabled={!title.trim()}
            loading={busy}
            onClick={() => void create()}
          >
            {t('docs.create')}
          </Button>
        </Flex>
      )}
      {(error || query.error) && (
        <Text role="alert" color="dangerous">
          {error || query.error?.message}
        </Text>
      )}
      {pages.map(page => (
        <Flex key={page.id} align="center" justify="between" gap="sm">
          <Button
            as={Link}
            to={`/page/${page.id}`}
            icon={page.icon}
            namespace={false}
            justify="start"
            variant="plain"
          >
            {page.title}
          </Button>
          <Text size="sm" color="muted">
            {page.parent_id
              ? pages.find(parent => parent.id === page.parent_id)?.title
              : t('topLevelPage')}
          </Text>
        </Flex>
      ))}
      {query.isLoading && <Text role="status">{t('loading')}</Text>}
    </Stack>
  )
}
