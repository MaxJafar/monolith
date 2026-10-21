// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Checkbox } from '.'

const meta = { title: 'Inputs/Checkbox', component: Checkbox } satisfies Meta<
  typeof Checkbox
>
export default meta
export const Checklist: StoryObj<typeof meta> = {
  render: () => {
    const [checked, onCheckedChange] = useState(false)
    return (
      <Checkbox
        label="Include completed actions"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    )
  }
}
export const Unavailable: StoryObj<typeof meta> = {
  args: { checked: true, disabled: true, label: 'Managed by your workspace' }
}
