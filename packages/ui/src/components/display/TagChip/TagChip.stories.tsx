// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { TagChip } from './index'

const meta = {
  title: 'DataDisplay/TagChip',
  component: TagChip,
  args: { label: 'Research', icon: 'lucide:flask-conical', color: '#6993C3' }
} satisfies Meta<typeof TagChip>
export default meta
type Story = StoryObj<typeof meta>
export const Outlined: Story = {}
export const Filled: Story = { args: { variant: 'filled' } }
export const Small: Story = { args: { size: 'sm' } }
export const Removable: Story = {
  render: function Removable(args) {
    const [visible, setVisible] = useState(true)
    return visible ? (
      <TagChip
        {...args}
        actionButtonProps={{
          icon: 'tabler:x',
          onClick: () => setVisible(false)
        }}
      />
    ) : (
      <span>Tag removed</span>
    )
  }
}
