import { useQuery, useQueryClient } from '@tanstack/react-query'

import { forgeAPI } from '@/manifest'
import { tasksInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function TasksPanel() {
  const client = useQueryClient()
  const records = useQuery(forgeAPI.tasks.list.queryOptions())
  const columnsQuery = useQuery(forgeAPI.columns.list.queryOptions())

  const fields: Field[] = [
    { name: 'title', kind: 'text', required: true },
    { name: 'content', kind: 'area', required: false },
    {
      name: 'column_id',
      kind: 'select',
      required: true,
      options: (columnsQuery.data || []).map(record => ({
        value: record.id,
        label: record.name
      }))
    },
    { name: 'completed', kind: 'boolean', required: false }
  ]

  async function save(id: string | undefined, draft: Draft) {
    const body = tasksInput.parse(draft)

    if (id) await forgeAPI.tasks.update.input({ id }).mutate(body)
    else await forgeAPI.tasks.create.mutate(body)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  async function remove(id: string) {
    await forgeAPI.tasks.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  return (
    <EntityManager
      entity="tasks"
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
