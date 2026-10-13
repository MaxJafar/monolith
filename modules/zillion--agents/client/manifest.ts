import { lazy } from 'react'

import { createForgeModule } from '@lifeforge/federation'

import contract from './contract'
import { bindAgentWorkspace } from './workspaceAPI'

const { forgeAPI: nativeAPI, ...manifest } = createForgeModule({
  routes: { '/': lazy(() => import('@')) },
  contract
})

export default manifest
const forgeAPI=bindAgentWorkspace(nativeAPI,contract)

export { forgeAPI }
