import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Title,
  Tooltip
} from 'chart.js'
import type { ReactNode } from 'react'

import {
  Box,
  type BoxProps,
  ContextMenu,
  ContextMenuItem,
  Grid,
  ModuleHeader
} from '@monolith/ui'

import AssetsBalance from '@/components/AssetsBalance'
import RangeSelector from '@/components/RangeSelector'
import { RangeProvider } from '@/providers/RangeProvider'
import { useWalletStore } from '@/stores/useWalletStore'

import TransactionCreationMenu from '../Transactions/components/TransactionCreationMenu'
import ActivityCalendarCard from './components/ActivityCalendarCard'
import CategoriesBreakdownCard from './components/CategoriesBreakdownCard'
import IncomeExpenseCard from './components/IncomeExpensesCard'
import PlatformsBreakdownCard from './components/PlatformsBreakdownCard'
import StatisticChartCard from './components/StatisticChartCard'
import TransactionsCard from './components/TransactionsCard'
import { dashboardGrid } from './dashboardGrid.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LogarithmicScale
)

// Each key maps to a named area in `dashboardGrid.css.ts`.
const WIDGETS: {
  key: string
  element: ReactNode
  minHeight?: BoxProps['minHeight']
}[] = [
  {
    key: 'income',
    element: <IncomeExpenseCard icon="tabler:login-2" title="Income" />
  },
  {
    key: 'expenses',
    element: <IncomeExpenseCard icon="tabler:logout-2" title="Expenses" />
  },
  {
    key: 'assetsBalance',
    element: <AssetsBalance />,
    minHeight: { base: '32rem', xl: '0' }
  },
  { key: 'statisticChart', element: <StatisticChartCard /> },
  {
    key: 'activityCalendar',
    element: <ActivityCalendarCard />,
    minHeight: '0'
  },
  {
    key: 'recentTransactions',
    element: <TransactionsCard />,
    minHeight: '0'
  },
  {
    key: 'categoriesBreakdown',
    element: <CategoriesBreakdownCard />,
    minHeight: '0'
  },
  {
    key: 'platformsBreakdown',
    element: <PlatformsBreakdownCard />,
    minHeight: '24rem'
  }
]

function WalletDashboard() {
  const { isAmountHidden, toggleAmountVisibility } = useWalletStore()

  return (
    <RangeProvider>
      <ModuleHeader
        trailing={
          <>
            <TransactionCreationMenu mode="navigate" variant="desktop" />
            <ContextMenu>
              <ContextMenuItem
                checked={isAmountHidden}
                icon="tabler:eye-off"
                label="Hide Amount"
                onClick={() => {
                  toggleAmountVisibility()
                }}
              />
            </ContextMenu>
          </>
        }
      />
      <RangeSelector />
      <Grid className={dashboardGrid} pb="2xl" width="100%">
        {WIDGETS.map(({ key, element, minHeight }) => (
          <Box key={key} gridArea={key} minHeight={minHeight} minWidth="0">
            {element}
          </Box>
        ))}
      </Grid>
      <TransactionCreationMenu mode="navigate" variant="mobile" />
    </RangeProvider>
  )
}

export default WalletDashboard
