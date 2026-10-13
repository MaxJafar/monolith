import { DIFFICULTIES } from '@'
import { useQuery } from '@tanstack/react-query'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Flex,
  SearchInput,
  TagsFilter,
  Text,
  useModuleSidebarState
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

import useFilter from '../hooks/useFilter'

function InnerHeader({ totalItemsCount }: { totalItemsCount: number }) {
  const { t } = useModuleTranslation()
  const { setIsSidebarOpen } = useModuleSidebarState()
  const categoriesQuery = useQuery(forgeAPI.categories.list.queryOptions())
  const { filter, updateFilter, searchQuery, setSearchQuery } = useFilter()

  return (
    <>
      <Flex align="center" as="header" justify="between">
        <Flex align="baseline" minWidth="0">
          <Text
            truncate
            as="h1"
            size={{ base: '2xl', xl: '3xl' }}
            weight="semibold"
          >
            {t(`headers.${filter.difficulty || 'all'}`)}{' '}
            {filter.category ? `(${t('headers.filtered')})` : ''}
          </Text>
          <Text color="muted" ml="sm" mr="xl">
            ({totalItemsCount})
          </Text>
        </Flex>
        <Button
          display={{ base: 'flex', lg: 'none' }}
          icon="tabler:menu"
          variant="plain"
          onClick={() => {
            setIsSidebarOpen(true)
          }}
        />
      </Flex>
      <TagsFilter
        availableFilters={{
          category: {
            data:
              categoriesQuery.data?.map(category => ({
                id: category.id,
                icon: category.icon,
                color: category.color,
                label: category.name
              })) || [],
            isColored: true
          },
          difficulty: {
            data: Object.entries(DIFFICULTIES).map(([key, color]) => ({
              id: key,
              label: t(`difficulties.${key}`),
              icon: 'tabler:circle-dot',
              color
            })),
            isColored: true
          }
        }}
        values={{
          category: filter.category,
          difficulty: filter.difficulty
        }}
        onChange={{
          category: value => {
            updateFilter('category', value)
          },
          difficulty: value => {
            updateFilter('difficulty', value)
          }
        }}
      />
      <SearchInput
        debounceMs={300}
        mt="md"
        searchTarget="achievement"
        value={searchQuery}
        onChange={setSearchQuery}
      />
    </>
  )
}

export default InnerHeader
