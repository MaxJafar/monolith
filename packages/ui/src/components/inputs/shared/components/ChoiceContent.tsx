// SPDX-License-Identifier: 0BSD
import type { ReactElement, ReactNode } from 'react'

import { Box, Flex, Icon, Text } from '@/components/primitives'

export type ChoiceDecoration = { color?: string; icon?: string | ReactElement }
export function ChoiceContent({
  label,
  icon,
  color,
  iconAtEnd,
  selected,
  multiple,
  renderColorAndIcon
}: ChoiceDecoration & {
  label: ReactNode
  iconAtEnd?: boolean
  selected: boolean
  multiple?: boolean
  renderColorAndIcon?: (decoration: ChoiceDecoration) => ReactNode
}) {
  const decoration = renderColorAndIcon ? (
    renderColorAndIcon({ icon, color })
  ) : icon ? (
    <Box
      as="span"
      flexShrink="0"
      r="sm"
      style={
        color
          ? {
              color,
              backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`
            }
          : undefined
      }
    >
      {typeof icon !== 'string' ? (
        icon
      ) : icon.startsWith('customHTML:') ? (
        <img
          alt=""
          width={20}
          height={20}
          src={
            'data:image/svg+xml,' +
            encodeURIComponent(icon.slice('customHTML:'.length))
          }
        />
      ) : (
        <Icon aria-hidden="true" icon={icon} />
      )}
    </Box>
  ) : color ? (
    <Box
      as="span"
      aria-hidden="true"
      width="0.75rem"
      height="0.75rem"
      r="full"
      flexShrink="0"
      style={{ backgroundColor: color }}
    />
  ) : null
  return (
    <Flex align="center" gap="sm" minWidth="0" width="100%">
      {!iconAtEnd && decoration}
      <Text
        truncate
        weight={selected ? 'semibold' : 'normal'}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      {iconAtEnd && decoration}
      <Icon
        aria-hidden="true"
        icon={
          multiple
            ? selected
              ? 'tabler:square-check-filled'
              : 'tabler:square'
            : 'tabler:check'
        }
        color={selected ? 'primary' : 'muted'}
        style={{ visibility: multiple || selected ? 'visible' : 'hidden' }}
      />
    </Flex>
  )
}
