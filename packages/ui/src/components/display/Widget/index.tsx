// SPDX-License-Identifier: 0BSD
import { camelCase } from 'lodash'
import type { ReactNode, Ref } from 'react'

import { useModuleTranslation } from '@monolith/localization'

import { Flex, type FlexProps, Icon, Text } from '@/components/primitives'
import type { TokenizedColor } from '@/system'

export interface WidgetProps {
  className?: string
  icon: string
  iconColor?: TokenizedColor
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  actionComponent?: ReactNode
  namespace?: string | false
  variant?: 'default' | 'large-icon'
  ref?: Ref<HTMLDivElement>
}
export function Widget({
  icon,
  iconColor,
  title,
  description,
  children,
  actionComponent,
  namespace = 'common.dashboard',
  variant = 'default',
  ref,
  ...layout
}: WidgetProps & FlexProps<'div'>) {
  const { t } = useModuleTranslation(namespace === false ? [] : [namespace])
  const translated = (value: ReactNode, part: string) =>
    typeof value === 'string' && namespace !== false
      ? t(
          [
            'widgets.' + camelCase(value) + '.' + part,
            'widgets.' + camelCase(value)
          ],
          { defaultValue: value }
        )
      : value
  return (
    <Flex
      ref={ref as Ref<HTMLElement>}
      direction="column"
      gap="lg"
      p="md"
      r="lg"
      bg={{ base: 'bg-50', dark: 'bg-900' }}
      minWidth="0"
      width="100%"
      height="100%"
      shadow
      {...layout}
    >
      {title && (
        <Flex align="start" justify="between" gap="md">
          <Flex
            direction={variant === 'large-icon' ? 'column' : 'row'}
            align="start"
            gap="sm"
            minWidth="0"
          >
            <Icon
              icon={icon}
              color={iconColor ?? 'muted'}
              size={variant === 'large-icon' ? '2.5rem' : '1.5rem'}
            />
            <Flex direction="column" gap="xs" minWidth="0">
              <Text as="h3" truncate size="lg" weight="semibold">
                {translated(title, 'title')}
              </Text>
              {description && (
                <Text as="p" color="muted" size="sm">
                  {translated(description, 'description')}
                </Text>
              )}
            </Flex>
          </Flex>
          {actionComponent}
        </Flex>
      )}
      {children}
    </Flex>
  )
}
