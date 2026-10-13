import type { AchievementCategory } from '@'

import { useForgeMutation } from '@lifeforge/api'
import {
  ConfirmationModal,
  ContextMenuItem,
  SidebarItem,
  useModalStore
} from '@lifeforge/ui'

import ModifyCategoriesModal from '@/components/modals/ModifyCategoriesModal'
import useFilter from '@/hooks/useFilter'
import { forgeAPI } from '@/manifest'

function CategoryItem({ category }: { category: AchievementCategory }) {
  const { open } = useModalStore()
  const { updateFilter, filter } = useFilter()

  const deleteMutation = useForgeMutation(
    forgeAPI.categories.remove.input({ id: category.id }),
    { action: 'delete', queryKey: forgeAPI.categories.key }
  )

  return (
    <SidebarItem
      key={category.id}
      active={filter.category === category.id}
      contextMenuItems={
        <>
          <ContextMenuItem
            icon="tabler:pencil"
            label="Edit"
            onClick={() => {
              open(ModifyCategoriesModal, {
                modifyType: 'update',
                initialData: category
              })
            }}
          />
          <ContextMenuItem
            dangerous
            icon="tabler:trash"
            label="Delete"
            onClick={() => {
              open(ConfirmationModal, {
                title: 'Delete Category',
                description:
                  'Are you sure you want to delete this category? This action cannot be undone.',
                confirmButton: 'Delete',
                onConfirm: async () => {
                  await deleteMutation.mutateAsync(undefined)
                }
              })
            }}
          />
        </>
      }
      icon={category.icon}
      label={category.name}
      namespace={false}
      number={category.amount}
      sideStripColor={category.color}
      onCancelButtonClick={() => {
        updateFilter('category', null)
      }}
      onClick={() => {
        updateFilter('category', category.id)
      }}
    />
  )
}

export default CategoryItem
