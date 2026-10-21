// SPDX-License-Identifier: 0BSD
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'

import {
  Button,
  Flex,
  LoadingScreen,
  ModalHeader,
  Stack,
  Text
} from '@monolith/ui'

import useQRLoginSession from './hooks/useQRLoginSession'

export default function QRLoginModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('common.auth')
  const session = useQRLoginSession({ onSuccess: onClose })
  const ready = session.status === 'ready' || session.status === 'waiting'
  const seconds = Math.max(0, Math.ceil(session.timeLeft))
  const countdown =
    Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
  return (
    <Stack width="360px" maxWidth="100%" gap="md">
      <ModalHeader
        namespace="common.auth"
        title="qrLogin.title"
        icon="tabler:qrcode"
        onClose={onClose}
      />
      <Text color="muted">{t('qrLogin.description')}</Text>
      <Flex
        centered
        minHeight="260px"
        p="lg"
        r="lg"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        {session.status === 'loading' ? (
          <LoadingScreen />
        ) : ready && session.qrData ? (
          <div style={{ padding: 16, background: '#fff', borderRadius: 8 }}>
            <QRCodeSVG
              value={session.qrData}
              size={224}
              level="M"
              bgColor="#fff"
              fgColor="#111"
              title={t('qrLogin.scanQRCode')}
            />
          </div>
        ) : (
          <Stack align="center" gap="md">
            <Text role="status">
              {t(
                session.status === 'approved'
                  ? 'qrLogin.approved'
                  : session.status === 'expired'
                    ? 'qrLogin.expired'
                    : 'messages.unknownError'
              )}
            </Text>
            {session.status !== 'approved' && (
              <Button
                namespace="common.auth"
                icon="tabler:refresh"
                variant="secondary"
                onClick={session.refreshSession}
              >
                qrLogin.clickToRefresh
              </Button>
            )}
          </Stack>
        )}
      </Flex>
      {ready && (
        <Stack gap="xs" align="center">
          <Text color="muted" size="sm">
            {t('qrLogin.waiting')}
          </Text>
          <Text as="output" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {countdown}
          </Text>
        </Stack>
      )}
    </Stack>
  )
}
