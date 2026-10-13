import dayjs from 'dayjs'

import { useModuleTranslation } from '@lifeforge/localization'
import { DateInput, Grid, Stack, Text } from '@lifeforge/ui'

import {
  type RangePeriod,
  type RangeSelection,
  analyticsRange
} from '../utils/analytics'
import { SelectInput } from './SelectInput'

export function AnalyticsRangeControls({
  value,
  onChange
}: {
  value: RangeSelection
  onChange: (value: RangeSelection) => void
}) {
  const { t } = useModuleTranslation()

  const range = analyticsRange(value, dayjs().format('YYYY-MM-DD'))

  return (
    <Stack gap="sm">
      <Grid
        gap="md"
        templateCols={{ base: 1, md: value.period === 'custom' ? 3 : 1 }}
      >
        <SelectInput<RangePeriod>
          label="stats.period"
          options={(['week', '30', '90', '365', 'all', 'custom'] as const).map(
            period => ({
              value: period,
              label: t(`stats.periods.${period}`)
            })
          )}
          value={value.period}
          onChange={period => onChange({ ...value, period })}
        />
        {value.period === 'custom' && (
          <>
            <DateInput
              icon="tabler:calendar"
              label="history.from"
              value={value.from ? dayjs(value.from).toDate() : null}
              onChange={date =>
                onChange({
                  ...value,
                  from: date ? dayjs(date).format('YYYY-MM-DD') : null
                })
              }
            />
            <DateInput
              icon="tabler:calendar"
              label="history.until"
              value={value.until ? dayjs(value.until).toDate() : null}
              onChange={date =>
                onChange({
                  ...value,
                  until: date ? dayjs(date).format('YYYY-MM-DD') : null
                })
              }
            />
          </>
        )}
      </Grid>
      {!range.valid && (
        <Text color="dangerous" role="alert">
          {t('history.invalidRange')}
        </Text>
      )}
    </Stack>
  )
}
