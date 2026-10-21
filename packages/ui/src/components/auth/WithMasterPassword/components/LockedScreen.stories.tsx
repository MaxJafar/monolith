// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'

import { LockedScreen } from './LockedScreen'

const meta = {
  component: LockedScreen,
  title: 'Auth/Vault/Unlock'
} satisfies Meta<typeof LockedScreen>
export default meta
type Story = StoryObj<typeof meta>
export const IncorrectPassword: Story = {
  args: {
    challengeController: { query: async () => 'story-challenge' } as never,
    verifyController: { mutate: async () => false } as never,
    setMasterPassword: () => {},
    onRecoveryRequested: () => {}
  }
}
