import { EmptyStateScreen, Stack } from '@lifeforge/ui'

import type { EntityBreakdown } from '@/hooks/useEntityBreakdown'
import type { WalletPlatform } from '@/hooks/useWalletData'

import PlatformItem from './PlatformItem'

function PlatformList({
  platforms,
  searchQuery,
  breakdown
}: {
  platforms: WalletPlatform[]
  searchQuery: string
  breakdown: EntityBreakdown
}) {
  if (platforms.length === 0) {
    return (
      <EmptyStateScreen
        icon="tabler:building-store-off"
        message={{
          id: 'platforms'
        }}
      />
    )
  }

  const query = searchQuery.trim().toLowerCase()

  const filtered = platforms.filter(platform =>
    platform.name.toLowerCase().includes(query)
  )

  if (filtered.length === 0) {
    return (
      <EmptyStateScreen
        icon="tabler:search-off"
        message={{
          id: 'results'
        }}
      />
    )
  }

  return (
    <Stack>
      {filtered.map(platform => (
        <PlatformItem
          key={platform.id}
          breakdown={breakdown[platform.id]}
          platform={platform}
        />
      ))}
    </Stack>
  )
}

export default PlatformList
