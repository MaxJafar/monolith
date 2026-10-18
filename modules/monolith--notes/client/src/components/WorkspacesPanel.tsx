import { useQuery, useQueryClient } from '@tanstack/react-query'

import { workspaceAPI } from '@/manifest'
import { workspacesInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function WorkspacesPanel() {
  const client = useQueryClient()
  const records = useQuery(workspaceAPI.workspaces.list.queryOptions())

  const fields: Field[] = [
    { name: 'name', kind: 'text', required: true },
    { name: 'icon', kind: 'text', required: false, default: 'tabler:folder' }
  ]

  async function save(id: string | undefined, draft: Draft) {
    const body = workspacesInput.parse(draft)

    if (id) await workspaceAPI.workspaces.update.input({ id }).mutate(body)
    else await workspaceAPI.workspaces.create.mutate(body)
    await client.invalidateQueries({ queryKey: workspaceAPI.key })
  }

  async function remove(id: string) {
    await workspaceAPI.workspaces.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: workspaceAPI.key })
  }

  return (
    <EntityManager
      entity="workspaces"
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
