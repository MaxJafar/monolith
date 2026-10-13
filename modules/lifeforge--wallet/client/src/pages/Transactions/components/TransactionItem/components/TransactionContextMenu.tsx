import { useForgeMutation } from '@lifeforge/api'
import { useModuleTranslation } from '@lifeforge/localization'
import {
  ConfirmationModal,
  ContextMenu,
  ContextMenuItem,
  toast,
  useModalStore
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'
import ModifyTemplatesModal from '@/pages/Manage/components/modals/ModifyTemplatesModal'

import ModifyTransactionsModal from '../../../modals/ModifyTransactionsModal'
import { useTransactionItemContext } from '../contexts/TransactionItemContext'

function TransactionContextMenu() {
  const { transaction } = useTransactionItemContext()
  const { open } = useModalStore()
  const { t } = useModuleTranslation()

  const deleteMutation = useForgeMutation(
    forgeAPI.transactions.remove.input({ id: transaction.id }),
    { action: 'delete', queryKey: forgeAPI.key }
  )

  return (
    <ContextMenu
      componentProps={{
        menu: {
          minWidth: '16em'
        }
      }}
    >
      {transaction.type !== 'transfer' && (
        <ContextMenuItem
          icon="tabler:copy"
          label="Copy Particular"
          onClick={() => {
            navigator.clipboard.writeText(transaction.particulars)
            toast.success(t('toasts.copyParticulars'))
          }}
        />
      )}
      {transaction.type !== 'transfer' && (
        <ContextMenuItem
          icon="tabler:template"
          label="Create Template From"
          onClick={() =>
            open(ModifyTemplatesModal, {
              type: 'create',
              initialData: {
                name: '',
                type: transaction.type,
                particulars: transaction.particulars,
                amount: transaction.amount,
                asset: transaction.asset,
                category: transaction.category,
                platform: transaction.platform,
                ledgers: transaction.ledgers ?? [],
                location_name: transaction.location_name,
                location_coords: transaction.location_coords
              }
            })
          }
        />
      )}
      <ContextMenuItem
        icon="tabler:copy-plus"
        label="Duplicate"
        onClick={() =>
          open(ModifyTransactionsModal, {
            type: 'create',
            initialData: transaction
          })
        }
      />
      <ContextMenuItem
        icon="tabler:pencil"
        label="Edit"
        onClick={() =>
          open(ModifyTransactionsModal, {
            type: 'update',
            initialData: transaction
          })
        }
      />
      <ContextMenuItem
        dangerous
        icon="tabler:trash"
        label="Delete"
        onClick={() => {
          open(ConfirmationModal, {
            title: 'Delete Transaction',
            description: 'Are you sure you want to delete this transaction?',
            confirmationButton: 'delete',
            onConfirm: async () => {
              await deleteMutation.mutateAsync(undefined)
            }
          })
        }}
      />
    </ContextMenu>
  )
}

export default TransactionContextMenu
