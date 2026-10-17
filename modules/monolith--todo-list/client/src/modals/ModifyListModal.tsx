import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { useApiMutation } from '@monolith/api'
import {
  ColorField,
  FormModal,
  IconField,
  TextField,
  createDefaultValues
} from '@monolith/ui'

import { workspaceAPI } from '@/manifest'

import type { TodoListList } from '../providers/TodoListProvider'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  icon: z.string().min(1, 'Required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
})

function ModifyListModal({
  data: { type, initialData },
  onClose
}: {
  data: {
    type: 'create' | 'update'
    initialData?: TodoListList
  }
  onClose: () => void
}) {
  const createMutation = useApiMutation(workspaceAPI.lists.create, {
    action: 'create',
    queryKey: workspaceAPI.key
  })

  const updateMutation = useApiMutation(
    workspaceAPI.lists.update.input({ id: initialData?.id || '' }),
    {
      action: 'update',
      queryKey: workspaceAPI.key
    }
  )

  const form = useForm({
    defaultValues: {
      ...createDefaultValues(schema),
      ...(initialData ?? { color: '#FFFFFF' })
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
        icon: type === 'create' ? 'tabler:plus' : 'tabler:pencil',
        namespace: 'apps.todoList',
        title: `list.${type}`,
        onClose
      }}
    >
      <TextField
        required
        control={form.control}
        icon="tabler:list"
        label="listName"
        name="name"
        placeholder="List name"
      />
      <IconField required control={form.control} label="listIcon" name="icon" />
      <ColorField
        required
        control={form.control}
        label="listColor"
        name="color"
      />
    </FormModal>
  )
}

export default ModifyListModal
