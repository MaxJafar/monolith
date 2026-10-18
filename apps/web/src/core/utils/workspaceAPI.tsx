import { contract, createApiClient, globalProxyRegistry } from '@monolith/api'

globalProxyRegistry.set(contract, {
  remoteId: '',
  apiHost: import.meta.env.VITE_API_HOST || 'https://localhost:3000'
})

const workspaceAPI = createApiClient(contract)

export default workspaceAPI
