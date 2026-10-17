import { lazy } from 'react'

import type { ModuleGroup } from '@monolith/configs'

export default {
  routes: {
    '/': lazy(() => import('.'))
  },
  name: 'dashboard',
  icon: 'tabler:dashboard',
  category: '<START>',
  APIKeyAccess: {}
} satisfies ModuleGroup['items'][number]
