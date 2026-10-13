import type { AchievementCategory } from '@'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { useForgeMutation } from '@lifeforge/api'
import {
  ColorField,
  FormModal,
  IconField,
  TextField,
  createDefaultValues
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

const schema = z.object({
  name: z.string().min(1, 'Category name is required'),
  color: z
    .string()
    .regex(
      /^#[0-9A-Fa-f]{6}$/,
      'Color must be a valid hex color (e.g. #FF0000)'
    ),
  icon: z.string().min(1, 'Category icon is required')
})

function ModifyCategoriesModal({
  onClose,
  data: { modifyType, initialData }
}: {
  onClose: () => void
  data: {
    modifyType: 'create' | 'update'
    initialData?: AchievementCategory
  }
}) {
  const createMutation = useForgeMutation(forgeAPI.categories.create, {
    action: 'create',
    queryKey: forgeAPI.categories.key
  })

  const updateMutation = useForgeMutation(
    forgeAPI.categories.update.input({ id: initialData?.id || '' }),
    { action: 'update', queryKey: forgeAPI.categories.key }
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
          ;(modifyType === 'create'
            ? createMutation
            : updateMutation
          ).mutateAsync(data)
        },
        template: modifyType
      }}
      uiConfig={{
        icon: modifyType === 'create' ? 'tabler:plus' : 'tabler:pencil',
        namespace: 'apps.lifeforge--achievements',
        title: `achievement.category.${modifyType}`,
        onClose
      }}
    >
      <TextField
        autoFocus
        required
        control={form.control}
        icon="tabler:category"
        label="Category name"
        name="name"
        placeholder="My category"
      />
      <ColorField
        required
        control={form.control}
        label="Category color"
        name="color"
      />
      <IconField
        required
        control={form.control}
        label="Category icon"
        name="icon"
      />
    </FormModal>
  )
}

export default ModifyCategoriesModal
