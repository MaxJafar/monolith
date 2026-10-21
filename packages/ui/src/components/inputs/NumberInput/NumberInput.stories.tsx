// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { NumberInput } from './index'

const meta = {
  title: 'Inputs/NumberInput',
  component: NumberInput,
  args: {
    value: 25,
    onChange: () => {},
    label: 'Focus duration',
    placeholder: 'Minutes',
    icon: 'tabler:calculator',
    namespace: false
  }
} satisfies Meta<typeof NumberInput>
export default meta
type Story = StoryObj<typeof meta>
export const Editable: Story = {
  render: function Editable(args) {
    const [value, setValue] = useState(args.value)
    return <NumberInput {...args} value={value} onChange={setValue} />
  }
}
export const Compact: Story = { ...Editable, args: { variant: 'plain' } }
export const Validation: Story = {
  ...Editable,
  args: { required: true, errorMsg: 'Review this value before saving.' }
}
export const Disabled: Story = { args: { disabled: true } }

export const Bounded: Story = { ...Editable, args: { min: 5, max: 120 } }
