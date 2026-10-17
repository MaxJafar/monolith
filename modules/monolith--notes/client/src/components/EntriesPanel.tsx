import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import { BlockEditor, Button, CanonicalSource, Stack } from '@monolith/ui'

import { workspaceAPI } from '@/manifest'
import { entriesInput } from '@/models'

import AttachmentControl from './AttachmentControl'
import EntityManager, {
  type Draft,
  type Field,
  type Item
} from './EntityManager'

export default function EntriesPanel() {
  const { t } = useModuleTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const catalog = useQuery(
    workspaceAPI.entries.catalog.queryOptions({
      staleTime: 0,
      refetchOnWindowFocus: true
    })
  )

  const [contentValid, setContentValid] = useState(true)

  function openPage(page: {
    kind: 'document' | 'record' | 'note' | 'redraw'
    id: string
  }) {
    if (page.kind === 'redraw') navigate(`/redraw?project=${page.id}`)
    else if (page.kind === 'note') navigate(`/notes?entry=${page.id}`)
    else
      navigate(
        `/databases?${page.kind === 'document' ? `section=documents&document=${page.id}` : `section=graph&focus=record:${page.id}`}`
      )
  }

  const client = useQueryClient()

  const records = useQuery(
    workspaceAPI.entries.list.queryOptions({
      staleTime: 0,
      refetchOnWindowFocus: true
    })
  )

  const subjectsQuery = useQuery(workspaceAPI.subjects.list.queryOptions())

  const fields: Field[] = [
    { name: 'name', kind: 'text', required: true },
    {
      name: 'type',
      kind: 'select',
      required: true,
      options: ['note', 'folder', 'file'].map(value => ({
        value,
        label: t('options.' + value)
      }))
    },
    { name: 'content', kind: 'area', required: false },
    {
      name: 'subject_id',
      kind: 'select',
      required: true,
      options: (subjectsQuery.data || []).map(record => ({
        value: record.id,
        label: record.title
      }))
    },
    {
      name: 'parent_id',
      kind: 'select',
      required: false,
      options: (records.data || [])
        .filter(record => record.type === 'folder')
        .map(record => ({ value: record.id, label: record.name }))
    }
  ]

  async function save(id: string | undefined, draft: Draft, original?: Item) {
    if (!contentValid) throw new Error(t('invalidBlocks'))

    const body = entriesInput.parse(draft)

    if (id)
      await workspaceAPI.entries.update.input({ id }).mutate({
        ...body,
        expected_updated:
          typeof original?.updated === 'string' ? original.updated : undefined
      })
    else await workspaceAPI.entries.create.mutate(body)
    await client.invalidateQueries({ queryKey: workspaceAPI.key })
  }

  async function remove(id: string) {
    await workspaceAPI.entries.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: workspaceAPI.key })
  }

  return (
    <EntityManager
      key={params.get('entry') ?? 'library'}
      autoEditId={params.get('entry') ?? undefined}
      entity="entries"
      error={records.error}
      extra={item =>
        item.type !== 'folder' ? (
          <Stack gap="sm">
            <Button
              icon="tabler:circles-relation"
              namespace={false}
              variant="plain"
              onClick={() =>
                navigate(`/databases?section=graph&focus=note:${item.id}`)
              }
            >
              {t('knowledgeMap')}
            </Button>
            <AttachmentControl
              file={typeof item.file === 'string' ? item.file : null}
              id={item.id}
            />
          </Stack>
        ) : null
      }
      fields={fields}
      items={records.data || []}
      loading={records.isLoading}
      renderField={(field, draft, onChange, original) =>
        field.name === 'content' && draft.type !== 'folder' ? (
          <CanonicalSource
            key={original?.id ?? 'new'}
            source={original ? { kind: 'note', id: original.id } : undefined}
          >
            <BlockEditor
              key="content"
              pages={catalog.data ?? []}
              value={String(draft.content ?? '')}
              onChange={onChange}
              onOpenPage={openPage}
              onValidityChange={setContentValid}
            />
          </CanonicalSource>
        ) : undefined
      }
      renderValue={(field, item) =>
        field.name === 'content' && item.type !== 'folder' ? (
          <CanonicalSource readOnly source={{ kind: 'note', id: item.id }}>
            <BlockEditor
              readOnly
              pages={catalog.data ?? []}
              value={String(item.content ?? '')}
              onOpenPage={openPage}
            />
          </CanonicalSource>
        ) : undefined
      }
      retry={() => {
        void records.refetch()
      }}
      saveDisabled={!contentValid}
      onRemove={remove}
      onSave={save}
    />
  )
}
