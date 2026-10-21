// SPDX-License-Identifier: 0BSD
import type { ReactNode } from 'react'

import { Flex, Icon, Text } from '@/components/primitives'

export function StateMessage({
  title,
  detail,
  icon,
  size = '2rem',
  action,
  error = false
}: {
  title?: ReactNode
  detail?: ReactNode
  icon: string
  size?: string
  action?: ReactNode
  error?: boolean
}) {
  return (
    <Flex
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
      direction="column"
      align="center"
      justify="center"
      gap="md"
      p="lg"
      width="100%"
      height="100%"
      flexGrow="1"
    >
      <Icon icon={icon} size={size} color={error ? 'dangerous' : 'muted'} />
      {title != null && (
        <Text
          as="p"
          align="center"
          weight="medium"
          color={error ? 'dangerous' : undefined}
        >
          {title}
        </Text>
      )}
      {detail != null && (
        <Text as="p" align="center" color="muted">
          {detail}
        </Text>
      )}
      {action}
    </Flex>
  )
}
