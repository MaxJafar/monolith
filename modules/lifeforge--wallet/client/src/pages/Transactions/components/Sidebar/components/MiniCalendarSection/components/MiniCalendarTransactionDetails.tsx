import dayjs from 'dayjs'

import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Flex, Text, Tooltip } from '@lifeforge/ui'

import numberToCurrency from '@/utils/numberToCurrency'

export interface TransactionCount {
  income: number
  expenses: number
  transfer: number
  incomeAmount: number
  expensesAmount: number
  transferAmount: number
  total: number
  count: number
}

const TYPE_COLORS = {
  income: 'green-500',
  expenses: 'red-500',
  transfer: 'blue-500'
} as const

function MiniCalendarTransactionDetails({
  index,
  date,
  actualIndex,
  transactionCount
}: {
  index: number
  date: Date
  actualIndex: number
  transactionCount: TransactionCount
}) {
  const { t } = useModuleTranslation()

  const rows = [
    { type: 'income' as const, amount: transactionCount.incomeAmount },
    { type: 'expenses' as const, amount: transactionCount.expensesAmount },
    { type: 'transfer' as const, amount: transactionCount.transferAmount }
  ].filter(row => row.amount > 0)

  return (
    <Tooltip
      id={`wallet-transaction-tooltip-${index}`}
      place="bottom"
      positionStrategy="absolute"
    >
      <Text
        as="h3"
        color={{ base: 'bg-800', dark: 'bg-100' }}
        size="lg"
        weight="semibold"
      >
        {dayjs(
          `${date.getFullYear()}-${date.getMonth() + 1}-${actualIndex}`,
          'YYYY-M-D'
        ).format('dddd, MMMM D')}
      </Text>
      <Flex direction="column" gap="sm" mt="md">
        {rows.map(row => (
          <Flex key={row.type} align="center" gap="2xl" justify="between">
            <Flex align="center" gap="sm">
              <Box
                bg={TYPE_COLORS[row.type]}
                height="0.75rem"
                r="full"
                width="0.75rem"
              />
              <Text>{t(`transactionTypes.${row.type}`)}</Text>
            </Flex>
            <Text weight="medium">RM {numberToCurrency(row.amount)}</Text>
          </Flex>
        ))}
      </Flex>
    </Tooltip>
  )
}

export default MiniCalendarTransactionDetails
