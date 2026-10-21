// SPDX-License-Identifier: 0BSD
import { type ReactNode, useId } from 'react'

import { IconTooltip } from '@/components/feedback/IconTooltip'
import { Card, type CardProps } from '@/components/layout'
import { Flex, Icon, Text } from '@/components/primitives'

type OptionsColumnProps = Omit<CardProps, 'title'> & {
  title: ReactNode
  description: ReactNode
  icon: string
  children: ReactNode
  orientation?: 'horizontal' | 'vertical'
  tooltip?: ReactNode
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl' | false
}
export function OptionsColumn({
  title,
  description,
  icon,
  children,
  orientation = 'horizontal',
  tooltip,
  breakpoint = 'md',
  className = '',
  ...props
}: OptionsColumnProps) {
  const tooltipId = useId()
  const stacked = orientation === 'vertical'
  const direction = stacked
    ? 'column'
    : breakpoint
      ? { base: 'column' as const, [breakpoint]: 'row' as const }
      : 'row'
  return (
    <Card
      {...props}
      className={['monolith-option-row', className].filter(Boolean).join(' ')}
      direction={direction}
      justify="between"
      gap="md"
    >
      <Flex align="start" gap="md" minWidth="0" flex="1">
        <Icon icon={icon} size="24px" color="muted" style={{ flexShrink: 0 }} />
        <Flex direction="column" gap="xs" minWidth="0">
          <Flex align="center" gap="sm">
            <Text as="h3" size="base" weight="semibold">
              {title}
            </Text>
            {tooltip != null && (
              <IconTooltip id={tooltipId} icon="tabler:info-circle">
                {tooltip}
              </IconTooltip>
            )}
          </Flex>
          {typeof description === 'string' ? (
            <Text as="p" size="sm" color="muted">
              {description}
            </Text>
          ) : (
            description
          )}
        </Flex>
      </Flex>
      <Flex
        align="center"
        gap="sm"
        minWidth="0"
        flexShrink="0"
        width={
          stacked
            ? '100%'
            : breakpoint
              ? { base: '100%', [breakpoint]: 'auto' }
              : 'auto'
        }
      >
        {children}
      </Flex>
    </Card>
  )
}
