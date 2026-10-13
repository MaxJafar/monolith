import { useQuery, useQueryClient } from '@tanstack/react-query'

import { forgeAPI } from '@/manifest'
import { decksInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function DecksPanel() {
  const client = useQueryClient()
  const records = useQuery(forgeAPI.decks.list.queryOptions())
  const tagsQuery = useQuery(forgeAPI.tags.list.queryOptions())

  const fields: Field[] = [
    { name: 'name', kind: 'text', required: true },
    { name: 'description', kind: 'area', required: false },
    {
      name: 'tag_id',
      kind: 'select',
      required: false,
      options: (tagsQuery.data || []).map(record => ({
        value: record.id,
        label: record.name
      }))
    }
  ]

  async function save(id: string | undefined, draft: Draft) {
    const body = decksInput.parse(draft)

    if (id) await forgeAPI.decks.update.input({ id }).mutate(body)
    else await forgeAPI.decks.create.mutate(body)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  async function remove(id: string) {
    await forgeAPI.decks.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  return (
    <EntityManager
      entity="decks"
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
