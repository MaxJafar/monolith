// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Widget } from './index'

const meta = {
  title: 'DataDisplay/Widget',
  component: Widget,
  args: {
    namespace: false,
    title: 'Today',
    icon: 'tabler:calendar',
    description: 'Your next three actions',
    children: 'Review the proposal · Schedule the release · Write meeting notes'
  }
} satisfies Meta<typeof Widget>
export default meta
type Story = StoryObj<typeof meta>
export const Dashboard: Story = {}
export const ProminentIcon: Story = {
  args: {
    variant: 'large-icon',
    title: 'Focus session',
    icon: 'tabler:clock',
    children: '25:00'
  }
}
export const WithAction: Story = {
  args: { actionComponent: <button type="button">Open actions</button> }
}
