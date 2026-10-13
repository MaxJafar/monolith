import { useEffect } from 'react'

import { EmptyStateScreen, Stack, Text } from '@lifeforge/ui'

import type { EntityBreakdown } from '@/hooks/useEntityBreakdown'
import type { WalletCategory } from '@/hooks/useWalletData'

import { CategoriesTabbedView } from '../../constants/categories_tabbed_view'
import CategoryItem from './CategoryItem'

function CategoryList({
  categories,
  searchQuery,
  breakdown
}: {
  categories: WalletCategory[]
  searchQuery: string
  breakdown: EntityBreakdown
}) {
  const { currentTab, setAmounts } = CategoriesTabbedView.useContext()

  useEffect(() => {
    setAmounts({
      income: categories.filter(c => c.type === 'income').length,
      expenses: categories.filter(c => c.type === 'expenses').length
    })
  }, [categories, setAmounts])

  if (categories.length === 0) {
    return (
      <EmptyStateScreen
        icon="tabler:apps-off"
        message={{
          id: 'categories'
        }}
      />
    )
  }

  const query = searchQuery.trim().toLowerCase()

  const filteredCategories = categories.filter(
    category =>
      category.type === currentTab &&
      category.name.toLowerCase().includes(query)
  )

  if (filteredCategories.length === 0) {
    return query ? (
      <EmptyStateScreen
        icon="tabler:search-off"
        message={{
          id: 'results'
        }}
      />
    ) : (
      <Stack>
        <Text align="center" color="muted">
          No {currentTab} categories found
        </Text>
      </Stack>
    )
  }

  return (
    <Stack>
      {filteredCategories.map(category => (
        <CategoryItem
          key={category.id}
          breakdown={breakdown[category.id]}
          category={category}
        />
      ))}
    </Stack>
  )
}

export default CategoryList
