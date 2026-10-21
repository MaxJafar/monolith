// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { OTPInputBox } from './index'

const meta = {
  component: OTPInputBox,
  title: 'Auth/OTPInputBox',
  args: {
    otp: '',
    setOtp: () => {},
    verifyOTP: async () => {},
    verifyOtpLoading: false
  }
} satisfies Meta<typeof OTPInputBox>
export default meta
type Story = StoryObj<typeof meta>
function Example({ pending = false, fail = false }) {
  const [value, setValue] = useState('')
  return (
    <OTPInputBox
      otp={value}
      setOtp={setValue}
      verifyOtpLoading={pending}
      verifyOTP={async () => {
        if (fail) throw Error('Rejected test code')
      }}
    />
  )
}
export const EnterCode: Story = { render: () => <Example /> }
export const Checking: Story = { render: () => <Example pending /> }
export const FailedVerification: Story = { render: () => <Example fail /> }
