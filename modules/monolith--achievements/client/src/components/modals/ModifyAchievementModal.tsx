import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { useApiMutation } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'
import {
  FormModal,
  ListboxField,
  TAILWIND_PALETTE,
  TextAreaField,
  TextField,
  createDefaultValues
} from '@monolith/ui'

import useFilter from '@/hooks/useFilter'
import { workspaceAPI } from '@/manifest'

import type { Achievement } from '../..'

const difficulties = [
  ['easy', 'green'],
  ['medium', 'yellow'],
  ['hard', 'red'],
  ['impossible', 'purple']
] as const

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  thoughts: z.string().min(1, 'Thoughts are required'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'impossible']),
  category: z.string().optional().nullable()
})

function ModifyAchievementModal({
  data: { modifyType, initialData },
  onClose
}: {
  data: {
    modifyType: 'create' | 'update'
    initialData?: Achievement
  }
  onClose: () => void
}) {
  const { t } = useModuleTranslation()
  const { filter } = useFilter()
  const categoriesQuery = useQuery(workspaceAPI.categories.list.queryOptions())

  const createMutation = useApiMutation(workspaceAPI.entries.create, {
    action: 'create',
    queryKey: workspaceAPI.key
  })

  const updateMutation = useApiMutation(
    workspaceAPI.entries.update.input({ id: initialData?.id || '' }),
    { action: 'update', queryKey: workspaceAPI.key }
  )

  const form = useForm({
    defaultValues: {
      ...createDefaultValues(schema),
      ...initialData,
      difficulty:
        initialData?.difficulty ??
        schema.shape.difficulty.safeParse(filter.difficulty).data ??
        'medium'
    },
    mode: 'all',
    resolver: zodResolver(schema)
  })

  const difficultyOptions = difficulties.map(([name, color]) => ({
    text: t(`difficulties.${name}`),
    value: name as Achievement['difficulty'],
    color: TAILWIND_PALETTE[color as keyof typeof TAILWIND_PALETTE][500]
  }))

  const categoryOptions = [
    { text: t('none'), icon: 'tabler:ban', value: '' },
    ...(categoriesQuery.data || []).map(category => ({
      text: category.name,
      color: category.color,
      icon: category.icon,
      value: category.id
    }))
  ]

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
        loading: categoriesQuery.isLoading,
        namespace: 'apps.monolith--achievements',
        title: `achievement.${modifyType}`,
        onClose
      }}
    >
      <TextField
        required
        control={form.control}
        icon="tabler:award"
        label="Achievement title"
        name="title"
        placeholder="My achievement"
      />
      <TextAreaField
        required
        control={form.control}
        icon="tabler:bubble-text"
        label="Achievement thoughts"
        name="thoughts"
        placeholder="My thoughts"
      />
      <ListboxField
        required
        control={form.control}
        icon="tabler:circle-dot"
        label="Achievement difficulty"
        name="difficulty"
        options={difficultyOptions}
      />
      <ListboxField
        control={form.control}
        icon="tabler:category"
        label="Achievement category"
        name="category"
        options={categoryOptions}
      />
    </FormModal>
  )
}

export default ModifyAchievementModal
