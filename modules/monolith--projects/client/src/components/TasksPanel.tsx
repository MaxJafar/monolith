import { useQuery, useQueryClient } from '@tanstack/react-query'

import { workspaceAPI } from '@/manifest'
import { tasksInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function TasksPanel() {
  const client = useQueryClient()
  const records = useQuery(workspaceAPI.tasks.list.queryOptions())
  const columnsQuery = useQuery(workspaceAPI.columns.list.queryOptions())

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

    if (id) await workspaceAPI.tasks.update.input({ id }).mutate(body)
    else await workspaceAPI.tasks.create.mutate(body)
    await client.invalidateQueries({ queryKey: workspaceAPI.key })
  }

  async function remove(id: string) {
    await workspaceAPI.tasks.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: workspaceAPI.key })
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
