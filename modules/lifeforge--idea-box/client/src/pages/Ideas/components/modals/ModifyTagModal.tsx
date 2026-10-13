import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router'
import z from 'zod'

import {
  ColorField,
  FormModal,
  IconField,
  TextField,
  createDefaultValues,
  toast
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'
import type { IdeaBoxTag } from '@/providers/IdeaBoxProvider'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  icon: z.string(),
  color: z.string(),
  container: z.string()
})

function ModifyTagModal({
  data: { type, initialData },
  onClose
}: {
  data: {
    type: 'create' | 'update'
    initialData?: IdeaBoxTag
  }
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()

  const mutation = useMutation(
    (type === 'create'
      ? forgeAPI.tags.create
      : forgeAPI.tags.update.input({ id: initialData?.id || '' })
    ).mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['ideaBox', 'tags'] })
      },
      onError: error => {
        toast.error(`Failed to ${type} tag: ${error.message}`)
      }
    })
  )

  const form = useForm({
    defaultValues: {
      ...createDefaultValues(schema),
      name: initialData?.name || '',
      icon: initialData?.icon || '',
      color: initialData?.color || ''
    },
    resolver: zodResolver(schema)
  })

  return (
    <FormModal
      form={form}
      submissionConfig={{
        template: type,
        handler: async formData => {
          await mutation.mutateAsync({ ...formData, container: id || '' })
        }
      }}
      uiConfig={{
        icon: type === 'create' ? 'tabler:plus' : 'tabler:pencil',
        title: `tag.${type}`,
        namespace: 'apps.ideaBox',
        onClose
      }}
    >
      <TextField
        required
        control={form.control}
        icon="tabler:tag"
        label="tagName"
        name="name"
        placeholder="My tag"
      />
      <IconField control={form.control} label="tagIcon" name="icon" />
      <ColorField control={form.control} label="tagColor" name="color" />
    </FormModal>
  )
}

export default ModifyTagModal
