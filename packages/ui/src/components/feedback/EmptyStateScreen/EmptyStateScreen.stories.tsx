// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { EmptyStateScreen } from './index'

const meta = {
  title: 'Feedback/EmptyStateScreen',
  component: EmptyStateScreen,
  args: {
    icon: 'tabler:folder',
    message: {
      title: 'Start a project',
      description: 'Add your first project to organize the work ahead.'
    }
  }
} satisfies Meta<typeof EmptyStateScreen>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Compact: Story = { args: { smaller: true } }
