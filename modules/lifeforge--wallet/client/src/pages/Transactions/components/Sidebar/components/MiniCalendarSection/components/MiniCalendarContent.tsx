import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'

import { Grid, Text, WithQuery, usePersonalization } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

import MiniCalendarDateItem from './MiniCalendarDateItem'

function MiniCalendarContent({
  currentMonth,
  currentYear,
  viewsFilter
}: {
  currentMonth: number
  currentYear: number
  viewsFilter: ('income' | 'expenses' | 'transfer')[]
}) {
  const { language } = usePersonalization()
  const [nextToSelect, setNextToSelect] = useState<'start' | 'end'>('start')

  const transactionCountQuery = useQuery(
    forgeAPI.analytics.getTransactionCountByDay
      .input({
        year: currentYear.toString(),
        month: currentMonth.toString(),
        viewFilter: viewsFilter.join(',')
      })
      .queryOptions()
  )

  const firstDateOfMonth = useMemo(
    () => dayjs(`${currentYear}-${currentMonth + 1}-01`, 'YYYY-M-DD').toDate(),
    [currentMonth, currentYear]
  )

  return (
    <WithQuery query={transactionCountQuery}>
      {transactionCountMap => {
        const dailyAmounts = Object.values(transactionCountMap)
          .map(
            day => day.incomeAmount + day.expensesAmount + day.transferAmount
          )
          .filter(amount => amount > 0)
          .sort((a, b) => a - b)

        const referenceAmount =
          dailyAmounts.length > 0
            ? dailyAmounts[Math.ceil(dailyAmounts.length * 0.9) - 1]
            : 0

        return (
          <Grid gapY="sm" templateCols={7}>
            {{
              en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              'zh-CN': ['一', '二', '三', '四', '五', '六', '日'],
              'zh-TW': ['一', '二', '三', '四', '五', '六', '日'],
              ms: ['Is', 'Se', 'Ra', 'Kh', 'Ju', 'Sa', 'Ah']
            }[language]?.map(day => (
              <Text key={day} align="center" color="muted" size="sm">
                {day}
              </Text>
            ))}
            {Array(
              Math.ceil(
                (dayjs().year(currentYear).month(currentMonth).daysInMonth() +
                  dayjs()
                    .year(currentYear)
                    .month(currentMonth - 1)
                    .endOf('month')
                    .day()) /
                  7
              ) * 7
            )
              .fill(0)
              .map((_, index) => (
                <MiniCalendarDateItem
                  key={index}
                  date={firstDateOfMonth}
                  index={index}
                  nextToSelect={nextToSelect}
                  referenceAmount={referenceAmount ?? 0}
                  setNextToSelect={setNextToSelect}
                  transactionCountMap={transactionCountMap}
                />
              ))}
          </Grid>
        )
      }}
    </WithQuery>
  )
}

export default MiniCalendarContent
