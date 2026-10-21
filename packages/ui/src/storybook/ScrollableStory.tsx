// SPDX-License-Identifier: 0BSD
import type { ReactNode } from 'react'

import { Stack } from '@/components/primitives'

export function ScrollableStory({ children }: { children: ReactNode }) {
  return (
    <Stack
      as="section"
      className="monolith-story-scroll"
      gap="lg"
      py="md"
      overflowY="auto"
      maxHeight="85vh"
    >
      {children}
    </Stack>
  )
}
