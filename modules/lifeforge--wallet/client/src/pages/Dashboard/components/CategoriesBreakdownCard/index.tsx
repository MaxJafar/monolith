import { createContext, useState } from 'react'
import { Link } from 'react-router'

import type { InferOutput } from '@lifeforge/api'
import { Button, Icon, Widget } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'
import type { WalletRange } from '@/providers/RangeProvider'

import type { WalletCategory } from '../../../Transactions'
import BreakdownContent from './components/BreakdownContent'

type CategoryBreakdown = InferOutput<
  typeof forgeAPI.analytics.getCategoriesBreakdown
>['income']

export const CategoriesBreakdownContext = createContext<{
  breakdown: CategoryBreakdown
  categories: WalletCategory[]
  type: 'income' | 'expenses'
  range: WalletRange
  startDate: string
  endDate: string
}>({
  breakdown: {},
  categories: [],
  type: 'expenses',
  range: 'mtd',
  startDate: '',
  endDate: ''
})

function CategoriesBreakdownCard() {
  const [selectedType, setSelectedType] = useState<'income' | 'expenses'>(
    'expenses'
  )

  return (
    <Widget
      actionComponent={
        <Button
          as={Link}
          p="xs"
          to={`/wallet/transactions?type=${selectedType}`}
          variant="plain"
        >
          <Icon icon="tabler:chevron-right" />
        </Button>
      }
      icon="tabler:chart-donut-3"
      title="Categories Breakdown"
    >
      <BreakdownContent
        selectedType={selectedType}
        setSelectedType={setSelectedType}
      />
    </Widget>
  )
}

export default CategoriesBreakdownCard
