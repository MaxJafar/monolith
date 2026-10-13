import { Link } from 'react-router'

import {
  Button,
  EmptyStateScreen,
  Flex,
  Icon,
  Scrollbar,
  Widget,
  WithQuery
} from '@lifeforge/ui'

import useDashboardTransactionsQuery from '../../hooks/useDashboardTransactionsQuery'
import TransactionList from './components/TransactionList'

function TransactionsCard() {
  const transactionsQuery = useDashboardTransactionsQuery()

  return (
    <Widget
      actionComponent={
        <Button as={Link} p="xs" to="/wallet/transactions" variant="plain">
          <Icon icon="tabler:chevron-right" />
        </Button>
      }
      icon="tabler:list"
      title="Recent Transactions"
    >
      <WithQuery query={transactionsQuery}>
        {transactions => (
          <Flex height="100%" minHeight="32rem" width="100%">
            <Scrollbar>
              {transactions.groups.length > 0 ? (
                <TransactionList />
              ) : (
                <EmptyStateScreen
                  icon="tabler:wallet-off"
                  message={{
                    id: 'transactions'
                  }}
                />
              )}
            </Scrollbar>
          </Flex>
        )}
      </WithQuery>
    </Widget>
  )
}

export default TransactionsCard
