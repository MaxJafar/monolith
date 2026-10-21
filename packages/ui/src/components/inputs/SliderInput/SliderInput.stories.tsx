// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { SliderInput } from '.'

const meta = {
  title: 'Inputs/SliderInput',
  component: SliderInput,
  args: { value: 0, onChange: () => {} }
} satisfies Meta<typeof SliderInput>
export default meta
export const WorkspaceWidth: StoryObj<typeof meta> = {
  render: () => {
    const [value, onChange] = useState(264)
    return (
      <SliderInput
        label="Sidebar width"
        namespace={false}
        min={220}
        max={380}
        step={4}
        value={value}
        onChange={onChange}
        renderValue={value => value + 'px'}
      />
    )
  }
}
export const Fractional: StoryObj<typeof meta> = {
  render: () => {
    const [value, onChange] = useState(0.5)
    return (
      <SliderInput
        label="Opacity"
        namespace={false}
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={onChange}
      />
    )
  }
}
export const FixedValue: StoryObj<typeof meta> = {
  args: {
    value: 8,
    min: 8,
    max: 8,
    onChange: () => {},
    label: 'Fixed width',
    namespace: false
  }
}
