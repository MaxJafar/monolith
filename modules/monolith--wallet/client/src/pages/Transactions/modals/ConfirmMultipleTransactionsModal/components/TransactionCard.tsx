import dayjs from 'dayjs'

import {
  Box,
  Button,
  Card,
  ConfirmationModal,
  Flex,
  IconTooltip,
  Stack,
  Text,
  surface,
  useModalStore
} from '@monolith/ui'

import type { WalletTransaction } from '@/hooks/useWalletData'

import { TransactionItemProvider } from '../../../components/TransactionItem/contexts/TransactionItemContext'
import TransactionIncomeExpensesItem from '../../../components/TransactionItem/type/TransactionIncomeExpensesItem'
import TransactionTransferItem from '../../../components/TransactionItem/type/TransactionTransferItem'
import ModifyTransactionsModal from '../../ModifyTransactionsModal'

function TransactionCard({
  tx,
  onUpdate
}: {
  tx: WalletTransaction
  onUpdate: (
    updater: (prev: WalletTransaction[]) => WalletTransaction[]
  ) => void
}) {
  const { open } = useModalStore()

  function isTransactionValid(t: WalletTransaction) {
    if (!t.date || !t.amount || t.amount <= 0) return false
    if (t.type === 'transfer') return !!t.from && !!t.to

    return !!t.particulars && !!t.category && !!t.asset
  }

  function handleEdit() {
    open(ModifyTransactionsModal, {
      type: 'create',
      initialData: tx,
      onSubmit: data => {
        onUpdate(prev =>
          prev.map(t => {
            if (t.id !== tx.id) return t

            const date = dayjs(data.date).format('YYYY-MM-DD')

            if (data.type === 'transfer') {
              return {
                id: t.id,
                type: 'transfer',
                amount: data.amount,
                date,
                receipt: t.receipt,
                from: data.from || '',
                to: data.to || ''
              }
            }

            return {
              id: t.id,
              type: data.type,
              amount: data.amount,
              date,
              receipt: t.receipt,
              particulars: data.particulars || '',
              asset: data.asset || '',
              asset_info:
                t.type === 'transfer' ? { name: '', icon: '' } : t.asset_info,
              category: data.category || '',
              category_info:
                t.type === 'transfer'
                  ? { name: '', icon: '', color: '' }
                  : t.category_info,
              platform: data.platform || null,
              platform_info: t.type === 'transfer' ? null : t.platform_info,
              ledgers: data.ledgers ?? [],
              ledger_info: t.type === 'transfer' ? null : t.ledger_info,
              location_name: data.location?.name ?? '',
              location_coords: data.location
                ? {
                    lat: data.location.location.latitude,
                    lon: data.location.location.longitude
                  }
                : null
            }
          })
        )
      }
    })
  }

  function handleDelete() {
    open(ConfirmationModal, {
      icon: 'tabler:trash',
      title: 'Delete Transaction',
      description: 'Are you sure you want to delete this transaction?',
      confirmButton: {
        text: 'Delete',
        icon: 'tabler:trash',
        isDangerous: true
      },
      onConfirm: async () => {
        onUpdate(prev => prev.filter(t => t.id !== tx.id))
      }
    })
  }

  const isValid = isTransactionValid(tx)

  return (
    <Card
      align="center"
      bg={surface.light}
      direction="row"
      gap="md"
      justify="between"
      p="md"
      style={{
        border: isValid ? undefined : '1px solid #f59e0b'
      }}
    >
      <TransactionItemProvider transaction={tx}>
        {tx.type === 'transfer' ? (
          <TransactionTransferItem />
        ) : (
          <TransactionIncomeExpensesItem />
        )}
      </TransactionItemProvider>
      {!isValid && (
        <IconTooltip
          icon="tabler:alert-triangle"
          iconProps={{ color: 'yellow-500' }}
          id={`missing-details-${tx.id}`}
        >
          <Text as="div" size="base">
            <Stack gap="xs" minWidth="200px">
              <Text weight="medium">Missing required fields</Text>
              <Box
                as="ul"
                pl="md"
                style={{
                  listStyleType: 'disc'
                }}
              >
                {tx.type !== 'transfer' ? (
                  <>
                    {!tx.particulars && <li>Particulars</li>}
                    {!tx.category && <li>Category</li>}
                    {!tx.asset && <li>Asset</li>}
                  </>
                ) : (
                  <>
                    {!tx.from && <li>From asset</li>}
                    {!tx.to && <li>To asset</li>}
                  </>
                )}
              </Box>
            </Stack>
          </Text>
        </IconTooltip>
      )}
      <Flex align="center" gap="xs">
        <Button icon="tabler:pencil" variant="plain" onClick={handleEdit} />
        <Button
          dangerous
          icon="tabler:trash"
          variant="plain"
          onClick={handleDelete}
        />
      </Flex>
    </Card>
  )
}

export default TransactionCard
