// SPDX-License-Identifier: 0BSD
import { Scanner } from '@yudiel/react-qr-scanner'
import { type ComponentProps, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ModalHeader } from '@/components/overlays'
import { Box, Stack, Text } from '@/components/primitives'

import { Button } from '../Button'

export function QRCodeScanner({
  data,
  onClose
}: {
  data: {
    formats?: ComponentProps<typeof Scanner>['formats']
    onScanned: (value: string) => void | Promise<void>
  }
  onClose: () => void
}) {
  const { t } = useTranslation('common.modals')
  const active = useRef(false)
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<'permission' | 'camera' | 'scan' | null>(
    null
  )
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  async function accept(codes: { rawValue: string }[]) {
    const value = codes.find(
      code => typeof code.rawValue === 'string' && code.rawValue.length
    )?.rawValue
    if (!active.current || busy.current || !value) return
    busy.current = true
    setPending(true)
    try {
      await data.onScanned(value)
      if (active.current) onClose()
    } catch {
      if (active.current) setError('scan')
    } finally {
      // A successful scan stays latched while its dialog exits.
      if (active.current) setPending(false)
    }
  }
  function retry() {
    busy.current = false
    setError(null)
    setAttempt(value => value + 1)
  }
  return (
    <Stack width="min(28rem, 100%)" gap="md" aria-busy={pending}>
      <ModalHeader
        icon="tabler:qrcode"
        title="qrCodeScanner"
        onClose={onClose}
      />
      <Box r="md" overflow="hidden" aspectRatio="1">
        {!error && (
          <Scanner
            key={attempt}
            allowMultiple={false}
            formats={data.formats}
            paused={pending}
            components={{ finder: true, torch: false }}
            onScan={codes => {
              void accept(codes)
            }}
            onError={reason => {
              if (active.current)
                setError(
                  reason instanceof Error && reason.name === 'NotAllowedError'
                    ? 'permission'
                    : 'camera'
                )
            }}
          />
        )}
      </Box>
      {error && (
        <>
          <Text role="alert" color="dangerous">
            {t('scanner.' + error)}
          </Text>
          <Button
            namespace="common.buttons"
            variant="secondary"
            onClick={retry}
          >
            retry
          </Button>
        </>
      )}
      {pending && (
        <Text role="status" color="muted">
          {t('scanner.processing')}
        </Text>
      )}
    </Stack>
  )
}
