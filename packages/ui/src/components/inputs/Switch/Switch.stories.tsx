// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Switch } from '.'

const meta = {
  title: 'Inputs/Switch',
  component: Switch,
  args: { value: false, onChange: () => {} }
} satisfies Meta<typeof Switch>
export default meta
export const Notifications: StoryObj<typeof meta> = {
  render: () => {
    const [value, onChange] = useState(true)
    return (
      <Switch
        value={value}
        onChange={onChange}
        aria-label="Workspace notifications"
      />
    )
  }
}
export const Unavailable: StoryObj<typeof meta> = {
  args: {
    disabled: true,
    value: false,
    onChange: () => {},
    'aria-label': 'Workspace notifications'
  }
}
