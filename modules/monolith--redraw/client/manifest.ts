import { defineAddon } from '@monolith/federation'
import { registerIconCollection } from '@monolith/ui'
import { lazy } from 'react'

import contract from './contract'
import icons from './icons.json'

// Keep the drawing tools available even when the host's icon cache is older.
registerIconCollection(icons)

const { workspaceAPI, ...manifest } = defineAddon({
  routes: {
    '/': lazy(() => import('./src')),
    '/:projectId': lazy(() => import('./src'))
  },
  canvas: false,
  contract
})

export default manifest

export { workspaceAPI }
