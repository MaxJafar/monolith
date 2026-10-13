import { useQuery, useQueryClient } from '@tanstack/react-query'

import { forgeAPI } from '@/manifest'
import { entriesInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function EntriesPanel() {
  const client = useQueryClient()
  const records = useQuery(forgeAPI.entries.list.queryOptions())
  const listsQuery = useQuery(forgeAPI.lists.list.queryOptions())

  const fields: Field[] = [
    { name: 'name', kind: 'text', required: true },
    { name: 'url', kind: 'text', required: false },
    { name: 'price', kind: 'number', required: false },
    {
      name: 'list_id',
      kind: 'select',
      required: true,
      options: (listsQuery.data || []).map(record => ({
        value: record.id,
        label: record.name
      }))
    },
    { name: 'image', kind: 'text', required: false },
    { name: 'bought', kind: 'boolean', required: false }
  ]

  async function save(id: string | undefined, draft: Draft) {
    const body = entriesInput.parse(draft)

    if (id) await forgeAPI.entries.update.input({ id }).mutate(body)
    else await forgeAPI.entries.create.mutate(body)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  async function remove(id: string) {
    await forgeAPI.entries.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
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
