import { useQueries } from '@tanstack/react-query'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Button,
  ModalHeader,
  Stack,
  Text,
  surface,
  useModalStore
} from '@lifeforge/ui'

import type { WalletTransaction } from '@/hooks/useWalletData'
import { forgeAPI } from '@/manifest'

import type { CreateAnotherValue } from '../components/CreateAnotherFIeld'
import TransactionItem from '../components/TransactionItem'
import ModifyTransactionsModal from './ModifyTransactionsModal'

function DuplicateTransactionModal({
  data: { matchedTransactionIds, scannedData, createAnother = 'none' },
  onClose
}: {
  data: {
    matchedTransactionIds: string[]
    scannedData: {
      type: WalletTransaction['type']
    } & Partial<WalletTransaction>
    createAnother?: CreateAnotherValue
  }
  onClose: () => void
}) {
  const { open } = useModalStore()
  const { t } = useModuleTranslation()

  const matchedQueries = useQueries({
    queries: matchedTransactionIds.map(id =>
      forgeAPI.transactions.getById.input({ id }).queryOptions()
    )
  })

  const matchedTransactions = matchedQueries
    .map(query => query.data)
    .filter((transaction): transaction is WalletTransaction =>
      Boolean(transaction)
    )

  const handleCreateNew = () => {
    onClose()

    open(ModifyTransactionsModal, {
      type: 'create',
      createAnother,
      initialData: scannedData
    })
  }

  const handleUseExisting = (transaction: WalletTransaction) => {
    onClose()

    open(ModifyTransactionsModal, {
      type: 'update',
      initialData: {
        ...transaction,
        receipt: scannedData.receipt
      }
    })
  }

  return (
    <Box minWidth="40vw">
      <ModalHeader
        icon="tabler:alert-triangle"
        title="receipts.duplicate.title"
        onClose={onClose}
      />
      <Stack gap="md">
        <Text color="muted">{t('modals.receipts.duplicate.description')}</Text>
        <Stack gap="sm">
          <Text color="muted" size="sm" weight="medium">
            {t('modals.receipts.duplicate.useExisting')}
          </Text>
          {matchedTransactions.map(transaction => (
            <Box
              key={transaction.id}
              onClick={() => handleUseExisting(transaction)}
            >
              <TransactionItem
                viewOnly
                bg={surface.lightInteractive}
                transaction={transaction}
              />
            </Box>
          ))}
        </Stack>
        <Button
          icon="tabler:plus"
          mt="md"
          variant="secondary"
          width="100%"
          onClick={handleCreateNew}
        >
          modals.receipts.duplicate.createNew
        </Button>
      </Stack>
    </Box>
  )
}

export default DuplicateTransactionModal
