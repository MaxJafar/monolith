import { lazy } from 'react'

import type { ModuleGroup } from '@monolith/configs'

export default {
  routes: {
    '/': lazy(() => import('./index'))
  },
  name: 'documentation',
  displayName: 'Documentation',
  version: '1.0.0',
  author: 'Monolith contributors',
  description: 'Documentation',
  icon: 'tabler:info-circle',
  category: '<END>',
  APIKeyAccess: {}
} as ModuleGroup['items'][number]
