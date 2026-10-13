import { useModuleTranslation } from '@lifeforge/localization'
import { Flex, Icon, Stack, Text } from '@lifeforge/ui'

import type { WalletAsset } from '@/hooks/useWalletData'
import { useWalletStore } from '@/stores/useWalletStore'
import numberToCurrency from '@/utils/numberToCurrency'

function Amount({
  amount,
  hidden,
  hero = false
}: {
  amount: number
  hidden: boolean
  hero?: boolean
}) {
  return (
    <Flex align="baseline" gap="xs">
      <Text color="muted" size={hero ? 'xl' : 'sm'}>
        RM
      </Text>
      {hidden ? (
        <Flex align="center">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Icon
                key={i}
                icon="uil:asterisk"
                size={hero ? '1.5rem' : '0.9rem'}
              />
            ))}
        </Flex>
      ) : (
        <Text size={hero ? '3xl' : 'base'} weight="semibold">
          {numberToCurrency(amount)}
        </Text>
      )}
    </Flex>
  )
}

function SupportingStat({
  label,
  amount,
  hidden
}: {
  label: string
  amount: number
  hidden: boolean
}) {
  return (
    <Flex align="baseline" gap="sm">
      <Text color="muted" size="sm">
        {label}
      </Text>
      <Amount amount={amount} hidden={hidden} />
    </Flex>
  )
}

function NetWorthSummary({
  assets,
  hidden,
  spread = false
}: {
  assets: WalletAsset[]
  hidden?: boolean
  spread?: boolean
}) {
  const { t } = useModuleTranslation()
  const { isAmountHidden } = useWalletStore()

  const effectiveHidden = hidden ?? isAmountHidden

  const totalAssets = assets
    .filter(asset => !asset.is_liability)
    .reduce((sum, asset) => sum + asset.current_balance, 0)

  const totalLiabilities = assets
    .filter(asset => asset.is_liability)
    .reduce((sum, asset) => sum + Math.abs(asset.current_balance), 0)

  const netWorth = totalAssets - totalLiabilities

  return (
    <Flex
      align={{ base: 'start', lg: spread ? 'end' : 'start' }}
      direction={{ base: 'column', lg: spread ? 'row' : 'column' }}
      gap="sm"
      justify={{ base: 'start', lg: spread ? 'between' : 'start' }}
      width="100%"
    >
      <Stack gap="none">
        <Text color="muted" size="sm" transform="uppercase" weight="medium">
          {t('widgets.netWorth')}
        </Text>
        <Amount hero amount={netWorth} hidden={effectiveHidden} />
      </Stack>
      <Flex align="baseline" gapX="xl" gapY="xs" wrap="wrap">
        <SupportingStat
          amount={totalAssets}
          hidden={effectiveHidden}
          label={t('widgets.totalAssets')}
        />
        <SupportingStat
          amount={totalLiabilities}
          hidden={effectiveHidden}
          label={t('widgets.totalLiabilities')}
        />
      </Flex>
    </Flex>
  )
}

export default NetWorthSummary
