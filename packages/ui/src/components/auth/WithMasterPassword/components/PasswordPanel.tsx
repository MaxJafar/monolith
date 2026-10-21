// SPDX-License-Identifier: 0BSD
import { type ReactNode, useId } from 'react'

import { Flex, Icon, Stack, Text } from '@/components/primitives'

export function PasswordPanel({
  title,
  description,
  icon,
  children
}: {
  title: string
  description: string
  icon: string
  children: ReactNode
}) {
  const heading = useId()
  return (
    <Flex align="center" justify="center" width="100%" minHeight="24rem" p="lg">
      <Stack role="region" aria-labelledby={heading} gap="lg" maxWidth="28rem">
        <Icon icon={icon} size="2.5rem" />
        <Stack gap="sm">
          <Text as="h1" id={heading} size="2xl" weight="semibold">
            {title}
          </Text>
          <Text as="p" color="muted">
            {description}
          </Text>
        </Stack>
        {children}
      </Stack>
    </Flex>
  )
}
