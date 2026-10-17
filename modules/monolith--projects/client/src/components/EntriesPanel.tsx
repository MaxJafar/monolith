import { useQuery, useQueryClient } from '@tanstack/react-query'

import { workspaceAPI } from '@/manifest'
import { entriesInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function EntriesPanel() {
  const client = useQueryClient()
  const records = useQuery(workspaceAPI.entries.list.queryOptions())
  const categoriesQuery = useQuery(workspaceAPI.categories.list.queryOptions())
  const statusesQuery = useQuery(workspaceAPI.statuses.list.queryOptions())
  const visibilitiesQuery = useQuery(workspaceAPI.visibilities.list.queryOptions())
  const technologiesQuery = useQuery(workspaceAPI.technologies.list.queryOptions())

  const fields: Field[] = [
    { name: 'name', kind: 'text', required: true },
    { name: 'description', kind: 'area', required: false },
    { name: 'color', kind: 'text', required: false, default: '#f97316' },
    { name: 'icon', kind: 'text', required: false, default: 'tabler:folder' },
    {
      name: 'category_id',
      kind: 'select',
      required: false,
      options: (categoriesQuery.data || []).map(record => ({
        value: record.id,
        label: record.name
      }))
    },
    {
      name: 'status_id',
      kind: 'select',
      required: false,
      options: (statusesQuery.data || []).map(record => ({
        value: record.id,
        label: record.name
      }))
    },
    {
      name: 'visibility_id',
      kind: 'select',
      required: false,
      options: (visibilitiesQuery.data || []).map(record => ({
        value: record.id,
        label: record.name
      }))
    },
    {
      name: 'technology_ids',
      kind: 'multi',
      required: false,
      options: (technologiesQuery.data || []).map(record => ({
        value: record.id,
        label: record.name
      }))
    }
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
