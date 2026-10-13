import { Card, type CardProps, surface, useModalStore } from '@lifeforge/ui'

import type { WalletTransaction } from '@/hooks/useWalletData'

import ViewTransactionModal from '../../modals/ViewTransactionModal'
import TransactionContextMenu from './components/TransactionContextMenu'
import { TransactionItemProvider } from './contexts/TransactionItemContext'
import TransactionIncomeExpensesItem from './type/TransactionIncomeExpensesItem'
import TransactionTransferItem from './type/TransactionTransferItem'

function TransactionItem({
  transaction,
  viewOnly,
  highlightAsset,
  bg = surface.defaultInteractive
}: {
  transaction: WalletTransaction
  viewOnly?: boolean
  highlightAsset?: string
  bg?: CardProps['bg']
}) {
  const { open } = useModalStore()

  return (
    <TransactionItemProvider
      highlightAsset={highlightAsset}
      transaction={transaction}
    >
      <Card
        isInteractive
        align="center"
        bg={bg}
        direction="row"
        gap="md"
        justify="between"
        onClick={() => {
          if (viewOnly) return

          open(ViewTransactionModal, { id: transaction.id })
        }}
      >
        {transaction.type === 'transfer' ? (
          <TransactionTransferItem />
        ) : (
          <TransactionIncomeExpensesItem />
        )}
        {!viewOnly && <TransactionContextMenu />}
      </Card>
    </TransactionItemProvider>
  )
}

export default TransactionItem
