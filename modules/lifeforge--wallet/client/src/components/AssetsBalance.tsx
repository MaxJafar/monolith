import { Link, useNavigate } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  EmptyStateScreen,
  Flex,
  Icon,
  Scrollbar,
  Stack,
  TagChip,
  Text,
  Widget,
  WithQuery,
  surface
} from '@lifeforge/ui'

import LiabilityUtilisation from '@/components/LiabilityUtilisation'
import NetWorthSummary from '@/components/NetWorthSummary'
import { useWalletData } from '@/hooks/useWalletData'
import { useWalletStore } from '@/stores/useWalletStore'
import numberToCurrency from '@/utils/numberToCurrency'

function AssetsBalance({ isWidget = false }: { isWidget?: boolean }) {
  const navigate = useNavigate()
  const { assetsQuery } = useWalletData()
  const { isAmountHidden, toggleAmountVisibility } = useWalletStore()
  const { t } = useModuleTranslation()

  return (
    <Widget
      actionComponent={
        <Flex align="center" gap="xs">
          {isWidget && (
            <Button
              icon={isAmountHidden ? 'tabler:eye-off' : 'tabler:eye'}
              p="xs"
              variant="plain"
              onClick={toggleAmountVisibility}
            />
          )}
          <Button as={Link} p="xs" to="/wallet/assets" variant="plain">
            <Icon icon="tabler:chevron-right" />
          </Button>
        </Flex>
      }
      icon="tabler:wallet"
      title="Assets Balance"
    >
      <WithQuery query={assetsQuery}>
        {assets =>
          assets.length > 0 ? (
            <Stack gap="lg" height="100%" width="100%">
              <Card bg={surface.light}>
                <NetWorthSummary assets={assets} />
              </Card>
              <Scrollbar>
                <Stack as="ul" gap="sm" pb="sm">
                  {assets.map(asset => (
                    <Card
                      key={asset.id}
                      align="center"
                      as={Link}
                      bg={surface.lightInteractive}
                      direction={{ base: 'column', sm: 'row' }}
                      gap="md"
                      to={`/wallet/transactions?asset=${asset.id}`}
                    >
                      <Stack gap="xs" minWidth="0" width="100%">
                        <Flex align="center" gap="md" minWidth="0">
                          <Icon icon={asset.icon} size="1.5rem" />
                          <Text truncate weight="semibold">
                            {asset.name}
                          </Text>
                          {asset.is_liability && (
                            <TagChip
                              color="#ef4444"
                              icon="tabler:credit-card"
                              label={t('tags.liability')}
                            />
                          )}
                        </Flex>
                        <LiabilityUtilisation asset={asset} />
                      </Stack>
                      <Flex
                        align={isAmountHidden ? 'center' : 'end'}
                        gap="sm"
                        mt={{ base: 'md', sm: 'none' }}
                      >
                        <Text color="muted" size="xl">
                          RM
                        </Text>
                        {isAmountHidden ? (
                          <Flex align="center">
                            {Array(4)
                              .fill(0)
                              .map((_, i) => (
                                <Icon key={i} icon="uil:asterisk" size="1rem" />
                              ))}
                          </Flex>
                        ) : (
                          <Text size="3xl" weight="medium">
                            {numberToCurrency(asset.current_balance)}
                          </Text>
                        )}
                      </Flex>
                    </Card>
                  ))}
                </Stack>
              </Scrollbar>
            </Stack>
          ) : (
            <EmptyStateScreen
              smaller
              CTAButtonProps={{
                children: 'new',
                icon: 'tabler:plus',
                onClick: () => {
                  navigate('/wallet/assets#new')
                },
                tProps: { item: t('items.asset') }
              }}
              icon="tabler:wallet-off"
              message={{
                id: 'assets'
              }}
            />
          )
        }
      </WithQuery>
    </Widget>
  )
}

export default AssetsBalance
