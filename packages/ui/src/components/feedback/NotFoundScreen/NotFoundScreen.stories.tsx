// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Box } from '@/components/primitives'

import { NotFoundScreen } from './index'

const meta: Meta<typeof NotFoundScreen> = {
  title: 'Feedback/NotFoundScreen',
  component: NotFoundScreen,
  render: args => (
    <Box minHeight="420px">
      <NotFoundScreen {...args} />
    </Box>
  )
}
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const MissingProject: Story = {
  args: {
    title: 'This project is unavailable',
    message:
      'Open the workspace to find your projects, or ask the owner for a new link.'
  }
}
