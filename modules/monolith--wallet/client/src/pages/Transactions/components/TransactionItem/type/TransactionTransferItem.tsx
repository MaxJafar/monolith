import { Flex } from '@monolith/ui'

import { useWalletData } from '@/hooks/useWalletData'

import TransactionAmount from '../components/TransactionAmount'
import TransactionCategory from '../components/TransactionCategory'
import TransactionParticular from '../components/TransactionParticular'
import { useTransactionItemContext } from '../contexts/TransactionItemContext'

function TransactionTransferItem() {
  const { transaction, highlightAsset } = useTransactionItemContext()
  const { assetsQuery } = useWalletData()

  const assets = assetsQuery.data ?? []

  if (transaction.type !== 'transfer') return null

  const direction = !highlightAsset
    ? null
    : transaction.to === highlightAsset
      ? 'in'
      : transaction.from === highlightAsset
        ? 'out'
        : null

  return (
    <Flex align="center" gap="xl" justify="between" minWidth="0" width="100%">
      <Flex align="center" gap="md" minWidth="0" width="100%">
        <TransactionCategory color="#3b82f6" icon="tabler:transfer" />
        <TransactionParticular receipt={transaction.receipt}>
          Transfer from{' '}
          {assets.find(asset => asset.id === transaction.from)?.name ??
            'Unknown'}{' '}
          to{' '}
          {assets.find(asset => asset.id === transaction.to)?.name ?? 'Unknown'}
        </TransactionParticular>
      </Flex>
      <TransactionAmount
        amount={transaction.amount}
        color={
          direction === 'in'
            ? 'green-500'
            : direction === 'out'
              ? 'red-500'
              : 'blue-500'
        }
        sign={direction === 'in' ? '+' : direction === 'out' ? '-' : ''}
      />
    </Flex>
  )
}

export default TransactionTransferItem
