import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useAuth } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Flex, Stack, Text } from '@monolith/ui'

import { workspaceAPI } from '@/manifest'

import type { KnowledgeLibrary as Library } from '../../../knowledgeLibraryShared'
import { LibraryCollectionForm } from './LibraryCollectionForm'
import { LibrarySearch } from './LibrarySearch'
import { LibrarySourceForm } from './LibrarySourceForm'
import { SelectInput } from './SelectInput'

export function KnowledgeLibrary() {
  const { t } = useModuleTranslation(),
    { userData } = useAuth(),
    [params, setParams] = useSearchParams()
  const options = workspaceAPI.workspaces.list.queryOptions()
  const workspaces = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id]
  })
  const workspace = params.get('workspace') ?? ''

  return (
    <Stack gap="lg" minWidth="0">
      <Box maxWidth="28rem">
        <SelectInput
          label={t('workspace')}
          options={[
            { value: '', label: t('library.chooseWorkspace') },
            ...(workspaces.data ?? []).map(item => ({
              value: item.id,
              label: item.name
            }))
          ]}
          value={workspace}
          onChange={id =>
            setParams({ section: 'library', ...(id ? { workspace: id } : {}) })
          }
        />
      </Box>
      {workspaces.error && (
        <Text color="dangerous" role="alert">
          {workspaces.error.message}
        </Text>
      )}
      {workspace ? (
        <WorkspaceLibrary
          key={`${workspace}:${userData?.id}:${params.get('collection') ?? ''}`}
          workspace={workspace}
        />
      ) : (
        <Text color="muted">{t('library.workspaceHelp')}</Text>
      )}
    </Stack>
  )
}

function WorkspaceLibrary({ workspace }: { workspace: string }) {
  const { t } = useModuleTranslation(),
    { userData } = useAuth(),
    [params, setParams] = useSearchParams(),
    cache = useQueryClient()
  const options = workspaceAPI.knowledgeLibrary.snapshot
    .input({ workspace_id: workspace })
    .queryOptions()
  const queryKey = [...options.queryKey, userData?.id]
  const query = useQuery({
    ...options,
    queryKey,
    staleTime: 0,
    refetchOnWindowFocus: true
  })
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [warning, setWarning] = useState(''),
    [form, setForm] = useState<'collection' | 'edit' | 'source' | null>(null),
    [editing, setEditing] = useState<Library['collections'][number]>(),
    [removing, setRemoving] = useState(false),
    [revision, setRevision] = useState(0)

  const active = useRef(true)
  // Read at each asynchronous boundary; navigation may unmount this origin during an await.

  const isActive = () => active.current

  useEffect(() => {
    active.current = true

    return () => {
      active.current = false
    }
  }, [])
  const collectionId = params.get('collection') ?? ''
  const collection = query.data?.collections.find(
    item => item.id === collectionId
  )
  const readOnly = !query.data || query.data.role === 'viewer'
  const sources = (query.data?.sources ?? []).filter(
    item => !collectionId || item.collection_id === collectionId
  )
  const href = (id = '') =>
    `/databases?${new URLSearchParams({
      section: 'library',
      workspace,
      ...(id ? { collection: id } : {})
    })}`

  async function mutate(action: () => Promise<unknown>) {
    if (busy || readOnly || !isActive()) return false
    setBusy(true)
    setError('')
    setWarning('')

    try {
      await action()
      if (!isActive()) return false
      setRevision(value => value + 1)

      // The mutation has committed. A metadata refresh failure must not invite a duplicate import.
      try {
        await cache.invalidateQueries(
          { queryKey, exact: true },
          { throwOnError: true }
        )
      } catch {
        if (isActive()) setWarning(t('library.refreshWarning'))
      }

      return isActive()
    } catch (cause) {
      if (isActive())
        setError(cause instanceof Error ? cause.message : String(cause))

      return false
    } finally {
      if (isActive()) setBusy(false)
    }
  }

  if (!query.data)
    return (
      <Stack gap="md">
        {query.isFetching && <Text role="status">{t('loading')}</Text>}
        {query.error && (
          <Text color="dangerous" role="alert">
            {query.error.message}
          </Text>
        )}
        {query.error && (
          <Button
            namespace={false}
            variant="secondary"
            onClick={() => void query.refetch()}
          >
            {t('buttons.retry')}
          </Button>
        )}
      </Stack>
    )

  return (
    <Flex
      align="start"
      direction={{ base: 'column', lg: 'row' }}
      gap="xl"
      minWidth="0"
    >
      <Stack
        aria-label={t('library.collections')}
        as="nav"
        flexShrink="0"
        gap="xs"
        width={{ base: '100%', lg: '15rem' }}
      >
        <Text
          as="h2"
          className="zillion-database-collection-heading"
          color="muted"
          mb="sm"
        >
          {t('library.collections')}
        </Text>
        <Button
          aria-current={!collectionId ? 'page' : undefined}
          as={Link}
          icon="tabler:books"
          justify="start"
          namespace={false}
          to={href()}
          variant={collectionId ? 'plain' : 'secondary'}
        >
          {t('library.allCollections')}
        </Button>
        {query.data.collections.map(item => (
          <Button
            key={item.id}
            aria-current={collectionId === item.id ? 'page' : undefined}
            as={Link}
            icon="tabler:folder"
            justify="start"
            namespace={false}
            to={href(item.id)}
            variant={collectionId === item.id ? 'secondary' : 'plain'}
          >
            <Text className="monolith-library-wrap">{item.name}</Text>
            <Text color="muted" size="sm">
              {item.source_count}
            </Text>
          </Button>
        ))}
        {!readOnly && (
          <Button
            disabled={busy || !!form}
            icon="tabler:plus"
            justify="start"
            namespace={false}
            variant="plain"
            onClick={() => setForm('collection')}
          >
            {t('library.newCollection')}
          </Button>
        )}
      </Stack>
      <Stack
        flex="1"
        gap="lg"
        minWidth="0"
        width={{ base: '100%', lg: 'auto' }}
      >
        <Flex align="start" gap="md" justify="between" wrap="wrap">
          <Stack flex="1" gap="sm" minWidth="0">
            <Text as="h2" className="monolith-library-title">
              {collection?.name ?? t('library.title')}
            </Text>
            <Text className="monolith-library-wrap" color="muted">
              {collection?.description || t('library.help')}
            </Text>
          </Stack>
          {collection && !readOnly && (
            <Flex gap="sm" wrap="wrap">
              <Button
                disabled={busy || !!form}
                icon="tabler:edit"
                namespace={false}
                variant="secondary"
                onClick={() => {
                  setEditing(collection)
                  setForm('edit')
                }}
              >
                {t('library.editCollection')}
              </Button>
              <Button
                disabled={busy || !!form}
                icon="tabler:trash"
                namespace={false}
                variant="plain"
                onClick={() => setRemoving(true)}
              >
                {t('buttons.delete')}
              </Button>
            </Flex>
          )}
        </Flex>
        {readOnly && (
          <Text color="muted" size="sm">
            {t('library.viewer')}
          </Text>
        )}
        {(error || query.error) && (
          <Text color="dangerous" role="alert">
            {error || query.error?.message}
          </Text>
        )}
        {warning && <Text role="status">{warning}</Text>}
        {query.error && (
          <Button
            namespace={false}
            variant="secondary"
            onClick={() => void query.refetch()}
          >
            {t('buttons.retry')}
          </Button>
        )}
        {collectionId && !collection && (
          <Text role="status">{t('library.collectionUnavailable')}</Text>
        )}
        <>
          {(form === 'collection' || (form === 'edit' && editing)) && (
            <LibraryCollectionForm
              key={form === 'edit' ? collectionId : 'new'}
              busy={busy}
              initial={form === 'edit' ? editing : undefined}
              readOnly={readOnly}
              onCancel={() => setForm(null)}
              onSave={async values => {
                let id = collectionId

                const success = await mutate(async () => {
                  if (form === 'edit')
                    await workspaceAPI.knowledgeLibrary.updateCollection
                      .input({ workspace_id: workspace, id })
                      .mutate(values)
                  else
                    id = (
                      await workspaceAPI.knowledgeLibrary.createCollection
                        .input({ workspace_id: workspace })
                        .mutate(values)
                    ).id
                })

                return success ? id : null
              }}
              onSaved={id => {
                setForm(null)
                setParams({ section: 'library', workspace, collection: id })
              }}
            />
          )}
          {removing && collection && !readOnly && (
            <Stack
              bg={{ base: 'bg-100', dark: 'bg-900' }}
              gap="md"
              p="md"
              r="md"
              role="alert"
            >
              <Text>{t('library.confirmCollectionRemoval')}</Text>
              <Flex gap="sm" wrap="wrap">
                <Button
                  disabled={busy}
                  namespace={false}
                  variant="secondary"
                  onClick={() => setRemoving(false)}
                >
                  {t('buttons.cancel')}
                </Button>
                <Button
                  dangerous
                  loading={busy}
                  namespace={false}
                  onClick={async () => {
                    if (
                      await mutate(() =>
                        workspaceAPI.knowledgeLibrary.removeCollection
                          .input({
                            workspace_id: workspace,
                            id: collection.id
                          })
                          .mutate(undefined)
                      )
                    ) {
                      setRemoving(false)
                      setParams({ section: 'library', workspace })
                    }
                  }}
                >
                  {t('buttons.delete')}
                </Button>
              </Flex>
            </Stack>
          )}
          <LibrarySearch
            key={`${collectionId}:${revision}`}
            collectionId={collectionId}
            disabled={busy || (!!collectionId && !collection)}
            workspace={workspace}
          />
          <Flex align="center" gap="sm" justify="between" wrap="wrap">
            <Text as="h3" weight="semibold">
              {t('library.sourcesCount', { count: sources.length })}
            </Text>
            {!readOnly && (
              <Button
                disabled={busy || !!form || !query.data.collections.length}
                icon="tabler:plus"
                namespace={false}
                variant="secondary"
                onClick={() => setForm('source')}
              >
                {t('library.addSource')}
              </Button>
            )}
          </Flex>
          {form === 'source' && (
            <LibrarySourceForm
              busy={busy}
              collectionId={collectionId}
              library={query.data}
              readOnly={readOnly}
              onCancel={() => setForm(null)}
              onSave={async input => {
                const success = await mutate(() =>
                  workspaceAPI.knowledgeLibrary.addSource
                    .input({ workspace_id: workspace })
                    .mutate(input)
                )

                if (success) setForm(null)

                return success
              }}
            />
          )}
          {!sources.length && (
            <Text color="muted">{t('library.noSources')}</Text>
          )}
          <Stack gap="sm">
            {sources.map(source => (
              <LibrarySourceRow
                key={source.id}
                busy={busy}
                collection={
                  query.data!.collections.find(
                    item => item.id === source.collection_id
                  )?.name ?? ''
                }
                readOnly={readOnly}
                source={source}
                onRemove={() =>
                  mutate(() =>
                    workspaceAPI.knowledgeLibrary.removeSource
                      .input({ workspace_id: workspace, id: source.id })
                      .mutate(undefined)
                  )
                }
              />
            ))}
          </Stack>
        </>
      </Stack>
    </Flex>
  )
}

function LibrarySourceRow({
  source,
  collection,
  readOnly,
  busy,
  onRemove
}: {
  source: Library['sources'][number]
  collection: string
  readOnly: boolean
  busy: boolean
  onRemove: () => Promise<boolean>
}) {
  const { t } = useModuleTranslation()
  const [confirm, setConfirm] = useState(false)

  return (
    <Stack
      bg={{ base: 'bg-100', dark: 'bg-900' }}
      gap="sm"
      minWidth="0"
      p="md"
      r="md"
    >
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Stack flex="1" gap="xs" minWidth="0">
          <Text className="monolith-library-wrap" weight="medium">
            {source.title}
          </Text>
          <Text className="monolith-library-wrap" color="muted" size="sm">
            {collection} · {t(`library.kinds.${source.kind}`)} ·{' '}
            {t('library.sourceSize', {
              characters: source.characters.toLocaleString(),
              count: source.chunks
            })}
          </Text>
        </Stack>
        <Flex gap="sm" wrap="wrap">
          {source.href && (
            <Button
              as={Link}
              icon="tabler:arrow-up-right"
              namespace={false}
              to={source.href}
              variant="plain"
            >
              {t('library.openSource')}
            </Button>
          )}
          {!readOnly && (
            <Button
              disabled={busy}
              namespace={false}
              variant="plain"
              onClick={() => setConfirm(true)}
            >
              {t('library.removeSource')}
            </Button>
          )}
        </Flex>
      </Flex>
      {confirm && !readOnly && (
        <Stack gap="sm" role="alert">
          <Text size="sm">{t('library.confirmSourceRemoval')}</Text>
          <Flex gap="sm" wrap="wrap">
            <Button
              disabled={busy}
              namespace={false}
              variant="secondary"
              onClick={() => setConfirm(false)}
            >
              {t('buttons.cancel')}
            </Button>
            <Button
              dangerous
              loading={busy}
              namespace={false}
              onClick={() => void onRemove()}
            >
              {t('library.removeSource')}
            </Button>
          </Flex>
        </Stack>
      )}
    </Stack>
  )
}
