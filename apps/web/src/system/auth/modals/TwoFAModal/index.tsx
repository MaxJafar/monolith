import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@monolith/api'
import { ModalHeader, OTPInputBox, Stack, Text, toast } from '@monolith/ui'

export default function TwoFAModal({ onClose }: { onClose: () => void }) {
  const { authenticateWith2FA, tid } = useAuth()
  const { t } = useTranslation('common.auth')
  const [otp, setOtp] = useState('')
  const [pending, setPending] = useState(false)
  const lock = useRef(false)

  async function verify(code: string) {
    if (lock.current) return

    if (!/^\d{6}$/.test(code)) {
      toast.error(t('messages.otpLength'))

      return
    }
    lock.current = true
    setPending(true)

    try {
      const name = await authenticateWith2FA(code)
      tid.current = ''
      toast.success(t('messages.welcomeBack', { name }))
      onClose()
    } catch {
      toast.error(t('messages.invalidOTP'))
    } finally {
      lock.current = false
      setPending(false)
    }
  }

  return (
    <Stack maxWidth="30rem" width="100%">
      <ModalHeader
        icon="tabler:lock-access"
        namespace="common.auth"
        title="twoFA"
        onClose={() => {
          if (lock.current) return
          tid.current = ''
          onClose()
        }}
      />
      <Text as="p" color="muted" mb="lg">
        {t('modals.twoFA.description')}
      </Text>
      <OTPInputBox
        lighter
        otp={otp}
        setOtp={value => setOtp(value.replace(/\D/g, '').slice(0, 6))}
        verifyOTP={verify}
        verifyOtpLoading={pending}
      />
    </Stack>
  )
}
