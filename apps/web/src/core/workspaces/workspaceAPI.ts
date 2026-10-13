import { createForgeProxy, globalProxyRegistry } from '@lifeforge/api'

import contract from '../../../../../modules/zillion--databases/client/contract'

globalProxyRegistry.set(contract, {
  remoteId: '695849793876b1af20bbfe4e0682c59d264ed3c2f3024e6ec010888f59efb038',
  apiHost: import.meta.env.VITE_API_HOST || 'http://localhost:3636'
})

export const workspaceAPI = createForgeProxy(contract)
