import { useModuleTranslation } from '@lifeforge/localization'
import { Flex, Text, WithQuery, colorWithOpacity } from '@lifeforge/ui'

import { useStatementData } from '@/pages/Statements/providers/StatementDataProvider'
import numberToCurrency from '@/utils/numberToCurrency'

function OverviewSummary() {
  const { statementQuery } = useStatementData()
  const { t } = useModuleTranslation()

  return (
    <WithQuery query={statementQuery}>
      {({ overview }) => {
        const { monthlyIncome, monthlyExpenses, netIncome } = overview

        return (
          <Flex direction="column" mt="lg" width="100%">
            <Flex align="center" justify="between" p="md">
              <Text size="xl">{t('statement.income')}</Text>
              <Text size="lg">RM {numberToCurrency(monthlyIncome)}</Text>
            </Flex>
            <Flex
              align="center"
              bg={colorWithOpacity('bg-500', '5%')}
              justify="between"
              p="md"
            >
              <Text size="xl">{t('statement.expenses')}</Text>
              <Text size="lg">RM ({numberToCurrency(monthlyExpenses)})</Text>
            </Flex>
            <Flex align="center" justify="between">
              <Text p="md" size="xl" weight="semibold">
                {t('statement.netIncomeLoss')}
              </Text>
              <Text
                color={netIncome < 0 ? 'rose-600' : undefined}
                p="md"
                size="lg"
                style={{ borderTop: '2px solid', borderBottom: '6px double' }}
                weight="medium"
              >
                RM{' '}
                {netIncome >= 0
                  ? numberToCurrency(netIncome)
                  : `(${numberToCurrency(Math.abs(netIncome))})`}
              </Text>
            </Flex>
          </Flex>
        )
      }}
    </WithQuery>
  )
}

export default OverviewSummary
