import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@monolith/api'
import {
  Button,
  Flex,
  OptionsColumn,
  QRCodeScanner,
  Switch,
  Text,
  toast,
  useModalStore
} from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'
import { readQRLoginPayload } from '@/system/auth/qrPayload'

import ChangePasswordModal from '../../modals/ChangePasswordModal'
import DisableTwoFAModal from '../../modals/DisableTwoFAModal'
import EnableTwoFAModal from '../../modals/EnableTwoFAModal'
import OAuthConfigModal from '../../modals/OAuthConfigModal'
import QRLoginApprovalModal from '../../modals/QRLoginScannerModal'

export default function AccountAndSecurityTab() {
  const { userData } = useAuth()
  const { t } = useTranslation('common.account-settings')
  const { t: authText } = useTranslation('common.auth')
  const { open } = useModalStore()

  const providers = useQuery(
    workspaceAPI.auth.oauth.providers.listOptions.queryOptions()
  )
  const configured =
    providers.data?.filter(provider => provider.configured) ?? []

  function scan() {
    open(QRCodeScanner, {
      formats: ['qr_code'],
      onScanned: scannedData => {
        if (!readQRLoginPayload(scannedData)) {
          toast.error(authText('qrLogin.invalidQR'))

          return
        }
        open(QRLoginApprovalModal, { scannedData })
      }
    })
  }

  return (
    <>
      <OptionsColumn
        description={t('settings.desc.password')}
        icon="tabler:key"
        title={t('settings.title.password')}
      >
        <Button
          icon="tabler:key"
          namespace="common.account-settings"
          variant="secondary"
          onClick={() => open(ChangePasswordModal, {})}
        >
          changePassword
        </Button>
      </OptionsColumn>
      <OptionsColumn
        description={t('settings.desc.twoFA')}
        icon="tabler:shield-lock"
        title={t('settings.title.twoFA')}
      >
        <Flex align="center" gap="md" justify="between" width="100%">
          <Text color="muted">
            {t(userData?.twoFAEnabled ? 'misc.enabled' : 'misc.disabled')}
          </Text>
          <Switch
            aria-label={t('settings.title.twoFA')}
            disabled={!userData}
            value={userData?.twoFAEnabled ?? false}
            onChange={() =>
              userData?.twoFAEnabled
                ? open(DisableTwoFAModal, {})
                : open(EnableTwoFAModal, {})
            }
          />
        </Flex>
      </OptionsColumn>
      <OptionsColumn
        description={t('settings.desc.oauth')}
        icon="tabler:login"
        title={t('settings.title.oauth')}
      >
        <Flex
          align="center"
          gap="md"
          justify="between"
          width="100%"
          wrap="wrap"
        >
          <Text color="muted">
            {providers.isError
              ? t('messages.oauth.loadFailed')
              : t('misc.oauthStatus', {
                  confCount: configured.length,
                  enabledCount: configured.filter(provider => provider.enabled)
                    .length
                })}
          </Text>
          <Button
            icon="tabler:settings"
            namespace="common.account-settings"
            variant="secondary"
            onClick={() => open(OAuthConfigModal, {})}
          >
            configure
          </Button>
        </Flex>
      </OptionsColumn>
      <OptionsColumn
        description={authText('qrLogin.description')}
        icon="tabler:qrcode"
        title={authText('qrLogin.scanQRCode')}
      >
        <Button
          icon="tabler:scan"
          namespace="common.auth"
          variant="secondary"
          onClick={scan}
        >
          qrLogin.title
        </Button>
      </OptionsColumn>
    </>
  )
}
