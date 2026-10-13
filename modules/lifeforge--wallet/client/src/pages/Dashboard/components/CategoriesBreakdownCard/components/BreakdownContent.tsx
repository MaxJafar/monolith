import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { EmptyStateScreen, Stack, WithQuery } from '@lifeforge/ui'

import { type WalletCategory, useWalletData } from '@/hooks/useWalletData'
import { forgeAPI } from '@/manifest'
import { useWalletRange } from '@/providers/RangeProvider'

import { CategoriesBreakdownContext } from '..'
import BreakdownChartLegend from './BreakdownChartLegend'
import BreakdownDetails from './BreakdownDetails'
import BreakdownDoughnutChart from './BreakdownDoughnutChart'
import BreakdownFilters from './BreakdownFilters'

function BreakdownContent({
  selectedType,
  setSelectedType
}: {
  selectedType: 'income' | 'expenses'
  setSelectedType: (type: 'income' | 'expenses') => void
}) {
  const { categoriesQuery } = useWalletData()
  const { range, startDate, endDate, queryInput } = useWalletRange()

  const categoriesBreakdownQuery = useQuery(
    forgeAPI.analytics.getCategoriesBreakdown.input(queryInput).queryOptions()
  )

  const currentBreakdown = categoriesBreakdownQuery.data?.[selectedType] ?? {}

  const filteredCategories = useMemo(
    () =>
      Object.keys(currentBreakdown)
        .map(
          categoryId =>
            categoriesQuery.data?.find(
              category => category.id === categoryId
            ) ||
            ({
              id: categoryId,
              name: categoryId,
              icon: 'tabler:category',
              color: '#000000'
            } as WalletCategory)
        )
        .filter(e => e),
    [categoriesQuery.data, currentBreakdown]
  )

  const memoizedContextValue = useMemo(() => {
    return {
      breakdown: currentBreakdown,
      categories: filteredCategories,
      type: selectedType,
      range,
      startDate,
      endDate
    }
  }, [
    currentBreakdown,
    filteredCategories,
    selectedType,
    range,
    startDate,
    endDate
  ])

  return (
    <CategoriesBreakdownContext value={memoizedContextValue}>
      <Stack centered flex="1" gap="lg" minHeight="0">
        <BreakdownFilters
          selectedType={selectedType}
          setSelectedType={setSelectedType}
        />
        <WithQuery query={categoriesBreakdownQuery}>
          {data =>
            Object.keys(data[selectedType]).length === 0 ? (
              <EmptyStateScreen
                icon="tabler:wallet-off"
                message={{
                  id: 'transactions'
                }}
              />
            ) : (
              <>
                <BreakdownDoughnutChart />
                <BreakdownChartLegend />
                <BreakdownDetails />
              </>
            )
          }
        </WithQuery>
      </Stack>
    </CategoriesBreakdownContext>
  )
}

export default BreakdownContent
