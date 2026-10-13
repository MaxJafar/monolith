import { useQuery } from '@tanstack/react-query'

import { useModuleTranslation } from '@lifeforge/localization'
import { Flex, Icon, Text, Widget, WithQuery } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'
import { useWalletRange } from '@/providers/RangeProvider'
import { useWalletStore } from '@/stores/useWalletStore'
import numberToCurrency from '@/utils/numberToCurrency'

function IncomeExpenseCard({ title, icon }: { title: string; icon: string }) {
  const isIncome = title.toLowerCase() === 'income'

  const type = isIncome ? 'income' : 'expenses'

  const { t } = useModuleTranslation()
  const { queryInput } = useWalletRange()
  const { isAmountHidden } = useWalletStore()

  const typesCountQuery = useQuery(
    forgeAPI.analytics.getTypesCount.input(queryInput).queryOptions()
  )

  return (
    <Widget icon={icon} title={isIncome ? 'income' : 'expenses'}>
      <WithQuery query={typesCountQuery}>
        {data => {
          const entry = data[type] ?? {
            percentageChange: 0,
            previousAmount: 0,
            accumulatedAmount: 0,
            transactionCount: 0
          }

          const change = entry.percentageChange

          const hasComparison = entry.previousAmount > 0

          const isFlat = Math.abs(change) < 0.05

          const isGood = isIncome ? change >= 0 : change <= 0

          const comparisonColor = isFlat
            ? 'muted'
            : isGood
              ? 'green-500'
              : 'red-500'

          const comparisonIcon = isFlat
            ? 'tabler:minus'
            : change > 0
              ? 'tabler:trending-up'
              : 'tabler:trending-down'

          return (
            <Flex direction="column" height="100%" justify="evenly">
              <Flex align="end" gap="sm" height="auto" width="100%">
                <Flex asChild align="baseline" gap="sm" height="auto">
                  <Text size={{ base: '4xl', xl: '5xl' }} weight="medium">
                    <Text color="muted" size={{ base: '2xl', xl: '3xl' }}>
                      RM
                    </Text>
                    {isAmountHidden ? (
                      <Flex align="center">
                        {Array(4)
                          .fill(0)
                          .map((_, i) => (
                            <Icon
                              key={i}
                              icon="uil:asterisk"
                              size={{ base: '1.5rem', xl: '2rem' }}
                            />
                          ))}
                      </Flex>
                    ) : (
                      numberToCurrency(entry.accumulatedAmount)
                    )}
                  </Text>
                </Flex>
              </Flex>
              <Flex align="center" gap="sm" mt="md">
                {hasComparison ? (
                  <>
                    <Icon
                      color={comparisonColor}
                      icon={comparisonIcon}
                      size="1.25rem"
                    />
                    <Text color={comparisonColor} whiteSpace="nowrap">
                      {Math.abs(change).toFixed(1)}%
                    </Text>
                    <Text color="muted" whiteSpace="nowrap">
                      {t('labels.vsPrevious')}
                    </Text>
                  </>
                ) : (
                  <Text color="muted" whiteSpace="nowrap">
                    {entry.transactionCount} {t('transactionCount')}
                  </Text>
                )}
              </Flex>
            </Flex>
          )
        }}
      </WithQuery>
    </Widget>
  )
}

export default IncomeExpenseCard
