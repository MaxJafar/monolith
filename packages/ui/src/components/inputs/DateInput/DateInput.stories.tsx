// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DateInput } from './index'

const meta = {
  title: 'Inputs/DateInput',
  component: DateInput,
  args: {
    value: new Date(2026, 9, 20, 14, 30),
    onChange: () => {},
    label: 'Project deadline',
    namespace: false
  }
} satisfies Meta<typeof DateInput>
export default meta
type Story = StoryObj<typeof meta>
export const Editable: Story = {
  render: function Editable(args) {
    const [value, setValue] = useState<Date | null>(args.value)
    return <DateInput {...args} value={value} onChange={setValue} />
  }
}
export const WithTime: Story = { ...Editable, args: { hasTime: true } }
export const Required: Story = { ...Editable, args: { required: true } }
export const WithinRange: Story = {
  ...Editable,
  args: { startDate: new Date(2026, 9, 10), endDate: new Date(2026, 10, 5) }
}
export const Disabled: Story = { args: { disabled: true } }
export const Compact: Story = { ...Editable, args: { variant: 'plain' } }
