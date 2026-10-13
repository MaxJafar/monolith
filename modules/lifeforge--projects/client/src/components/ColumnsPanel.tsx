import { useQuery, useQueryClient } from '@tanstack/react-query'

import { forgeAPI } from '@/manifest'
import { columnsInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function ColumnsPanel() {
  const client = useQueryClient()
  const records = useQuery(forgeAPI.columns.list.queryOptions())
  const entriesQuery = useQuery(forgeAPI.entries.list.queryOptions())

  const fields: Field[] = [
    { name: 'name', kind: 'text', required: true },
    { name: 'color', kind: 'text', required: false, default: '#f97316' },
    { name: 'icon', kind: 'text', required: false, default: 'tabler:folder' },
    {
      name: 'project_id',
      kind: 'select',
      required: true,
      options: (entriesQuery.data || []).map(record => ({
        value: record.id,
        label: record.name
      }))
    }
  ]

  async function save(id: string | undefined, draft: Draft) {
    const body = columnsInput.parse(draft)

    if (id) await forgeAPI.columns.update.input({ id }).mutate(body)
    else await forgeAPI.columns.create.mutate(body)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  async function remove(id: string) {
    await forgeAPI.columns.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  return (
    <EntityManager
      entity="columns"
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
