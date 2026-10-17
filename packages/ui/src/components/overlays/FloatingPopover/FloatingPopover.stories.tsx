import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Button } from '@/components/inputs'
import { Box, Stack, Text } from '@/components/primitives'

import { FloatingPopover } from './index'

const meta = {
  title: 'Overlays/FloatingPopover',
  component: FloatingPopover
} satisfies Meta<typeof FloatingPopover>
export default meta
type Story = StoryObj<typeof meta>
export const Folder: Story = {
  args: {
    anchor: null,
    label: 'New folder',
    onClose: () => {},
    children: null
  },
  render: args => {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)
    return (
      <>
        <Button onClick={event => setAnchor(event.currentTarget)}>
          New folder
        </Button>
        {anchor && (
          <FloatingPopover
            {...args}
            anchor={anchor}
            onClose={() => setAnchor(null)}
          >
            <Stack gap="sm">
              <Text size="sm">New folder</Text>
              <Box
                as="input"
                aria-label="Folder name"
                placeholder="Folder name"
              />
              <Button onClick={() => setAnchor(null)}>Create</Button>
            </Stack>
          </FloatingPopover>
        )}
      </>
    )
  }
}
