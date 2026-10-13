import { useState } from 'react'

import { type InferOutput, useForgeMutation } from '@lifeforge/api'
import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Button, ModalHeader, Stack, Text, toast } from '@lifeforge/ui'

import type { WalletTransaction } from '@/hooks/useWalletData'
import { forgeAPI } from '@/manifest'

import TransactionCard from './components/TransactionCard'

function ConfirmMultipleTransactionsModal({
  onClose,
  data: { transactions: initialTransactions }
}: {
  onClose: () => void
  data: {
    transactions: InferOutput<typeof forgeAPI.transactions.fromNaturalLanguage>
  }
}) {
  const { t } = useModuleTranslation()

  const [transactions, setTransactions] = useState<WalletTransaction[]>(() =>
    initialTransactions.map((tx, idx) => {
      const id = `temp-${idx}-${Math.random().toString(36).substring(2, 11)}`

      if (tx.type === 'transfer') {
        return {
          id,
          type: 'transfer' as const,
          amount: tx.amount,
          date: tx.date,
          receipt: '',
          from: tx.from,
          to: tx.to
        }
      }

      return {
        id,
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        receipt: '',
        particulars: tx.particulars,
        asset: tx.asset,
        asset_info: tx.asset_info,
        category: tx.category,
        category_info: tx.category_info,
        platform: tx.platform ?? null,
        platform_info: tx.platform_info,
        ledgers: tx.ledgers ?? [],
        ledger_info: tx.ledger_info,
        location_name: tx.location_name,
        location_coords: tx.location_coords
      }
    })
  )

  const mutation = useForgeMutation(forgeAPI.transactions.createMultiple, {
    action: 'create',
    queryKey: forgeAPI.key,
    onSuccess: () => {
      toast.success(t('toasts.createMultipleTransactions.success'))
      onClose()
    },
    onError: () => {
      toast.error(t('toasts.createMultipleTransactions.error'))
    }
  })

  const hasInvalid = transactions.some(
    tx =>
      !tx.date ||
      !tx.amount ||
      tx.amount <= 0 ||
      (tx.type === 'transfer'
        ? !tx.from || !tx.to
        : !tx.particulars || !tx.category || !tx.asset)
  )

  async function handleSaveAll() {
    if (hasInvalid) {
      toast.error(t('toasts.missingRequiredFields'))

      return
    }

    const mapped = transactions.map(tx => {
      if (tx.type === 'transfer') {
        return {
          type: 'transfer' as const,
          date: tx.date,
          amount: tx.amount,
          from: tx.from || '',
          to: tx.to || ''
        }
      } else {
        return {
          type: tx.type,
          date: tx.date,
          amount: tx.amount,
          particulars: tx.particulars || '',
          category: tx.category || '',
          asset: tx.asset || '',
          platform: tx.platform || undefined,
          ledgers: tx.ledgers || [],
          location: tx.location_name
            ? {
                name: tx.location_name,
                formattedAddress: tx.location_name,
                location: {
                  latitude: tx.location_coords?.lat || 0,
                  longitude: tx.location_coords?.lon || 0
                }
              }
            : undefined
        }
      }
    })

    await mutation.mutateAsync({ transactions: mapped })
  }

  return (
    <Box minWidth="40vw">
      <ModalHeader
        icon="tabler:brain"
        title="naturalLanguage.confirmTitle"
        onClose={onClose}
      />
      <Stack gap="md">
        <Text color="muted">
          {t('modals.naturalLanguage.confirmDescription')}
        </Text>
        <Stack>
          {transactions.map(tx => (
            <TransactionCard key={tx.id} tx={tx} onUpdate={setTransactions} />
          ))}
        </Stack>
        <Button
          disabled={hasInvalid || transactions.length === 0}
          icon="tabler:check"
          loading={mutation.isPending}
          mt="md"
          width="100%"
          onClick={handleSaveAll}
        >
          save
        </Button>
      </Stack>
    </Box>
  )
}

export default ConfirmMultipleTransactionsModal
