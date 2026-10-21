// SPDX-License-Identifier: 0BSD
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Button, TextInput } from '@/components/inputs'
import { Stack, Text } from '@/components/primitives'

import { useCredentialAction } from '../useCredentialAction'
import './otp.css'

export function OTPInputBox({
  otp,
  setOtp,
  verifyOTP,
  verifyOtpLoading,
  lighter
}: {
  otp: string
  setOtp: (value: string) => void
  verifyOTP: (value: string) => Promise<void>
  verifyOtpLoading: boolean
  lighter?: boolean
}) {
  const { t } = useTranslation('common.vault')
  const action = useCredentialAction()
  const errorId = useId()
  const busy = action.pending || verifyOtpLoading
  function submit() {
    if (busy || !/^\d{6}$/.test(otp)) return
    return action.run(async active => {
      if (active()) await verifyOTP(otp)
    })
  }
  return (
    <Stack
      gap="md"
      aria-busy={busy}
      data-tone={lighter ? 'raised' : 'default'}
      className="monolith-otp"
    >
      <TextInput
        wrapperProps={
          lighter ? { bg: { base: 'bg-100', dark: 'bg-800' } } : undefined
        }
        autoFocus
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        label="otp.codeLabel"
        namespace="common.vault"
        placeholder="000000"
        disabled={busy}
        value={otp}
        aria-describedby={action.failed ? errorId : undefined}
        onChange={value => {
          action.clearError()
          setOtp(value.replace(/\D/g, '').slice(0, 6))
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void submit()
          }
        }}
      />
      {action.failed && (
        <Text id={errorId} role="alert" color="dangerous">
          {t('otp.messages.verify.failed')}
        </Text>
      )}
      <Button
        icon="tabler:arrow-right"
        iconPosition="end"
        namespace="common.vault"
        loading={busy}
        disabled={busy || !/^\d{6}$/.test(otp)}
        onClick={submit}
      >
        otp.buttons.verify
      </Button>
    </Stack>
  )
}
