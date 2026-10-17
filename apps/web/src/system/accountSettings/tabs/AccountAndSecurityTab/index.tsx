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
        title={t('settings.title.password')}
        description={t('settings.desc.password')}
        icon="tabler:key"
      >
        <Button
          icon="tabler:key"
          variant="secondary"
          namespace="common.account-settings"
          onClick={() => open(ChangePasswordModal, {})}
        >
          changePassword
        </Button>
      </OptionsColumn>
      <OptionsColumn
        title={t('settings.title.twoFA')}
        description={t('settings.desc.twoFA')}
        icon="tabler:shield-lock"
      >
        <Flex align="center" justify="between" gap="md" width="100%">
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
        title={t('settings.title.oauth')}
        description={t('settings.desc.oauth')}
        icon="tabler:login"
      >
        <Flex
          align="center"
          gap="md"
          wrap="wrap"
          width="100%"
          justify="between"
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
            namespace="common.account-settings"
            icon="tabler:settings"
            variant="secondary"
            onClick={() => open(OAuthConfigModal, {})}
          >
            configure
          </Button>
        </Flex>
      </OptionsColumn>
      <OptionsColumn
        title={authText('qrLogin.scanQRCode')}
        description={authText('qrLogin.description')}
        icon="tabler:qrcode"
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
