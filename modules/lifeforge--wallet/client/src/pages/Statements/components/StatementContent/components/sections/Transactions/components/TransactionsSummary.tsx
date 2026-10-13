import { useModuleTranslation } from '@lifeforge/localization'
import { Flex, Icon, Text, WithQuery, colorWithOpacity } from '@lifeforge/ui'

import { useStatementData } from '@/pages/Statements/providers/StatementDataProvider'

function TransactionsSummary() {
  const { statementQuery } = useStatementData()
  const { t } = useModuleTranslation()

  const ROWS = [
    {
      type: 'income' as const,
      label: t('transactionTypes.income'),
      icon: 'tabler:login-2',
      color: 'green-500'
    },
    {
      type: 'expenses' as const,
      label: t('transactionTypes.expenses'),
      icon: 'tabler:logout',
      color: 'red-500'
    },
    {
      type: 'transfer' as const,
      label: t('transactionTypes.transfer'),
      icon: 'tabler:arrows-exchange',
      color: 'blue-500'
    }
  ] as const

  return (
    <WithQuery query={statementQuery}>
      {({ transactions }) => (
        <Flex direction="column" mt="lg" width="100%">
          {ROWS.map((row, index) => (
            <Flex
              key={row.label}
              align="center"
              bg={
                index % 2 === 1 ? colorWithOpacity('bg-500', '5%') : undefined
              }
              justify="between"
              p="md"
            >
              <Flex align="center" gap="sm">
                <Icon color={row.color} icon={row.icon} size="1.5rem" />
                <Text size="xl">{row.label}</Text>
              </Flex>
              <Text size="lg">
                {transactions[row.type].count} {t('transactionCount')}
              </Text>
            </Flex>
          ))}
          <Flex
            align="center"
            bg={colorWithOpacity('bg-500', '5%')}
            justify="between"
          >
            <Text p="md" size="xl" weight="semibold">
              {t('statement.total')}
            </Text>
            <Text
              p="md"
              size="lg"
              style={{ borderTop: '2px solid', borderBottom: '6px double' }}
              weight="medium"
            >
              {transactions.totalCount} {t('transactionCount')}
            </Text>
          </Flex>
        </Flex>
      )}
    </WithQuery>
  )
}

export default TransactionsSummary
