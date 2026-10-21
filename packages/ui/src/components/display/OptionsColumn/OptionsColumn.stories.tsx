// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Switch } from '@/components/inputs'

import { OptionsColumn } from './index'

const meta = {
  title: 'DataDisplay/OptionsColumn',
  component: OptionsColumn,
  args: {
    title: 'Workspace reminders',
    description: 'Show notifications when a scheduled reminder is due.',
    icon: 'tabler:bell',
    children: null
  }
} satisfies Meta<typeof OptionsColumn>
export default meta
type Story = StoryObj<typeof meta>
export const Editable: Story = {
  render: function Editable(args) {
    const [enabled, setEnabled] = useState(true)
    return (
      <OptionsColumn {...args}>
        <Switch
          aria-label="Workspace reminders"
          value={enabled}
          onChange={setEnabled}
        />
      </OptionsColumn>
    )
  }
}
export const Stacked: Story = { ...Editable, args: { orientation: 'vertical' } }
export const Explained: Story = {
  ...Editable,
  args: { tooltip: 'You can choose a reminder time when creating an event.' }
}
