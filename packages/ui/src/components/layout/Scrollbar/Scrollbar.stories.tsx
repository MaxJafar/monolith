// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef } from 'react'

import { Box, Stack, Text } from '@/components/primitives'

import { Scrollbar, type ScrollbarHandle } from './index'

const meta = {
  title: 'Utilities/Scrollbar',
  component: Scrollbar
} satisfies Meta<typeof Scrollbar>
export default meta
type Story = StoryObj<typeof meta>
function Example({ count = 30 }: { count?: number }) {
  const scroll = useRef<ScrollbarHandle>(null)
  return (
    <Stack>
      <button type="button" onClick={() => scroll.current?.scrollToBottom()}>
        Jump to latest
      </button>
      <Box height="280px">
        <Scrollbar ref={scroll}>
          <Stack>
            {Array.from({ length: count }, (_, index) => (
              <Box key={index} p="md" bg={{ base: 'bg-100', dark: 'bg-800' }}>
                <Text>Activity {index + 1}</Text>
              </Box>
            ))}
          </Stack>
        </Scrollbar>
      </Box>
    </Stack>
  )
}
export const Default: Story = {
  args: { children: null },
  render: () => <Example />
}
export const ShortContent: Story = {
  args: { children: null },
  render: () => <Example count={2} />
}
