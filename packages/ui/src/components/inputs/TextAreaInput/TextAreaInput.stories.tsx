// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { TextAreaInput } from './index'

const meta = {
  title: 'Inputs/TextAreaInput',
  component: TextAreaInput,
  args: {
    value: 'Decisions and next steps',
    onChange: () => {},
    label: 'Meeting notes',
    placeholder: 'Capture the discussion',
    icon: 'tabler:notes',
    namespace: false
  }
} satisfies Meta<typeof TextAreaInput>
export default meta
type Story = StoryObj<typeof meta>
export const Editable: Story = {
  render: function Editable(args) {
    const [value, setValue] = useState(args.value)
    return <TextAreaInput {...args} value={value} onChange={setValue} />
  }
}
export const Compact: Story = { ...Editable, args: { variant: 'plain' } }
export const Validation: Story = {
  ...Editable,
  args: { required: true, errorMsg: 'Review this value before saving.' }
}
export const Disabled: Story = { args: { disabled: true } }
