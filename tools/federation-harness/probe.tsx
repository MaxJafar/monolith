import { useQuery } from '@tanstack/react-query'
import { useQueryState } from 'nuqs'
import { renderToStaticMarkup } from 'react-dom/server'
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
import { ModalProvider, useCanvasWidgets } from '@monolith/ui'

export const shared = {
  AuthContext,
  getNativeRuntime,
  getI18n,
  ModalProvider,
  useCanvasWidgets,
  ModuleMetadataProvider
}
const api = createApiClient(contract)

export default function Probe() {
  const { userData } = useAuth()
  const { t } = useTranslation('common.module-manager')
  const query = useQuery(api.user.me.rawQueryOptions())
  const [filter, setFilter] = useQueryState('filter', { defaultValue: 'all' })
  const { actions } = useCanvasWidgets()

  if (query.error) throw query.error
  return (
    <div>
      <p>Signed in as {userData?.name}</p>
      <p>{t('shop.moveArea', { name: 'Calendar' })}</p>
      <p>Host: {getNativeRuntime()?.profile.origin}</p>
      <p>Widget action: {actions?.[0]?.title}</p>
      <p>
        {renderToStaticMarkup(<span>Addon export</span>) ===
        '<span>Addon export</span>'
          ? 'Shared static renderer passed'
          : 'Shared static renderer failed'}
      </p>
      <button onClick={() => void setFilter('active')}>Filter: {filter}</button>
      <p>
        {query.data?.userData.name === 'Shared transport'
          ? 'Authenticated addon request passed'
          : 'Loading addon request'}
      </p>
    </div>
  )
}
