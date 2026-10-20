import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import {
  AuthContext,
  contract,
  createApiClient,
  getNativeRuntime,
  useAuth
} from '@monolith/api'
import { ModuleMetadataProvider } from '@monolith/federation'
import { getI18n } from '@monolith/localization'
import { ModalProvider } from '@monolith/ui'

export const shared = {
  AuthContext,
  getNativeRuntime,
  getI18n,
  ModalProvider,
  ModuleMetadataProvider
}
const api = createApiClient(contract)

export default function Probe() {
  const { userData } = useAuth()
  const { t } = useTranslation('common.module-manager')
  const query = useQuery(api.user.me.rawQueryOptions())

  if (query.error) throw query.error
  return (
    <div>
      <p>Signed in as {userData?.name}</p>
      <p>{t('shop.moveArea', { name: 'Calendar' })}</p>
      <p>Host: {getNativeRuntime()?.profile.origin}</p>
      <p>
        {query.data?.userData.name === 'Shared transport'
          ? 'Authenticated addon request passed'
          : 'Loading addon request'}
      </p>
    </div>
  )
}
