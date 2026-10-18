import { useTranslation } from 'react-i18next'

import { Button, Flex, Icon, ModalHeader, Stack, Text } from '@monolith/ui'

import useQRLoginApproval from './hooks/useQRLoginApproval'

function ApprovalPanel({
  scannedData,
  onClose
}: {
  scannedData: string
  onClose: () => void
}) {
  const { t } = useTranslation('common.auth')

  const { step, browserInfo, errorMessage, loading, onApprove } =
    useQRLoginApproval(scannedData)
  const confirm = step === 'confirm'

  return (
    <Stack aria-busy={loading} gap="lg" maxWidth="100%" width="440px">
      <ModalHeader
        icon="tabler:device-laptop"
        namespace="common.auth"
        title="qrLogin.approvalTitle"
        onClose={() => {
          if (!loading) onClose()
        }}
      />
      <Flex align="start" gap="md" role={step === 'error' ? 'alert' : 'status'}>
        <Icon
          color={step === 'error' ? 'dangerous' : 'primary'}
          icon={
            confirm
              ? 'tabler:qrcode'
              : step === 'success'
                ? 'tabler:circle-check'
                : 'tabler:alert-circle'
          }
          size="2em"
        />
        <Stack gap="sm">
          <Text>
            {confirm
              ? t('qrLogin.approvalDescription')
              : step === 'success'
                ? t('qrLogin.success')
                : errorMessage}
          </Text>
          {browserInfo && (
            <Text color="muted">
              {t('qrLogin.browserInfo')}: {browserInfo}
            </Text>
          )}
        </Stack>
      </Flex>
      <Flex gap="sm" justify="end" wrap="wrap">
        <Button
          disabled={loading}
          namespace={confirm ? 'common.auth' : undefined}
          variant="secondary"
          onClick={onClose}
        >
          {confirm ? 'qrLogin.deny' : 'close'}
        </Button>
        {confirm && (
          <Button
            icon="tabler:check"
            loading={loading}
            namespace="common.auth"
            onClick={onApprove}
          >
            qrLogin.approve
          </Button>
        )}
      </Flex>
    </Stack>
  )
}

export default function QRLoginApprovalModal({
  data,
  onClose
}: {
  data: { scannedData: string }
  onClose: () => void
}) {
  return (
    <ApprovalPanel
      key={data.scannedData}
      scannedData={data.scannedData}
      onClose={onClose}
    />
  )
}
