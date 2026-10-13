import { useQuery, useQueryClient } from '@tanstack/react-query'

import { forgeAPI } from '@/manifest'
import { technologiesInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function TechnologiesPanel() {
  const client = useQueryClient()
  const records = useQuery(forgeAPI.technologies.list.queryOptions())

  const fields: Field[] = [
    { name: 'name', kind: 'text', required: true },
    { name: 'icon', kind: 'text', required: false, default: 'tabler:folder' }
  ]

  async function save(id: string | undefined, draft: Draft) {
    const body = technologiesInput.parse(draft)

    if (id) await forgeAPI.technologies.update.input({ id }).mutate(body)
    else await forgeAPI.technologies.create.mutate(body)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  async function remove(id: string) {
    await forgeAPI.technologies.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  return (
    <EntityManager
      entity="technologies"
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
