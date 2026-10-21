// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ColorInput } from './index'

const meta = {
  title: 'Inputs/ColorInput',
  component: ColorInput,
  args: {
    value: '#6993C3',
    onChange: () => {},
    label: 'Project color',
    namespace: false
  }
} satisfies Meta<typeof ColorInput>
export default meta
type Story = StoryObj<typeof meta>
export const Editable: Story = {
  render: function Editable(args) {
    const [value, setValue] = useState(args.value)
    return <ColorInput {...args} value={value} onChange={setValue} />
  }
}
export const Compact: Story = { ...Editable, args: { variant: 'plain' } }
export const Disabled: Story = { args: { disabled: true } }
export const Invalid: Story = {
  ...Editable,
  args: { value: '#12', errorMsg: 'Choose a six-digit hex color.' }
}
