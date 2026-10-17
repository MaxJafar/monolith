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
    <Stack width="440px" maxWidth="100%" gap="lg" aria-busy={loading}>
      <ModalHeader
        icon="tabler:device-laptop"
        namespace="common.auth"
        title="qrLogin.approvalTitle"
        onClose={() => {
          if (!loading) onClose()
        }}
      />
      <Flex gap="md" align="start" role={step === 'error' ? 'alert' : 'status'}>
        <Icon
          size="2em"
          icon={
            confirm
              ? 'tabler:qrcode'
              : step === 'success'
                ? 'tabler:circle-check'
                : 'tabler:alert-circle'
          }
          color={step === 'error' ? 'dangerous' : 'primary'}
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
          variant="secondary"
          namespace={confirm ? 'common.auth' : undefined}
          onClick={onClose}
        >
          {confirm ? 'qrLogin.deny' : 'close'}
        </Button>
        {confirm && (
          <Button
            icon="tabler:check"
            namespace="common.auth"
            loading={loading}
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
