import { lazy } from 'react'

import { defineAddon } from '@monolith/federation'

import contract from './contract'

const { workspaceAPI, ...manifest } = defineAddon({
  routes: { '/': lazy(() => import('@')) },
  widgets: [() => import('@/widgets/LinkedDatabase')],
  contract
})

export default manifest

export { workspaceAPI }
