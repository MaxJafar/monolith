import { useQuery, useQueryClient } from '@tanstack/react-query'

import { forgeAPI } from '@/manifest'
import { cardsInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function CardsPanel() {
  const client = useQueryClient()
  const records = useQuery(forgeAPI.cards.list.queryOptions())
  const decksQuery = useQuery(forgeAPI.decks.list.queryOptions())

  const fields: Field[] = [
    { name: 'question', kind: 'area', required: true },
    { name: 'answer', kind: 'area', required: true },
    {
      name: 'deck_id',
      kind: 'select',
      required: true,
      options: (decksQuery.data || []).map(record => ({
        value: record.id,
        label: record.name
      }))
    }
  ]

  async function save(id: string | undefined, draft: Draft) {
    const body = cardsInput.parse(draft)

    if (id) await forgeAPI.cards.update.input({ id }).mutate(body)
    else await forgeAPI.cards.create.mutate(body)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  async function remove(id: string) {
    await forgeAPI.cards.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  return (
    <EntityManager
      entity="cards"
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
