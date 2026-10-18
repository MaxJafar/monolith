import { lazy } from 'react'

import { defineAddon } from '@monolith/federation'

import contract from './contract'

const { workspaceAPI, ...manifest } = defineAddon({
  widgets: [() => import('@/widgets/FlashcardWidget')],
  routes: { '/': lazy(() => import('@')) },
  contract
})

export default manifest

export { workspaceAPI }
