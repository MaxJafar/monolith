import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Box } from '@/components/primitives'

import { BlockEditor } from './index'

const meta = {
  component: BlockEditor,
  title: 'Display/BlockEditor'
} satisfies Meta<typeof BlockEditor>

export default meta

type Story = StoryObj<typeof meta>

function Example() {
  const [value, setValue] = useState('Start writing. Type / to choose a block.')

  return (
    <Box maxWidth="60rem" p="lg">
      <BlockEditor value={value} onChange={setValue} />
    </Box>
  )
}

export const Editable: Story = {
  args: { value: '' },
  render: () => <Example />
}

export const ReadOnly: Story = {
  args: {
    readOnly: true,
    value:
      'Existing plain text remains readable.\nNo content migration is required.'
  }
}
