// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { CreatePasswordScreen } from './CreatePasswordScreen'

const meta = {
  component: CreatePasswordScreen,
  title: 'Auth/Vault/Create'
} satisfies Meta<typeof CreatePasswordScreen>
export default meta
type Story = StoryObj<typeof meta>
export const RetryAfterFailure: Story = {
  args: {
    challengeController: { query: async () => 'story-challenge' } as never,
    controller: {
      mutate: async () => {
        throw Error('Simulated offline service')
      }
    } as never
  }
}
