import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Box } from '@/components/primitives'

import { IconPalette } from './index'

const meta = {
  component: IconPalette,
  title: 'Inputs/IconPalette'
} satisfies Meta<typeof IconPalette>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  args: {
    icon: 'lucide:folder',
    color: '#438ce1',
    onIconChange: () => {},
    onColorChange: () => {}
  },
  render: args => {
    const [icon, setIcon] = useState(args.icon),
      [color, setColor] = useState(args.color)
    return (
      <Box width="320px" p="sm">
        <IconPalette
          {...args}
          icon={icon}
          color={color}
          onIconChange={setIcon}
          onColorChange={setColor}
        />
      </Box>
    )
  }
}
