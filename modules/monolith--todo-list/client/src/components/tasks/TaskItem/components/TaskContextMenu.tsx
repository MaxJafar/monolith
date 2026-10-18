import { useCallback } from 'react'

import { useApiMutation } from '@monolith/api'
import {
  ConfirmationModal,
  ContextMenu,
  ContextMenuItem,
  useModalStore
} from '@monolith/ui'

import { workspaceAPI } from '@/manifest'
import ModifyTaskModal from '@/modals/ModifyTaskModal'
import type { TodoListEntry } from '@/providers/TodoListProvider'

function TaskContextMenu({ entry }: { entry: TodoListEntry }) {
  const { open } = useModalStore()

  const deleteMutation = useApiMutation(
    workspaceAPI.entries.remove.input({ id: entry.id }),
    { action: 'delete', queryKey: workspaceAPI.key }
  )

  const handleUpdateTask = useCallback(() => {
    open(ModifyTaskModal, { type: 'update', initialData: entry })
  }, [entry])

  const handleDeleteTask = useCallback(() => {
    open(ConfirmationModal, {
      title: 'Delete Task',
      description: 'Are you sure you want to delete this task?',
      confirmationButton: 'delete',
      onConfirm: async () => {
        await deleteMutation.mutateAsync(undefined)
      }
    })
  }, [entry])

  return (
    <ContextMenu>
      <ContextMenuItem
        icon="tabler:pencil"
        label="Edit"
        onClick={handleUpdateTask}
      />
      <ContextMenuItem
        dangerous
        icon="tabler:trash"
        label="Delete"
        onClick={handleDeleteTask}
      />
    </ContextMenu>
  )
}

export default TaskContextMenu
