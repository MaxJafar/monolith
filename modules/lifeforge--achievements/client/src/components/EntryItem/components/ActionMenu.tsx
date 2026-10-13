import { useForgeMutation } from '@lifeforge/api'
import {
  ConfirmationModal,
  ContextMenu,
  ContextMenuItem,
  useModalStore
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

import type { Achievement } from '../../..'
import ModifyAchievementModal from '../../modals/ModifyAchievementModal'

function ActionMenu({ entry }: { entry: Achievement }) {
  const { open } = useModalStore()

  const deleteMutation = useForgeMutation(
    forgeAPI.entries.remove.input({ id: entry.id }),
    { action: 'delete', queryKey: forgeAPI.key }
  )

  return (
    <ContextMenu position="absolute" right="1em" top="1em">
      <ContextMenuItem
        icon="tabler:pencil"
        label="Edit"
        onClick={() =>
          open(ModifyAchievementModal, {
            modifyType: 'update',
            initialData: entry
          })
        }
      />
      <ContextMenuItem
        dangerous
        icon="tabler:trash"
        label="Delete"
        onClick={() =>
          open(ConfirmationModal, {
            title: 'Delete Achievement',
            description: 'Are you sure you want to delete this achievement?',
            confirmationButton: 'delete',
            onConfirm: async () => {
              await deleteMutation.mutateAsync(undefined)
            }
          })
        }
      />
    </ContextMenu>
  )
}

export default ActionMenu
