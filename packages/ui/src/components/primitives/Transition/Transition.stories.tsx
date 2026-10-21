// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Box, Stack, Text, Transition } from '@/components/primitives'

const meta = {
  title: 'Primitives/Transition',
  component: Transition,
  args: {
    duration: 180,
    easing: 'ease-out',
    property: ['opacity', 'transform'],
    children: null
  }
} satisfies Meta<typeof Transition>
export default meta
type Story = StoryObj<typeof meta>
function MotionExample(props: React.ComponentProps<typeof Transition>) {
  const [active, setActive] = useState(false)
  return (
    <Stack gap="lg">
      <button
        type="button"
        aria-pressed={active}
        onClick={() => setActive(value => !value)}
      >
        Toggle preview
      </button>
      <Transition {...props}>
        <Box
          p="lg"
          r="lg"
          bg={{ base: 'custom-100', dark: 'custom-900' }}
          style={{
            opacity: active ? 1 : 0.45,
            transform: active ? 'translateX(12px)' : 'translateX(0)'
          }}
        >
          <Text>Ready for the next step</Text>
        </Box>
      </Transition>
    </Stack>
  )
}
export const Default: Story = { render: args => <MotionExample {...args} /> }
export const IndependentTimings: Story = {
  args: {
    property: [
      { property: 'opacity', duration: 120 },
      { property: 'transform', duration: 320, delay: 50, easing: 'ease-in-out' }
    ]
  },
  render: args => <MotionExample {...args} />
}
export const Instant: Story = {
  args: { duration: 0 },
  render: args => <MotionExample {...args} />
}
