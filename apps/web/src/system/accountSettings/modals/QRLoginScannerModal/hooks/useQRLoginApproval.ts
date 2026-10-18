import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import workspaceAPI from '@/core/utils/workspaceAPI'
import { readQRLoginPayload } from '@/system/auth/qrPayload'

type Result = { input: string } & (
  | { step: 'success'; browserInfo: string }
  | { step: 'error'; errorMessage: string }
)

export default function useQRLoginApproval(scannedData: string) {
  const { t } = useTranslation('common.auth')

  const payload = readQRLoginPayload(scannedData)

  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const epoch = useRef(0)
  const pending = useRef(false)

  useEffect(
    () => () => {
      epoch.current += 1
    },
    [scannedData]
  )

  async function onApprove() {
    if (!payload || pending.current) return

    const version = ++epoch.current
    pending.current = true
    setLoading(true)

    try {
      const response = await workspaceAPI.auth.qrLogin.approve.mutateRaw({
        sessionId: payload.sessionId
      })

      if (epoch.current === version)
        setResult({
          input: scannedData,
          step: 'success',
          browserInfo: response.browserInfo
        })
    } catch (error) {
      if (epoch.current === version) {
        const message = error instanceof Error ? error.message : ''
        const key = message.includes('not found')
          ? 'qrLogin.sessionNotFound'
          : message.includes('already approved')
            ? 'qrLogin.alreadyApproved'
            : 'messages.unknownError'
        setResult({ input: scannedData, step: 'error', errorMessage: t(key) })
      }
    } finally {
      pending.current = false
      if (epoch.current === version) setLoading(false)
    }
  }

  const current = result?.input === scannedData ? result : null

  return {
    step: !payload
      ? ('error' as const)
      : (current?.step ?? ('confirm' as const)),
    browserInfo: current?.step === 'success' ? current.browserInfo : '',
    errorMessage: !payload
      ? t('qrLogin.invalidQR')
      : current?.step === 'error'
        ? current.errorMessage
        : '',
    loading,
    onApprove
  }
}
