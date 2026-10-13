import { useModuleTranslation } from '@lifeforge/localization'
import { Text } from '@lifeforge/ui'

import AssetsTable from './components/AssetsTable'
import IncomeExpensesTable from './components/IncomeExpensesTable'
import OverviewSummary from './components/OverviewSummary'
import PlatformsTable from './components/PlatformsTable'

function Overview({ month, year }: { month: number; year: number }) {
  const { t } = useModuleTranslation()

  return (
    <>
      <Text
        as="h2"
        mt="3xl"
        size={{ base: '3xl', print: '2xl' }}
        tracking="widest"
        transform="uppercase"
        weight="semibold"
      >
        <Text color={{ base: 'custom-500', print: 'custom-600' }}>01. </Text>
        {t('statement.overview')}
      </Text>
      <OverviewSummary />
      <Text
        as="h2"
        mt="3xl"
        size={{ base: '2xl', print: 'lg' }}
        tracking="widest"
        transform="uppercase"
        weight="semibold"
      >
        <Text>1.1 </Text>
        {t('statement.assets')}
      </Text>
      <AssetsTable month={month} />
      {(['income', 'expenses'] as const).map(type => (
        <IncomeExpensesTable key={type} month={month} type={type} year={year} />
      ))}
      <PlatformsTable />
    </>
  )
}

export default Overview
