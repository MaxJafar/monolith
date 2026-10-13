import { useNavigate } from 'react-router'

import { useForgeMutation } from '@lifeforge/api'
import { useModalStore } from '@lifeforge/ui'

import type { EntityBreakdown } from '@/hooks/useEntityBreakdown'
import type { WalletLedger } from '@/hooks/useWalletData'
import { forgeAPI } from '@/manifest'

import ManageItem from '../../components/ManageItem'
import ModifyLedgerModal from '../../components/modals/ModifyLedgerModal'

function LedgerItem({
  ledger,
  breakdown
}: {
  ledger: WalletLedger
  breakdown: EntityBreakdown[string] | undefined
}) {
  const navigate = useNavigate()
  const { open } = useModalStore()

  const deleteMutation = useForgeMutation(
    forgeAPI.ledgers.remove.input({ id: ledger.id }),
    { action: 'delete', queryKey: forgeAPI.ledgers.key }
  )

  return (
    <ManageItem
      color={ledger.color}
      count={breakdown?.count}
      deleteConfirmationPrompt={ledger.name}
      deleteDescription={`Are you sure you want to delete the ledger "${ledger.name}"? This action cannot be undone.`}
      deleteTitle="Delete Ledger"
      expenses={breakdown?.expenses}
      icon={ledger.icon}
      income={breakdown?.income}
      name={ledger.name}
      onClick={() => navigate(`/wallet/transactions?ledger=${ledger.id}`)}
      onDelete={() => deleteMutation.mutateAsync(undefined)}
      onEdit={() =>
        open(ModifyLedgerModal, { type: 'update', initialData: ledger })
      }
    />
  )
}

export default LedgerItem
