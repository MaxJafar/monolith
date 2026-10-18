import { useModuleTranslation } from '@monolith/localization'
import { LineChart, Stack, Text } from '@monolith/ui'

import { type TrendPoint, trendPresentation } from '../utils/analytics'

export function TrendChart({
  title,
  points,
  unit,
  domain,
  invert = false,
  goal,
  showTitle = true,
  emptyLabel
}: {
  title: string
  points: TrendPoint[]
  unit: string
  domain?: [number, number]
  invert?: boolean
  goal?: number | null
  showTitle?: boolean
  emptyLabel?: string
}) {
  const { t } = useModuleTranslation()

  const presentation = trendPresentation(points, domain)

  return (
    <Stack gap="md">
      {showTitle && (
        <Text as="h4" weight="semibold">
          {title}
        </Text>
      )}
      <LineChart
        domain={presentation.domain}
        emptyLabel={emptyLabel ?? t('stats.noMetricData')}
        formatValue={value => `${Math.round(value * 100) / 100} ${unit}`}
        invertY={invert}
        label={title}
        points={presentation.points}
        reference={
          goal === undefined || goal === null
            ? undefined
            : { value: goal, label: t('stats.targetWeight') }
        }
      />
    </Stack>
  )
}
