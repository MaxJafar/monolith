import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Flex,
  Stack,
  TagsFilter,
  Text,
  useModuleSidebarState
} from '@lifeforge/ui'

import useFilter from '@/hooks/useFilter'
import useTransactionsQuery from '@/hooks/useTransactionsQuery'
import { useWalletData } from '@/hooks/useWalletData'

function InnerHeader() {
  const { t } = useModuleTranslation(['common.buttons'])
  const { setIsSidebarOpen } = useModuleSidebarState()

  const { assetsQuery, categoriesQuery, ledgersQuery, platformsQuery } =
    useWalletData()

  const { searchQuery, type, category, platform, asset, ledger, updateFilter } =
    useFilter()

  const transactionsQuery = useTransactionsQuery()

  const assets = assetsQuery.data ?? []

  const categories = categoriesQuery.data ?? []

  const platforms = platformsQuery.data ?? []

  const ledgers = ledgersQuery.data ?? []

  return (
    <Flex align="center" justify="between">
      <Stack>
        <Text as="h1" size={{ base: '3xl', lg: '4xl' }} weight="semibold">
          {t(
            `header.${
              !type &&
              !category &&
              !platform &&
              !asset &&
              !ledger &&
              searchQuery === ''
                ? 'all'
                : 'filtered'
            }Transactions`
          )}{' '}
          <Text color="muted" size="base">
            ({(transactionsQuery.data?.totalItems ?? 0).toLocaleString()})
          </Text>
        </Text>
        <TagsFilter
          availableFilters={{
            type: {
              data: [
                {
                  id: 'income',
                  icon: 'tabler:login-2',
                  label: 'Income',
                  color: '#22c55e'
                },
                {
                  id: 'expenses',
                  icon: 'tabler:logout',
                  label: 'Expenses',
                  color: '#ef4444'
                },
                {
                  id: 'transfer',
                  icon: 'tabler:transfer',
                  label: 'Transfer',
                  color: '#3b82f6'
                }
              ],
              isColored: true
            },
            category: {
              data: categories.map(category => ({
                id: category.id,
                icon: category.icon,
                color: category.color,
                label: category.name
              })),
              isColored: true
            },
            platform: {
              data: platforms.map(platform => ({
                id: platform.id,
                icon: platform.icon,
                color: platform.color,
                label: platform.name
              })),
              isColored: true
            },
            asset: {
              data: assets.map(asset => ({
                id: asset.id,
                icon: asset.icon,
                label: asset.name
              }))
            },
            ledger: {
              data: ledgers.map(ledger => ({
                id: ledger.id,
                icon: ledger.icon,
                color: ledger.color,
                label: ledger.name
              })),
              isColored: true
            }
          }}
          values={{
            type,
            category,
            platform,
            asset,
            ledger
          }}
          onChange={{
            type: (value: string | null) => updateFilter('type', value ?? ''),
            category: (value: string | null) =>
              updateFilter('category', value ?? ''),
            platform: (value: string | null) =>
              updateFilter('platform', value ?? ''),
            asset: (value: string | null) => updateFilter('asset', value ?? ''),
            ledger: (value: string | null) =>
              updateFilter('ledger', value ?? '')
          }}
        />
      </Stack>
      <Button
        display={{ xl: 'none' }}
        icon="tabler:menu"
        variant="plain"
        onClick={() => {
          setIsSidebarOpen(true)
        }}
      />
    </Flex>
  )
}

export default InnerHeader
