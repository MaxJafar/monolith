import { useContext, useMemo } from 'react'
import { Link } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import { Box, Card, Flex, Icon, Stack, Text, surface } from '@monolith/ui'

import type { WalletCategory } from '@/hooks/useWalletData'
import { useWalletStore } from '@/stores/useWalletStore'
import getDateRange from '@/utils/getDateRange'

import { CategoriesBreakdownContext } from '..'
import numberToCurrency from '../../../../../utils/numberToCurrency'

function BreakdownCategoryItem({ category }: { category: WalletCategory }) {
  const { t } = useModuleTranslation()
  const { isAmountHidden } = useWalletStore()

  const { breakdown, type, range, startDate, endDate } = useContext(
    CategoriesBreakdownContext
  )

  const filterParams = useMemo(() => {
    const dates = getDateRange(
      range,
      startDate || undefined,
      endDate || undefined
    )

    const params = new URLSearchParams({ type, category: category.id })

    if (dates.startDate) params.set('startDate', dates.startDate)

    if (dates.endDate) params.set('endDate', dates.endDate)

    return `?${params.toString()}`
  }, [range, startDate, endDate, type, category.id])

  return (
    <Card
      key={category.id}
      as={Link}
      bg={surface.lightInteractive}
      direction="row"
      gap="lg"
      justify="between"
      minWidth="0"
      to={`/wallet/transactions${filterParams}`}
      width="100%"
    >
      <Flex align="center" gap="md" minWidth="0" width="100%">
        <Box
          p="sm"
          r="md"
          style={{
            backgroundColor: category.color + '20',
            color: category.color
          }}
        >
          <Icon icon={category.icon} size="1.5rem" />
        </Box>
        <Stack gap="none" minWidth="0">
          <Text truncate weight="semibold">
            {category.name}
          </Text>
          <Text color="muted" size="sm" whiteSpace="nowrap">
            {breakdown[category.id]?.count} {t('transactionCount')}
          </Text>
        </Stack>
      </Flex>
      <Stack align="end" flexShrink="0" gap="none" width="min-content">
        <Flex align={isAmountHidden ? 'center' : 'end'} gap="sm">
          <Text
            color={type === 'income' ? 'green-500' : 'red-500'}
            weight="medium"
            whiteSpace="nowrap"
          >
            {type === 'income' ? '+' : '-'} RM{' '}
            {isAmountHidden ? (
              <Flex align="center" display="inline-flex">
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <Icon key={i} icon="uil:asterisk" size="1rem" />
                  ))}
              </Flex>
            ) : (
              numberToCurrency(breakdown[category.id]?.amount ?? 0)
            )}
          </Text>
        </Flex>
        <Text align="right" color="muted" size="sm">
          {breakdown[category.id]?.percentage.toFixed(2)}%
        </Text>
      </Stack>
    </Card>
  )
}

export default BreakdownCategoryItem
