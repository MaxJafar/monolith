// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { ErrorScreen } from './index'

const meta = {
  title: 'Feedback/ErrorScreen',
  component: ErrorScreen,
  args: { message: 'This workspace is temporarily unavailable.' }
} satisfies Meta<typeof ErrorScreen>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const WithRetry: Story = { args: { showRetryButton: true } }
