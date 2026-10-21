// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Alert } from './index'

const meta = {
  title: 'Feedback/Alert',
  component: Alert,
  args: { type: 'note', children: 'Your changes are saved on this device.' }
} satisfies Meta<typeof Alert>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Warning: Story = {
  args: {
    type: 'warning',
    children: 'Connect to the server to finish syncing.'
  }
}
export const Tip: Story = {
  args: { type: 'tip', children: 'Use keyboard shortcuts to switch views.' }
}
