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

import type { WalletPlatform } from '@/hooks/useWalletData'
import { workspaceAPI } from '@/manifest'

const schema = z.object({
  name: z.string().min(1, 'Platform name is required'),
  icon: z.string().min(1, 'Platform icon is required'),
  color: z
    .string()
    .regex(
      /^#[0-9A-Fa-f]{6}$/,
      'Color must be a valid hex color (e.g. #FF0000)'
    )
})

function ModifyPlatformModal({
  data: { type, initialData },
  onClose
}: {
  data: {
    type: 'create' | 'update'
    initialData?: Partial<WalletPlatform>
  }
  onClose: () => void
}) {
  const createMutation = useApiMutation(workspaceAPI.platforms.create, {
    action: 'create',
    queryKey: workspaceAPI.platforms.key
  })

  const updateMutation = useApiMutation(
    workspaceAPI.platforms.update.input({ id: initialData?.id || '' }),
    { action: 'update', queryKey: workspaceAPI.platforms.key }
  )

  const form = useForm({
    defaultValues: {
      ...createDefaultValues(schema),
      ...initialData
    },
    mode: 'all',
    resolver: zodResolver(schema)
  })

  return (
    <FormModal
      form={form}
      submissionConfig={{
        handler: data => {
          ;(type === 'create' ? createMutation : updateMutation).mutateAsync(
            data
          )
        },
        template: type === 'update' ? 'update' : 'create'
      }}
      uiConfig={{
        icon: type === 'update' ? 'tabler:pencil' : 'tabler:plus',
        title: `platforms.${type === 'update' ? 'update' : 'create'}`,
        onClose
      }}
    >
      <TextField
        required
        control={form.control}
        icon="tabler:pencil"
        label="Platform Name"
        name="name"
        placeholder="Shopee"
      />
      <IconField
        required
        control={form.control}
        label="Platform Icon"
        name="icon"
      />
      <ColorField
        required
        control={form.control}
        label="Platform Color"
        name="color"
      />
    </FormModal>
  )
}

export default ModifyPlatformModal
