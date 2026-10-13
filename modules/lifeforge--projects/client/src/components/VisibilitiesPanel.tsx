import { useQuery, useQueryClient } from '@tanstack/react-query'

import { forgeAPI } from '@/manifest'
import { visibilitiesInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function VisibilitiesPanel() {
  const client = useQueryClient()
  const records = useQuery(forgeAPI.visibilities.list.queryOptions())

  const fields: Field[] = [
    { name: 'name', kind: 'text', required: true },
    { name: 'icon', kind: 'text', required: false, default: 'tabler:folder' }
  ]

  async function save(id: string | undefined, draft: Draft) {
    const body = visibilitiesInput.parse(draft)

    if (id) await forgeAPI.visibilities.update.input({ id }).mutate(body)
    else await forgeAPI.visibilities.create.mutate(body)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  async function remove(id: string) {
    await forgeAPI.visibilities.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: forgeAPI.key })
  }

  return (
    <EntityManager
      entity="visibilities"
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
