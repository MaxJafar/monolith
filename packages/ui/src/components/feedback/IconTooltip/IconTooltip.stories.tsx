// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { IconTooltip } from './index'

const meta = {
  title: 'Feedback/IconTooltip',
  component: IconTooltip,
  args: {
    id: 'sync-status',
    icon: 'tabler:cloud-check',
    children: 'All saved changes are synchronized.'
  }
} satisfies Meta<typeof IconTooltip>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
