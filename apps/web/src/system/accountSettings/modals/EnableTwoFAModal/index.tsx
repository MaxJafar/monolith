import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@monolith/api'
import {
  Box,
  Button,
  Flex,
  LoadingScreen,
  ModalHeader,
  OTPInputBox,
  Stack,
  Text,
  toast
} from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

type Setup = { tid: string; link: string }

export default function EnableTwoFAModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('common.account-settings')
  const { setUserData } = useAuth()
  const [setup, setSetup] = useState<Setup | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [stage, setStage] = useState<'scan' | 'verify'>('scan')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const alive = useRef(false)
  const request = useRef<Promise<Setup> | null>(null)

  useEffect(() => {
    alive.current = true
    let current = true
    request.current ??= workspaceAPI.auth['2fa'].generate.mutateRaw(undefined)
    request.current.then(
      value => {
        if (current) setSetup(value)
      },
      () => {
        if (current) setError(true)
      }
    )

    return () => {
      current = false
      alive.current = false
    }
  }, [attempt])

  function retry() {
    request.current = null
    setError(false)
    setSetup(null)
    setAttempt(value => value + 1)
  }

  async function verify(code: string) {
    if (!setup || locked.current) return

    if (!/^\d{6}$/.test(code)) {
      toast.error(t('validation.otp'))

      return
    }
    locked.current = true
    setBusy(true)

    try {
      await workspaceAPI.auth['2fa'].enable.mutateRaw({
        tid: setup.tid,
        otp: code
      })
      setUserData(current =>
        current ? { ...current, twoFAEnabled: true } : current
      )

      if (alive.current) {
        toast.success(t('messages.twoFA.enableSuccess'))
        onClose()
      }
    } catch {
      if (alive.current) toast.error(t('messages.twoFA.verifyFailed'))
    } finally {
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }

  return (
    <Stack gap="lg" maxWidth="100%" width="440px">
      <ModalHeader
        icon="tabler:shield-lock"
        namespace="common.account-settings"
        title="enable2FA"
        onClose={() => {
          if (!locked.current) onClose()
        }}
      />
      <Text color="muted">
        {t(
          stage === 'scan'
            ? 'modals.enable2FA.description'
            : 'modals.enable2FA.confirmationDescription'
        )}
      </Text>
      {stage === 'verify' && setup ? (
        <>
          <OTPInputBox
            lighter
            otp={otp}
            setOtp={setOtp}
            verifyOTP={verify}
            verifyOtpLoading={busy}
          />
          <Button
            disabled={busy}
            variant="plain"
            onClick={() => setStage('scan')}
          >
            back
          </Button>
        </>
      ) : (
        <>
          <Flex centered minHeight="220px">
            {error ? (
              <Stack gap="md" role="alert">
                <Text>{t('messages.twoFA.setupFailed')}</Text>
                <Button icon="tabler:refresh" onClick={retry}>
                  retry
                </Button>
              </Stack>
            ) : setup ? (
              <Box bg="white" p="md" r="md">
                <QRCodeSVG
                  bgColor="#ffffff"
                  fgColor="#101010"
                  size={208}
                  title={t('modals.enable2FA.title')}
                  value={setup.link}
                />
              </Box>
            ) : (
              <LoadingScreen />
            )}
          </Flex>
          <Button
            disabled={!setup}
            icon="tabler:arrow-right"
            iconPosition="end"
            onClick={() => setStage('verify')}
          >
            proceed
          </Button>
        </>
      )}
    </Stack>
  )
}
