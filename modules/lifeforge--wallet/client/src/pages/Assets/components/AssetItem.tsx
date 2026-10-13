import { useQuery } from '@tanstack/react-query'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Card,
  Flex,
  Icon,
  Stack,
  TagChip,
  Text,
  surface
} from '@lifeforge/ui'

import LiabilityUtilisation from '@/components/LiabilityUtilisation'
import type { WalletAsset } from '@/hooks/useWalletData'
import { forgeAPI } from '@/manifest'
import { useWalletStore } from '@/stores/useWalletStore'
import getLiabilityUtilisation from '@/utils/getLiabilityUtilisation'
import numberToCurrency from '@/utils/numberToCurrency'

import AssetAmount from './AssetAmount'
import AssetBalanceChart from './AssetBalanceChart'
import AssetContextMenu from './AssetContextMenu'
import AssetDelta from './AssetDelta'

function AssetItem({
  asset,
  rangeMode
}: {
  asset: WalletAsset
  rangeMode: 'week' | 'month' | 'quarter' | 'year' | 'all'
}) {
  const { t } = useModuleTranslation()
  const { isAmountHidden } = useWalletStore()

  const balanceQuery = useQuery(
    forgeAPI.assets.getAssetAccumulatedBalance
      .input({
        id: asset.id,
        rangeMode
      })
      .queryOptions()
  )

  const delta = balanceQuery.data
    ? balanceQuery.data.endBalance - balanceQuery.data.startBalance
    : 0

  const deltaPercent =
    balanceQuery.data && Math.abs(balanceQuery.data.startBalance) > 0
      ? (delta / Math.abs(balanceQuery.data.startBalance)) * 100
      : 0

  const { over, overBy } = getLiabilityUtilisation(asset)

  return (
    <Card
      direction={{ base: 'column', md: 'row' }}
      gapX="2xl"
      gapY="lg"
      justify="between"
    >
      <Flex align="center" gap="md">
        <Box bg={surface.light} color="muted" p="sm" r="md">
          <Icon icon={asset.icon} />
        </Box>
        <Stack gap="xs" minWidth="0">
          <Flex align="center" gap="md">
            <Text as="h2" size="xl" weight="medium">
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
          {over && (
            <Flex align="center" color="dangerous" gap="xs">
              <Icon icon="tabler:alert-triangle" size="1.25rem" />
              <Text size="sm" weight="medium">
                {t('labels.overLimit')} · RM {numberToCurrency(overBy)}
              </Text>
            </Flex>
          )}
        </Stack>
      </Flex>
      <Flex align="center" gap="lg" justify="between">
        <Stack align={{ base: 'start', md: 'end' }} gap="none">
          <AssetAmount amount={asset.current_balance} />
          {balanceQuery.data && !isAmountHidden && (
            <AssetDelta delta={delta} deltaPercent={deltaPercent} />
          )}
        </Stack>
        <AssetBalanceChart asset={asset} rangeMode={rangeMode} />
        <AssetContextMenu asset={asset} />
      </Flex>
    </Card>
  )
}

export default AssetItem
