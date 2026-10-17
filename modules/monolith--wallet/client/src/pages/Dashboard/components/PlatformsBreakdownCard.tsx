import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Card,
  EmptyStateScreen,
  Flex,
  Icon,
  Scrollbar,
  Stack,
  Text,
  Widget,
  WithQuery,
  surface
} from '@monolith/ui'

import { useWalletData } from '@/hooks/useWalletData'
import { workspaceAPI } from '@/manifest'
import { useWalletRange } from '@/providers/RangeProvider'
import { useWalletStore } from '@/stores/useWalletStore'
import numberToCurrency from '@/utils/numberToCurrency'

function PlatformsBreakdownCard() {
  const { platformsQuery } = useWalletData()
  const { isAmountHidden } = useWalletStore()
  const { t } = useModuleTranslation()
  const { queryInput } = useWalletRange()

  const breakdownQuery = useQuery(
    workspaceAPI.analytics.getSpendingByPlatform.input(queryInput).queryOptions()
  )

  const platforms = platformsQuery.data ?? []

  return (
    <Widget
      actionComponent={
        <Button
          as={Link}
          p="xs"
          to="/wallet/transactions?type=expenses"
          variant="plain"
        >
          <Icon icon="tabler:chevron-right" />
        </Button>
      }
      icon="tabler:building-store"
      title="Platforms Breakdown"
    >
      <WithQuery query={breakdownQuery}>
        {breakdown =>
          breakdown.length === 0 ? (
            <EmptyStateScreen
              smaller
              message={{
                id: 'platforms'
              }}
            />
          ) : (
            <Scrollbar>
              <Stack gap="sm">
                {breakdown.map(item => {
                  const platform = platforms.find(p => p.id === item.platform)

                  const color = platform?.color ?? '#71717a'

                  return (
                    <Card
                      key={item.platform}
                      as={Link}
                      bg={surface.lightInteractive}
                      direction="row"
                      gap="md"
                      justify="between"
                      to={`/wallet/transactions?type=expenses&platform=${item.platform}`}
                      width="100%"
                    >
                      <Flex align="center" gap="md" minWidth="0" width="100%">
                        <Box
                          p="sm"
                          r="md"
                          style={{
                            backgroundColor: color + '20',
                            color
                          }}
                        >
                          <Icon
                            icon={platform?.icon ?? 'tabler:building-store'}
                            size="1.5rem"
                          />
                        </Box>
                        <Stack gap="none" minWidth="0">
                          <Text truncate weight="semibold">
                            {platform?.name}
                          </Text>
                          <Text color="muted" size="sm" whiteSpace="nowrap">
                            {item.count} {t('transactionCount')}
                          </Text>
                        </Stack>
                      </Flex>
                      <Stack
                        align="end"
                        flexShrink="0"
                        gap="none"
                        width="min-content"
                      >
                        <Text
                          color="red-500"
                          weight="medium"
                          whiteSpace="nowrap"
                        >
                          {isAmountHidden ? (
                            <Flex align="center" display="inline-flex">
                              {Array(4)
                                .fill(0)
                                .map((_, i) => (
                                  <Icon
                                    key={i}
                                    icon="uil:asterisk"
                                    size="1rem"
                                  />
                                ))}
                            </Flex>
                          ) : (
                            `- RM ${numberToCurrency(item.amount)}`
                          )}
                        </Text>
                        <Text align="right" color="muted" size="sm">
                          {item.percentage.toFixed(2)}%
                        </Text>
                      </Stack>
                    </Card>
                  )
                })}
              </Stack>
            </Scrollbar>
          )
        }
      </WithQuery>
    </Widget>
  )
}

export default PlatformsBreakdownCard
