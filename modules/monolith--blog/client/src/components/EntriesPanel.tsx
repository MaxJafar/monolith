import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useModuleTranslation } from '@monolith/localization'

import { workspaceAPI } from '@/manifest'
import { entriesInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function EntriesPanel() {
  const { t } = useModuleTranslation()
  const client = useQueryClient()
  const records = useQuery(workspaceAPI.entries.list.queryOptions())
  const categoriesQuery = useQuery(workspaceAPI.categories.list.queryOptions())

  const fields: Field[] = [
    { name: 'title', kind: 'text', required: true },
    { name: 'content', kind: 'blocks', required: false },
    { name: 'excerpt', kind: 'area', required: false },
    {
      name: 'visibility',
      kind: 'select',
      required: true,
      options: ['private', 'public', 'unlisted'].map(value => ({
        value,
        label: t('options.' + value)
      }))
    },
    {
      name: 'category_id',
      kind: 'select',
      required: false,
      options: (categoriesQuery.data || []).map(record => ({
        value: record.id,
        label: record.name
      }))
    },
    { name: 'labels', kind: 'text', required: false },
    { name: 'featured_image', kind: 'text', required: false }
  ]

  async function save(id: string | undefined, draft: Draft) {
    const body = entriesInput.parse(draft)

    if (id) await workspaceAPI.entries.update.input({ id }).mutate(body)
    else await workspaceAPI.entries.create.mutate(body)
    await client.invalidateQueries({ queryKey: workspaceAPI.key })
  }

  async function remove(id: string) {
    await workspaceAPI.entries.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: workspaceAPI.key })
  }

  return (
    <EntityManager
      entity="entries"
      error={records.error}
      fields={fields}
      items={records.data || []}
      loading={records.isLoading}
      retry={() => {
        void records.refetch()
      }}
      onRemove={remove}
      onSave={save}
    />
  )
}
