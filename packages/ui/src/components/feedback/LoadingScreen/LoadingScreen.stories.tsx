// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { LoadingScreen } from './index'

const meta = {
  title: 'Feedback/LoadingScreen',
  component: LoadingScreen,
  args: { message: 'Loading your workspace' }
} satisfies Meta<typeof LoadingScreen>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Quiet: Story = {
  args: { message: undefined, loaderSize: '1.5rem' }
}
