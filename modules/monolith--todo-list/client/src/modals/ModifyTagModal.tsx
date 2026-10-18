import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { useApiMutation } from '@monolith/api'
import { FormModal, TextField, createDefaultValues } from '@monolith/ui'

import { workspaceAPI } from '@/manifest'

import type { TodoListTag } from '../providers/TodoListProvider'

const schema = z.object({
  name: z.string().min(1, 'Required')
})

function ModifyTagModal({
  data: { type, initialData },
  onClose
}: {
  data: {
    type: 'create' | 'update'
    initialData?: TodoListTag
  }
  onClose: () => void
}) {
  const createMutation = useApiMutation(workspaceAPI.tags.create, {
    action: 'create',
    queryKey: workspaceAPI.key
  })

  const updateMutation = useApiMutation(
    workspaceAPI.tags.update.input({ id: initialData?.id || '' }),
    {
      action: 'update',
      queryKey: workspaceAPI.key
    }
  )

  const form = useForm({
    defaultValues: {
      ...createDefaultValues(schema),
      ...initialData
    },
    resolver: zodResolver(schema)
  })

  return (
    <FormModal
      form={form}
      submissionConfig={{
        template: type,
        handler: async data => {
          await (
            type === 'create' ? createMutation : updateMutation
          ).mutateAsync(data)
        }
      }}
      uiConfig={{
        icon: 'tabler:tag',
        namespace: 'apps.todoList',
        title: `tag.${type}`,
        onClose
      }}
    >
      <TextField
        required
        control={form.control}
        icon="tabler:tag"
        label="tagName"
        name="name"
        placeholder="Tag name"
      />
    </FormModal>
  )
}

export default ModifyTagModal
