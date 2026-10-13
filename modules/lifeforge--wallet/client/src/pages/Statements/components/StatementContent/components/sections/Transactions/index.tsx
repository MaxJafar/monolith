import { useModuleTranslation } from '@lifeforge/localization'
import { Text, WithQuery } from '@lifeforge/ui'

import { useStatementData } from '@/pages/Statements/providers/StatementDataProvider'

import TransactionList from './components/TransactionList'
import TransactionsSummary from './components/TransactionsSummary'

function Transactions() {
  const { statementQuery } = useStatementData()
  const { t } = useModuleTranslation()

  return (
    <>
      <Text
        as="h2"
        mt="3xl"
        size={{ base: '3xl', print: '2xl' }}
        tracking="widest"
        transform="uppercase"
        weight="semibold"
      >
        <Text color={{ base: 'custom-500', print: 'custom-600' }}>02. </Text>
        {t('statement.transactions')}
      </Text>
      <TransactionsSummary />
      <WithQuery query={statementQuery}>
        {({ transactions }) => (
          <>
            {(['income', 'expenses', 'transfer'] as const).map(type => (
              <TransactionList
                key={type}
                total={transactions[type].total}
                transactions={transactions[type].items}
                type={type}
              />
            ))}
          </>
        )}
      </WithQuery>
    </>
  )
}

export default Transactions
