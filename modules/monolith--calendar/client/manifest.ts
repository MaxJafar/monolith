import { lazy } from 'react'

import { defineAddon } from '@monolith/federation'

import contract from './contract'

const { workspaceAPI, ...manifest } = defineAddon({
  routes: {
    '/': lazy(() => import('@'))
  },
  widgets: [
    () => import('@/widgets/MiniCalendar'),
    () => import('@/widgets/TodaysEvent')
  ],
  contract
})

export default manifest

export { workspaceAPI }
