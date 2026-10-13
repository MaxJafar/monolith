import { useState } from 'react'

import { SearchInput, WithQuery, surface } from '@lifeforge/ui'

import useEntityBreakdown from '@/hooks/useEntityBreakdown'
import { useWalletData } from '@/hooks/useWalletData'

import { CategoriesTabbedView } from '../../constants/categories_tabbed_view'
import CategoryList from './CategoryList'

function CategoriesSection() {
  const { categoriesQuery } = useWalletData()
  const { data: breakdown } = useEntityBreakdown()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <CategoriesTabbedView.Root>
      <CategoriesTabbedView.Selector />
      <SearchInput
        bg={surface.lightInteractive}
        debounceMs={300}
        my="md"
        searchTarget="category"
        value={searchQuery}
        onChange={setSearchQuery}
      />
      <WithQuery query={categoriesQuery}>
        {categories => (
          <CategoryList
            breakdown={breakdown?.categories ?? {}}
            categories={categories}
            searchQuery={searchQuery}
          />
        )}
      </WithQuery>
    </CategoriesTabbedView.Root>
  )
}

export default CategoriesSection
