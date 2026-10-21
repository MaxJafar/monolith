// SPDX-License-Identifier: 0BSD
import { useTranslation } from 'react-i18next'

import { Flex, type FlexProps, Icon, Text } from '@/components/primitives'

const severity = {
  note: ['tabler:info-circle', '#3b82f6'],
  warning: ['tabler:alert-triangle', '#d4a017'],
  caution: ['tabler:alert-hexagon', '#e77d28'],
  tip: ['tabler:bulb', '#2eaa73'],
  important: ['tabler:message-exclamation', '#9c68da']
} as const
export function Alert({
  type,
  children,
  style,
  ...layout
}: FlexProps<'div'> & {
  type: keyof typeof severity
}) {
  const { t } = useTranslation('common.misc')
  const [icon, color] = severity[type]
  return (
    <Flex
      role="note"
      direction="column"
      gap="sm"
      p="md"
      width="100%"
      {...layout}
      style={{ borderInlineStart: '3px solid ' + color, ...style }}
    >
      <Flex align="center" gap="sm">
        <Icon icon={icon} style={{ color }} />
        <Text as="h4" weight="semibold">
          {t('alert.' + type, type[0].toUpperCase() + type.slice(1))}
        </Text>
      </Flex>
      <Text as="div">{children}</Text>
    </Flex>
  )
}
