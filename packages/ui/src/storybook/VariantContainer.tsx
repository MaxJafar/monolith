// SPDX-License-Identifier: 0BSD
import { type ReactNode, useId } from 'react'

import { Stack, Text } from '@/components/primitives'

export function VariantContainer({
  title,
  children
}: {
  title: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <Stack as="section" aria-labelledby={id} gap="sm" pb="lg">
      <Text as="h3" id={id} size="sm" weight="medium" color="muted">
        {title}
      </Text>
      {children}
    </Stack>
  )
}
