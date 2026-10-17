import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Button } from '@/components/inputs'
import { Stack, Text } from '@/components/primitives'

import { AnimatedCollapse } from '.'

const meta = {
  component: AnimatedCollapse,
  title: 'Layout/AnimatedCollapse'
} satisfies Meta<typeof AnimatedCollapse>
export default meta
export const Properties: StoryObj<typeof meta> = {
  args: { open: true, children: null },
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <Stack width="300px">
        <Button aria-expanded={open} onClick={() => setOpen(!open)}>
          Properties
        </Button>
        <AnimatedCollapse open={open}>
          <Stack p="sm">
            <Text>Status · In progress</Text>
            <Text>Owner · Alex</Text>
          </Stack>
        </AnimatedCollapse>
      </Stack>
    )
  }
}
