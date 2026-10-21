// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { IconInput } from './index'

const meta = {
  title: 'Inputs/IconInput',
  component: IconInput,
  args: {
    value: 'lucide:folder',
    onChange: () => {},
    label: 'Project icon',
    namespace: false
  }
} satisfies Meta<typeof IconInput>
export default meta
type Story = StoryObj<typeof meta>
export const Editable: Story = {
  render: function Editable(args) {
    const [value, setValue] = useState(args.value)
    return <IconInput {...args} value={value} onChange={setValue} />
  }
}
export const Compact: Story = { ...Editable, args: { variant: 'plain' } }
export const Disabled: Story = { args: { disabled: true } }
export const Invalid: Story = {
  ...Editable,
  args: { value: 'unknown', errorMsg: 'Choose an icon from the catalog.' }
}
