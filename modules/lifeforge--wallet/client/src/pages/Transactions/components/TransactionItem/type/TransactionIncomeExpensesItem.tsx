import { Fragment } from 'react'

import { Flex, Icon, Stack, Text } from '@lifeforge/ui'

import TransactionAmount from '../components/TransactionAmount'
import TransactionCategory from '../components/TransactionCategory'
import TransactionMetaItem from '../components/TransactionMetaItem'
import TransactionParticular from '../components/TransactionParticular'
import { useTransactionItemContext } from '../contexts/TransactionItemContext'

function TransactionIncomeExpensesItem() {
  const { transaction } = useTransactionItemContext()

  if (transaction.type === 'transfer') return null

  const {
    asset_info: asset,
    category_info: category,
    ledger_info: ledger,
    platform_info: platform
  } = transaction

  const metaItems = [
    { key: 'asset', icon: asset.icon, label: asset.name },
    ...(transaction.ledgers.length > 0
      ? [
          {
            key: 'ledger',
            icon: ledger?.icon ?? '',
            label: `In ${ledger?.name ?? 'Unknown'}${
              transaction.ledgers.length > 1
                ? ` + ${transaction.ledgers.length - 1} more`
                : ''
            }`,
            color: ledger?.color ?? 'white',
            truncate: true
          }
        ]
      : []),
    ...(platform
      ? [
          {
            key: 'platform',
            icon: platform.icon,
            label: platform.name,
            color: platform.color
          }
        ]
      : [])
  ]

  return (
    <Flex align="center" gap="xl" justify="between" minWidth="0" width="100%">
      <Flex align="center" flex="1" gap="md" minWidth="0" width="100%">
        <TransactionCategory color={category.color} icon={category.icon} />
        <Stack
          direction={{ base: 'column-reverse', sm: 'column' }}
          gap="xs"
          minWidth="0"
        >
          <TransactionParticular receipt={transaction.receipt}>
            {transaction.particulars}{' '}
            {transaction.location_name && (
              <>
                <Text color="muted">@</Text> {transaction.location_name}
              </>
            )}
          </TransactionParticular>
          <Text asChild color="muted" whiteSpace="nowrap">
            <Flex align="center" gap="sm">
              {metaItems.map(({ key, ...item }, index) => (
                <Fragment key={key}>
                  {index > 0 && (
                    <Icon icon="tabler:circle-filled" size="0.25rem" />
                  )}
                  <TransactionMetaItem {...item} />
                </Fragment>
              ))}
            </Flex>
          </Text>
        </Stack>
      </Flex>
      <TransactionAmount
        amount={transaction.amount}
        color={transaction.type === 'income' ? 'green-500' : 'red-500'}
        sign={transaction.type === 'income' ? '+' : '-'}
      />
    </Flex>
  )
}

export default TransactionIncomeExpensesItem
