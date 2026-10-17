import { Flex, Icon, Text } from '@monolith/ui'

import { useWalletData } from '@/hooks/useWalletData'

import { useTransactionDetails } from '../TransactionDetailsContext'
import DetailItem from './DetailItem'

function PlatformSection() {
  const transaction = useTransactionDetails()
  const { platformsQuery } = useWalletData()

  if (transaction.type === 'transfer') return null

  const platform = platformsQuery.data?.find(p => p.id === transaction.platform)

  if (!platform) return null

  return (
    <DetailItem icon="tabler:building-store" label="platform">
      <Flex align="center" gap="xs">
        <Icon
          icon={platform.icon}
          size="1.5rem"
          style={{ color: platform.color }}
        />
        <Text>{platform.name}</Text>
      </Flex>
    </DetailItem>
  )
}

export default PlatformSection
