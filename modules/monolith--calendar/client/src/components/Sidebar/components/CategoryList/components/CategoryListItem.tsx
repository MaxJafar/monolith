import { useCallback, useMemo } from 'react'

import { useApiMutation } from '@monolith/api'
import { ConfirmationModal, SidebarItem, useModalStore } from '@monolith/ui'

import type { CalendarCategory } from '@/components/Calendar'
import ModifyCategoryModal from '@/components/modals/ModifyCategoryModal'
import { workspaceAPI } from '@/manifest'

import ActionMenu from './ActionMenu'

function CategoryListItem({
  item,
  isSelected,
  onSelect,
  onCancelSelect,
  modifiable = true
}: {
  item: CalendarCategory
  isSelected: boolean
  onSelect: (item: CalendarCategory) => void
  onCancelSelect: () => void
  modifiable?: boolean
}) {
  const { open } = useModalStore()

  const deleteMutation = useApiMutation(
    workspaceAPI.categories.remove.input({ id: item.id }),
    {
      action: 'delete',
      queryKey: workspaceAPI.categories.list.key,
      onSuccess: () => onCancelSelect()
    }
  )

  const handleEdit = useCallback(() => {
    open(ModifyCategoryModal, {
      initialData: item,
      type: 'update'
    })
  }, [item])

  const handleDelete = useCallback(() => {
    open(ConfirmationModal, {
      title: 'Delete Category',
      description: `Are you sure you want to delete the category "${item.name}"?`,
      onConfirm: async () => {
        await deleteMutation.mutateAsync(undefined)
      },
      confirmationPrompt: item.name
    })
  }, [item])

  const contextMenuItems = useMemo(
    () =>
      modifiable ? (
        <ActionMenu onDelete={handleDelete} onEdit={handleEdit} />
      ) : undefined,
    [modifiable, handleDelete, handleEdit]
  )

  const handleClick = useCallback(() => {
    onSelect(item)
  }, [onSelect, item])

  return (
    <SidebarItem
      active={isSelected}
      contextMenuItems={contextMenuItems}
      icon={item.icon}
      label={item.name}
      namespace={false}
      sideStripColor={item.color}
      onClick={handleClick}
    />
  )
}

export default CategoryListItem
