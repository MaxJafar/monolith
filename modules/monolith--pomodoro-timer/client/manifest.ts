import { defineAddon } from '@monolith/federation'
import { lazy } from 'react'

import contract from './contract'

const { workspaceAPI, ...manifest } = defineAddon({
  provider: lazy(() => import('@/providers/PomodoroProviders')),
  widgets: [() => import('@/widgets/FocusWidget')],
  routes: {
    '/': lazy(() => import('@'))
  },
  contract
})

export default manifest

export { workspaceAPI }
