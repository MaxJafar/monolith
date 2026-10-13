import { Box, Flex, Stack, Text } from '@/components/primitives'
import { colorWithOpacity } from '@/system'

import { numeric } from '../DataViz.css'
import { formatNumber } from '../constants'
import { barMaximum, isChartValue, progressRatio } from '../model'
import type { ChartProps } from '../types'

/** Horizontal comparison bars always start at zero. Unknown values are not zeros. */
export function HorizontalBarChart({
  points,
  label,
  formatValue = formatNumber,
  max,
  emptyLabel
}: ChartProps & { max?: number }) {
  const maximum = barMaximum(points, max)

  return (
    <Stack aria-label={label} as="figure" gap="md" m="none">
      {!points.length && emptyLabel && <Text color="muted">{emptyLabel}</Text>}
      {points.map((point, index) => (
        <Stack key={index} gap="xs">
          <Flex align="baseline" gap="sm" justify="between">
            <Text truncate size="sm">
              {point.label}
            </Text>
            <Text
              className={numeric}
              size="sm"
              weight="semibold"
              whiteSpace="nowrap"
            >
              {isChartValue(point.value) ? formatValue(point.value) : '—'}
            </Text>
          </Flex>
          <Box
            aria-hidden="true"
            bg={colorWithOpacity('bg-500', '20%')}
            height="0.5rem"
            overflow="hidden"
            r="full"
            width="100%"
          >
            <Box
              bg="primary"
              height="100%"
              r="full"
              style={point.color ? { backgroundColor: point.color } : undefined}
              width={`${isChartValue(point.value) ? progressRatio(point.value, maximum) * 100 : 0}%`}
            />
          </Box>
          {point.detail && (
            <Text color="muted" size="xs">
              {point.detail}
            </Text>
          )}
        </Stack>
      ))}
    </Stack>
  )
}
