import { defineAddon } from '@monolith/federation'
import { lazy } from 'react'

import contract from './contract'

const { workspaceAPI, ...manifest } = defineAddon({
  widgets: [() => import('@/widgets/AchievementWidget')],
  routes: {
    '/': lazy(() => import('@'))
  },
  contract
})

export default manifest

export { workspaceAPI }
