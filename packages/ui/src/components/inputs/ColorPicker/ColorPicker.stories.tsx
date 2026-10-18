import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ColorPicker } from '.'

const meta = {
  component: ColorPicker,
  title: 'Inputs/ColorPicker'
} satisfies Meta<typeof ColorPicker>
export default meta
export const Default: StoryObj<typeof meta> = {
  args: { label: 'Bar color', onChange: () => {} },
  render: args => {
    const [value, setValue] = useState<string>()
    return <ColorPicker {...args} value={value} onChange={setValue} />
  }
}
