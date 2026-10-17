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
} from '@monolith/ui'

import { workspaceAPI } from '@/manifest'
import type { IdeaBoxFolder } from '@/providers/IdeaBoxProvider'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  icon: z.string().min(1, 'Icon is required'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color'),
  container: z.string(),
  parent: z.string()
})

function ModifyFolderModal({
  data: { type, initialData },
  onClose
}: {
  data: {
    type: 'create' | 'update'
    initialData?: IdeaBoxFolder
  }
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { id, '*': path } = useParams<{ id: string; '*': string }>()

  const mutation = useMutation(
    (type === 'create'
      ? workspaceAPI.folders.create
      : workspaceAPI.folders.update.input({
          id: initialData?.id || ''
        })
    ).mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['ideaBox', 'folders']
        })
      },
      onError: error => {
        toast.error(`Failed to ${type} folder: ${error.message}`)
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
          await mutation.mutateAsync({
            ...formData,
            container: id!,
            parent: path?.split('/').pop() || ''
          })
        }
      }}
      uiConfig={{
        icon: type === 'create' ? 'tabler:plus' : 'tabler:pencil',
        title: `folder.${type}`,
        namespace: 'apps.ideaBox',
        onClose
      }}
    >
      <TextField
        required
        control={form.control}
        icon="tabler:folder"
        label="folderName"
        name="name"
        placeholder="My Folder"
      />
      <IconField
        required
        control={form.control}
        label="folderIcon"
        name="icon"
      />
      <ColorField
        required
        control={form.control}
        label="folderColor"
        name="color"
      />
    </FormModal>
  )
}

export default ModifyFolderModal
