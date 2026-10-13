import type { ReactNode } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Bordered,
  Box,
  Flex,
  Icon,
  Stack,
  Text,
  colorWithOpacity,
  surface
} from '@lifeforge/ui'

export function AnalyticsMetric({
  label,
  value,
  unit,
  detail,
  icon,
  accent = false
}: {
  label: string
  value: ReactNode
  unit?: string
  detail?: string
  icon: string
  accent?: boolean
}) {
  const { i18n } = useModuleTranslation()

  const displayValue =
    typeof value === 'number'
      ? new Intl.NumberFormat(i18n.language, {
          maximumFractionDigits: 2
        }).format(value)
      : value

  return (
    <Bordered
      asChild
      bg={accent ? colorWithOpacity('primary', '5%') : surface.light}
      borderColor={colorWithOpacity(accent ? 'primary' : 'muted', '20%')}
      p="md"
      r="lg"
    >
      <Stack gap="md" minWidth="0">
        <Flex align="start" gap="sm" justify="between">
          <Text color="muted" size="sm" weight="medium">
            {label}
          </Text>
          <Box asChild flexShrink="0">
            <Icon
              aria-hidden="true"
              color={accent ? 'primary' : 'muted'}
              icon={icon}
            />
          </Box>
        </Flex>
        <Flex align="baseline" gap="xs" wrap="wrap">
          <Text
            className="zillion-gym-metric-value"
            color={accent ? 'primary' : { base: 'bg-950', dark: 'bg-100' }}
            leading="tight"
            size={{ base: '2xl', md: '3xl' }}
            tracking="tight"
            weight="semibold"
          >
            {displayValue}
          </Text>
          {unit && (
            <Text color="muted" size="sm">
              {unit}
            </Text>
          )}
        </Flex>
        {detail && (
          <Text color="muted" leading="relaxed" size="xs">
            {detail}
          </Text>
        )}
      </Stack>
    </Bordered>
  )
}
