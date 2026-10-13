import { useQuery, useQueryClient } from '@tanstack/react-query'

import { forgeAPI } from '@/manifest'
import { listsInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function ListsPanel() {
  const client = useQueryClient()
  const records = useQuery(forgeAPI.lists.list.queryOptions())

  const fields: Field[] = [
    { name: 'name', kind: 'text', required: true },
    { name: 'description', kind: 'area', required: false },
    { name: 'color', kind: 'text', required: false, default: '#f97316' },
    { name: 'icon', kind: 'text', required: false, default: 'tabler:folder' }
  ]

  async function save(id: string | undefined, draft: Draft) {
    const body = listsInput.parse(draft)

    if (id) await forgeAPI.lists.update.input({ id }).mutate(body)
    else await forgeAPI.lists.create.mutate(body)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  async function remove(id: string) {
    await forgeAPI.lists.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  return (
    <EntityManager
      entity="lists"
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
