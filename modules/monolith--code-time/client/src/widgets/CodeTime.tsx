import { useQuery } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

import type { WidgetConfig } from '@monolith/configs'
import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Card,
  EmptyStateScreen,
  Flex,
  FloatingPopover,
  Stack,
  Text,
  Widget,
  WithQuery,
  usePersonalization
} from '@monolith/ui'

import { workspaceAPI } from '@/manifest'

const getDatesBetween = (start: Dayjs, end: Dayjs): Dayjs[] => {
  if (!start.isValid() || !end.isValid() || start.isAfter(end, 'day')) {
    return []
  }

  if (start.isSame(end, 'day')) return [start]

  return [start].concat(getDatesBetween(start.clone().add(1, 'day'), end))
}

const msToTime = (ms: number): string => {
  const timeUnits = [
    { unit: 'Sec', value: 1000 },
    { unit: 'Min', value: 1000 * 60 },
    { unit: 'Hrs', value: 1000 * 60 * 60 },
    { unit: 'Days', value: 1000 * 60 * 60 * 24 }
  ]

  for (const [index, timeUnit] of timeUnits.entries()) {
    if (ms < timeUnit.value * 60 || index === timeUnits.length - 1) {
      return (ms / timeUnit.value).toFixed(1) + ` ${timeUnit.unit}`
    }
  }

  return '0 Sec'
}

function CodeTime({
  filter = '',
  onConfigChange
}: {
  filter?: string
  onConfigChange?: (value: string) => void
}) {
  const { t } = useModuleTranslation()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [localDays, setLocalDays] = useState('30')
  const days = [7, 30, 90].includes(Number(filter))
    ? Number(filter)
    : Number(localDays)
  const dataQuery = useQuery(
    workspaceAPI.getEachDay.queryOptions({
      refetchInterval: 1000 * 60
    })
  )

  const {
    derivedThemeColor: themeColor,
    bgTempPalette,
    derivedTheme
  } = usePersonalization()

  const chartData = useMemo(() => {
    const data = dataQuery.data

    if (dataQuery.status === 'pending') return 'Loading'

    const firstDay = data?.[0]
    const lastDay = data?.[data.length - 1]

    if (!firstDay || !lastDay) return 'No data'

    const end = dayjs(lastDay.date),
      start = end.subtract(days - 1, 'day')
    const dates = getDatesBetween(
      dayjs(firstDay.date).isAfter(start) ? dayjs(firstDay.date) : start,
      end
    )

    return dates.map(date => {
      const dateStr = date.format('YYYY-MM-DD')

      const day = data.find(d => d.date === dateStr)

      return {
        date: date.format('DD MMM'),
        hours: day ? day.duration / 3600000 : 0
      }
    })
  }, [dataQuery.data, dataQuery.status, days])

  const CustomTooltip = ({
    active,
    payload
  }: {
    active?: boolean
    payload?: Array<{ value: number; payload: { date: string } }>
  }) => {
    const first = payload?.[0]

    if (active && first) {
      const hours = first.value

      return (
        <Card>
          <Box p="md">
            <Text mb="xs" weight="medium">
              {first.payload.date}
            </Text>
            <Flex align="center" gap="xs">
              <Text color="muted">Code time:</Text>
              <Text style={{ color: themeColor }} weight="semibold">
                {msToTime(hours * 3600000)}
              </Text>
            </Flex>
          </Box>
        </Card>
      )
    }

    return null
  }

  const renderContent = () => {
    if (chartData === 'No data' || chartData === 'Loading')
      return (
        <EmptyStateScreen
          smaller
          icon="tabler:code-off"
          message={{
            id: 'data',
            tKey: 'widgets.codeTime'
          }}
        />
      )

    return (
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorCodeTime" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor={themeColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={themeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            axisLine={false}
            dataKey="date"
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
          />
          <CartesianGrid
            stroke={bgTempPalette[derivedTheme === 'dark' ? '700' : '300']}
            strokeDasharray="3 3"
            vertical={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickFormatter={value => `${Math.round(value)}h`}
            tickLine={false}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            dataKey="hours"
            fill="url(#colorCodeTime)"
            stroke={themeColor}
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <>
      <Widget
        actionComponent={
          <Button
            aria-label={t('widgetSettings')}
            icon="lucide:settings-2"
            onClick={event => setAnchor(event.currentTarget)}
            variant="plain"
          />
        }
        icon="tabler:chart-line"
        title="Code Time"
      >
        <Box height="220px" minWidth="0" width="100%">
          <WithQuery query={dataQuery}>
            {() => <>{renderContent()}</>}
          </WithQuery>
        </Box>
      </Widget>
      {anchor && (
        <FloatingPopover
          anchor={anchor}
          label={t('widgetSettings')}
          onClose={() => setAnchor(null)}
        >
          <Stack gap="sm">
            <Text size="sm">{t('widgetRange')}</Text>
            <Flex gap="xs">
              {[7, 30, 90].map(value => (
                <Button
                  key={value}
                  namespace={false}
                  variant="plain"
                  aria-pressed={days === value}
                  onClick={() => {
                    setLocalDays(String(value))
                    onConfigChange?.(String(value))
                  }}
                >
                  {t('widgetDays', { count: value })}
                </Button>
              ))}
            </Flex>
          </Stack>
        </FloatingPopover>
      )}
    </>
  )
}

export default CodeTime

export const config: WidgetConfig = {
  id: 'codeTime',
  icon: 'tabler:code',
  minH: 3
}
