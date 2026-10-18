import { Box, Flex, Text } from '@/components/primitives'

import { numeric } from '../DataViz.css'
import { accent, track } from '../constants'
import { progressRatio } from '../model'

export function ProgressRing({
  value,
  max,
  label,
  valueLabel,
  color = accent
}: {
  value: number
  max: number
  label: string
  valueLabel?: string
  color?: string
}) {
  const ratio = progressRatio(value, max)
  const percent = Math.round(ratio * 100)

  return (
    <Flex
      centered
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={percent}
      aria-valuetext={valueLabel}
      height="5.5rem"
      position="relative"
      role="progressbar"
      width="5.5rem"
    >
      <Box asChild height="100%" width="100%">
        <svg aria-hidden="true" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            fill="none"
            r="42"
            stroke={track}
            strokeWidth="7"
          />
          <circle
            cx="50"
            cy="50"
            fill="none"
            pathLength="100"
            r="42"
            stroke={color}
            strokeDasharray={`${percent} 100`}
            strokeLinecap={percent ? 'round' : 'butt'}
            strokeWidth="7"
            transform="rotate(-90 50 50)"
          />
        </svg>
      </Box>
      <Flex centered inset="0" position="absolute">
        <Text
          align="center"
          className={numeric}
          leading="tight"
          size="sm"
          weight="semibold"
        >
          {valueLabel ?? `${percent}%`}
        </Text>
      </Flex>
    </Flex>
  )
}
