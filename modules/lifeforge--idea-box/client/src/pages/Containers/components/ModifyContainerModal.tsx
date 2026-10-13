import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import z from 'zod'

import {
  ColorField,
  FileField,
  FormModal,
  IconField,
  TextField,
  convertFormFileFieldData,
  createDefaultValues,
  fileValueSchema,
  getFormFileFieldInitialData,
  toast
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'
import type { IdeaBoxContainer } from '@/providers/IdeaBoxProvider'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  icon: z.string().min(1, 'Icon is required'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color'),
  cover: fileValueSchema
})

function ModifyContainerModal({
  data: { type, initialData },
  onClose
}: {
  data: {
    type: 'create' | 'update'
    initialData?: IdeaBoxContainer
  }
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation(
    (type === 'create'
      ? forgeAPI.containers.create
      : forgeAPI.containers.update.input({
          id: initialData?.id || ''
        })
    ).mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['ideaBox', 'containers']
        })
      },
      onError: () => {
        toast.error(
          `Failed to ${type === 'create' ? 'create' : 'update'} container`
        )
      }
    })
  )

  const imageGenAPIKeyExistsQuery = useQuery(
    forgeAPI.checkAPIKeys({ keys: 'openai' }).queryOptions()
  )

  const form = useForm({
    defaultValues: {
      ...createDefaultValues(schema),
      name: initialData?.name || '',
      icon: initialData?.icon || '',
      color: initialData?.color || '',
      cover: getFormFileFieldInitialData(
        forgeAPI,
        initialData,
        initialData?.cover
      )
    },
    resolver: zodResolver(schema)
  })

  return (
    <FormModal
      form={form}
      submissionConfig={{
        template: type,
        handler: async formData => {
          await mutation.mutateAsync({
            ...formData,
            cover: convertFormFileFieldData(formData.cover)
          })
        }
      }}
      uiConfig={{
        icon: type === 'create' ? 'tabler:plus' : 'tabler:pencil',
        title: `container.${type}`,
        namespace: 'apps.ideaBox',
        onClose
      }}
    >
      <TextField
        required
        control={form.control}
        icon="tabler:cube"
        label="containerName"
        name="name"
        placeholder="My container"
      />
      <IconField
        required
        control={form.control}
        label="containerIcon"
        name="icon"
      />
      <ColorField
        required
        control={form.control}
        label="containerColor"
        name="color"
      />
      <FileField
        control={form.control}
        icon="tabler:photo"
        label="coverImage"
        name="cover"
        sources={{
          pixabay: true,
          url: true,
          ai: imageGenAPIKeyExistsQuery.data
            ? {
                defaultPrompt: `I have an idea box named "${initialData?.name}", where I store all my ideas related to this title. Generate a thumbnail for the idea box. The image should focus on the title of this idea box instead of the fact that this is the idea box. It should clearly represent the project or whatever the idea box is used to contain the idea for. In other words, do not include any words related to "idea box" in the image unless the title of the box said so.`
              }
            : false
        }}
      />
    </FormModal>
  )
}

export default ModifyContainerModal
