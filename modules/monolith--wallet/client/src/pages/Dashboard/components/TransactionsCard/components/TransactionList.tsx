import dayjs from 'dayjs'

import {
  Box,
  Card,
  Flex,
  Icon,
  Stack,
  Text,
  WithQuery,
  surface
} from '@monolith/ui'

import { useWalletData } from '@/hooks/useWalletData'

import useDashboardTransactionsQuery from '../../../hooks/useDashboardTransactionsQuery'
import TransactionAmount from './TransactionAmount'
import TransactionParticular from './TransactionParticular'

function TransactionList() {
  const transactionsQuery = useDashboardTransactionsQuery()
  const { categoriesQuery } = useWalletData()

  const categories = categoriesQuery.data ?? []

  return (
    <WithQuery query={transactionsQuery}>
      {transactions => (
        <Stack>
          {transactions.groups
            .flatMap(group => group.items)
            .map(transaction => (
              <Card
                key={transaction.id}
                bg={surface.lightInteractive}
                direction="row"
                gap="xl"
              >
                <Flex align="center" gap="md" minWidth="0" width="100%">
                  <Box
                    p="sm"
                    r="md"
                    style={
                      transaction.type !== 'transfer'
                        ? {
                            backgroundColor:
                              categories.find(
                                category => category.id === transaction.category
                              )?.color + '20',
                            color: categories.find(
                              category => category.id === transaction.category
                            )?.color
                          }
                        : {
                            backgroundColor: 'rgba(59,130,246,0.2)',
                            color: 'rgb(59,130,246)'
                          }
                    }
                  >
                    <Icon
                      icon={
                        transaction.type === 'transfer'
                          ? 'tabler:transfer'
                          : (categories.find(
                              category => category.id === transaction.category
                            )?.icon ?? 'tabler:currency-dollar')
                      }
                      size="1.5rem"
                    />
                  </Box>
                  <Stack gap="none" minWidth="0" width="100%">
                    <Text truncate weight="semibold">
                      <TransactionParticular transaction={transaction} />
                    </Text>
                    <Text color="muted" size="sm">
                      {transaction.type.charAt(0).toUpperCase() +
                        transaction.type.slice(1)}
                    </Text>
                  </Stack>
                </Flex>
                <Stack gap="none">
                  <Text align="right">
                    <TransactionAmount
                      amount={transaction.amount}
                      type={transaction.type}
                    />
                  </Text>
                  <Text
                    align="right"
                    color="muted"
                    size="sm"
                    whiteSpace="nowrap"
                  >
                    {dayjs(transaction.date).format('MMM DD, YYYY')}
                  </Text>
                </Stack>
              </Card>
            ))}
        </Stack>
      )}
    </WithQuery>
  )
}

export default TransactionList
