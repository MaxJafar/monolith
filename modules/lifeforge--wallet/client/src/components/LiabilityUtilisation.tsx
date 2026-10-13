import { Flex, Icon, Text } from '@lifeforge/ui'

import type { WalletAsset } from '@/hooks/useWalletData'
import { useWalletStore } from '@/stores/useWalletStore'
import getLiabilityUtilisation from '@/utils/getLiabilityUtilisation'
import numberToCurrency from '@/utils/numberToCurrency'

function LiabilityUtilisation({
  asset,
  size = 'sm'
}: {
  asset: WalletAsset
  size?: 'sm' | 'base'
}) {
  const { isAmountHidden } = useWalletStore()

  const { used, limit, hasLimit, percentage, over } =
    getLiabilityUtilisation(asset)

  if (!hasLimit || isAmountHidden) {
    return null
  }

  return (
    <Flex align="center" color={over ? 'dangerous' : 'muted'} gap="xs">
      <Icon icon="tabler:credit-card" size="1rem" />
      <Text size={size}>
        {numberToCurrency(used)} / {numberToCurrency(limit)} ·{' '}
        {percentage.toFixed(0)}%
      </Text>
    </Flex>
  )
}

export default LiabilityUtilisation
