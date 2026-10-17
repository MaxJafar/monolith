import { useQuery, useQueryClient } from '@tanstack/react-query'

import { workspaceAPI } from '@/manifest'
import { subjectsInput } from '@/models'

import EntityManager, { type Draft, type Field } from './EntityManager'

export default function SubjectsPanel() {
  const client = useQueryClient()
  const records = useQuery(workspaceAPI.subjects.list.queryOptions())
  const workspacesQuery = useQuery(workspaceAPI.workspaces.list.queryOptions())

  const fields: Field[] = [
    { name: 'title', kind: 'text', required: true },
    { name: 'description', kind: 'area', required: false },
    { name: 'icon', kind: 'text', required: false, default: 'tabler:folder' },
    {
      name: 'workspace_id',
      kind: 'select',
      required: true,
      options: (workspacesQuery.data || []).map(record => ({
        value: record.id,
        label: record.name
      }))
    }
  ]

  async function save(id: string | undefined, draft: Draft) {
    const body = subjectsInput.parse(draft)

    if (id) await workspaceAPI.subjects.update.input({ id }).mutate(body)
    else await workspaceAPI.subjects.create.mutate(body)
    await client.invalidateQueries({ queryKey: workspaceAPI.key })
  }

  async function remove(id: string) {
    await workspaceAPI.subjects.remove.input({ id }).mutate(undefined)
    await client.invalidateQueries({ queryKey: workspaceAPI.key })
  }

  return (
    <EntityManager
      entity="subjects"
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
