// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CurrencyInput } from './index'

const meta = {
  title: 'Inputs/CurrencyInput',
  component: CurrencyInput,
  args: {
    value: 1500,
    onChange: () => {},
    label: 'Monthly budget',
    placeholder: 'Amount',
    icon: 'tabler:calculator',
    namespace: false
  }
} satisfies Meta<typeof CurrencyInput>
export default meta
type Story = StoryObj<typeof meta>
export const Editable: Story = {
  render: function Editable(args) {
    const [value, setValue] = useState(args.value)
    return <CurrencyInput {...args} value={value} onChange={setValue} />
  }
}
export const Compact: Story = { ...Editable, args: { variant: 'plain' } }
export const Validation: Story = {
  ...Editable,
  args: { required: true, errorMsg: 'Review this value before saving.' }
}
export const Disabled: Story = { args: { disabled: true } }

export const Currency: Story = { ...Editable, args: { prefix: '$' } }
