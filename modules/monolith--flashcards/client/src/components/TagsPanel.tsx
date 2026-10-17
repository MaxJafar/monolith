import { useQuery, useQueryClient } from '@tanstack/react-query'

import { workspaceAPI } from '@/manifest'
import { tagsInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function TagsPanel() {
  const client = useQueryClient()
  const records = useQuery(workspaceAPI.tags.list.queryOptions())

  const fields: Field[] = [
    { name: 'name', kind: 'text', required: true },
    { name: 'color', kind: 'text', required: false, default: '#f97316' }
  ]

  async function save(id: string | undefined, draft: Draft) {
    const body = tagsInput.parse(draft)

    if (id) await workspaceAPI.tags.update.input({ id }).mutate(body)
    else await workspaceAPI.tags.create.mutate(body)
    await client.invalidateQueries({ queryKey: workspaceAPI.key })
  }

  async function remove(id: string) {
    await workspaceAPI.tags.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: workspaceAPI.key })
  }

  return (
    <EntityManager
      entity="tags"
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
