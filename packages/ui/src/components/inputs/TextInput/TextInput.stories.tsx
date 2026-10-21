// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { TextInput } from './index'

const meta = {
  title: 'Inputs/TextInput',
  component: TextInput,
  args: {
    value: 'Roadmap',
    onChange: () => {},
    label: 'Project title',
    placeholder: 'Give this project a name',
    icon: 'tabler:notes',
    namespace: false
  }
} satisfies Meta<typeof TextInput>
export default meta
type Story = StoryObj<typeof meta>
export const Editable: Story = {
  render: function Editable(args) {
    const [value, setValue] = useState(args.value)
    return <TextInput {...args} value={value} onChange={setValue} />
  }
}
export const Compact: Story = { ...Editable, args: { variant: 'plain' } }
export const Validation: Story = {
  ...Editable,
  args: { required: true, errorMsg: 'Review this value before saving.' }
}
export const Disabled: Story = { args: { disabled: true } }
export const Password: Story = {
  ...Editable,
  args: {
    isPassword: true,
    label: 'Password',
    value: '',
    placeholder: 'Enter a password'
  }
}
