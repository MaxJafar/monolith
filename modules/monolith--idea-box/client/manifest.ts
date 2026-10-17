import { defineAddon } from '@monolith/federation'
import { lazy } from 'react'

import contract from './contract'

const { workspaceAPI, ...manifest } = defineAddon({
  widgets: [() => import('@/widgets/IdeaCaptureWidget')],
  routes: {
    '/': lazy(() => import('@/pages/Containers')),
    '/:id/*': lazy(() => import('@/pages/Ideas'))
  },
  contract
})

export default manifest

export { workspaceAPI }
