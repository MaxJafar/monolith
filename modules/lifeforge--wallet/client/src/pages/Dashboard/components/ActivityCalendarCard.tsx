import { useQuery } from '@tanstack/react-query'
import { cloneElement, useState } from 'react'
import { ActivityCalendar } from 'react-activity-calendar'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  EmptyStateScreen,
  Flex,
  Icon,
  Listbox,
  ListboxOption,
  Text,
  Tooltip,
  Widget,
  WithQuery,
  usePersonalization
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'
import { useWalletRange } from '@/providers/RangeProvider'
import numberToCurrency from '@/utils/numberToCurrency'

const TYPE_COLORS = {
  income: 'rgb(34 197 94)',
  expenses: 'rgb(239 68 68)'
} as const

function ActivityCalendarCard() {
  const { t } = useModuleTranslation()
  const { derivedTheme } = usePersonalization()
  const { queryInput } = useWalletRange()

  const [selectedType, setSelectedType] = useState<'income' | 'expenses'>(
    'expenses'
  )

  const dataQuery = useQuery(
    forgeAPI.analytics.getDailyBreakdown.input(queryInput).queryOptions()
  )

  return (
    <Widget
      icon="tabler:calendar-stats"
      style={{ minHeight: 'min-content' }}
      title="activityCalendar"
    >
      <WithQuery query={dataQuery}>
        {data => {
          const values = data
            .map(item =>
              selectedType === 'income' ? item.income : item.expenses
            )
            .filter(value => value > 0)
            .sort((a, b) => a - b)

          const threshold = (percentile: number) =>
            values[Math.floor((values.length - 1) * percentile)] ?? 0

          const thresholds = [
            threshold(0.25),
            threshold(0.5),
            threshold(0.75)
          ] as const

          const getLevel = (value: number) => {
            if (value <= 0) return 0
            if (value <= thresholds[0]) return 1
            if (value <= thresholds[1]) return 2
            if (value <= thresholds[2]) return 3

            return 4
          }

          const calendarData = data.map(item => {
            const value =
              selectedType === 'income' ? item.income : item.expenses

            return { date: item.date, count: value, level: getLevel(value) }
          })

          const emptyColor =
            derivedTheme === 'dark' ? 'rgb(38 38 38)' : 'rgb(229 229 229)'

          return (
            <Flex direction="column" gap="md" width="100%">
              <Listbox
                renderContent={() => (
                  <Flex align="center" gap="md">
                    <Icon
                      color={
                        selectedType === 'income' ? 'green-500' : 'red-500'
                      }
                      icon={
                        selectedType === 'income'
                          ? 'tabler:login-2'
                          : 'tabler:logout'
                      }
                      size="1.5rem"
                    />
                    <Text>{t(`transactionTypes.${selectedType}`)}</Text>
                  </Flex>
                )}
                value={selectedType}
                width="100%"
                onChange={(value: 'income' | 'expenses') =>
                  setSelectedType(value)
                }
              >
                {(['income', 'expenses'] as const).map(type => (
                  <ListboxOption
                    key={type}
                    icon={
                      type === 'income' ? 'tabler:login-2' : 'tabler:logout'
                    }
                    label={t(`transactionTypes.${type}`)}
                    value={type}
                  />
                ))}
              </Listbox>
              {data.length === 0 ? (
                <EmptyStateScreen
                  icon="tabler:calendar-off"
                  message={{
                    id: 'transactions'
                  }}
                />
              ) : (
                <Box minWidth="0" overflowX="auto" width="100%">
                  <ActivityCalendar
                    hideColorLegend
                    hideTotalCount
                    showWeekdayLabels
                    blockMargin={4}
                    blockSize={14}
                    colorScheme={derivedTheme}
                    data={calendarData}
                    maxLevel={4}
                    renderBlock={(block, activity) =>
                      cloneElement(block, {
                        'data-tooltip-id': 'wallet-activity-calendar',
                        'data-tooltip-content': `${activity.date} — RM ${numberToCurrency(
                          activity.count
                        )}`
                      })
                    }
                    theme={{
                      dark: [emptyColor, TYPE_COLORS[selectedType]],
                      light: [emptyColor, TYPE_COLORS[selectedType]]
                    }}
                  />
                </Box>
              )}
            </Flex>
          )
        }}
      </WithQuery>
      <Tooltip
        id="wallet-activity-calendar"
        render={({ content }) => (
          <Box
            shadow
            bg={{ base: 'bg-50', dark: 'bg-800' }}
            px="md"
            py="sm"
            r="md"
          >
            <Text as="div" color={{ base: 'bg-600', dark: 'bg-400' }}>
              {content}
            </Text>
          </Box>
        )}
      />
    </Widget>
  )
}

export default ActivityCalendarCard
