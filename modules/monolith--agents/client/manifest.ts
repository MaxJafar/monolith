import { lazy } from 'react'

import { defineAddon } from '@monolith/federation'

import contract from './contract'
import { bindAgentWorkspace } from './workspaceAPI'

const { workspaceAPI: nativeAPI, ...manifest } = defineAddon({
  routes: { '/': lazy(() => import('@')) },
  contract
})

export default manifest
const workspaceAPI=bindAgentWorkspace(nativeAPI,contract)

export { workspaceAPI }
