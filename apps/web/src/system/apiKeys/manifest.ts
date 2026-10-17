import { lazy } from 'react'

import type { ModuleGroup } from '@monolith/configs'

export default {
  routes: {
    '/': lazy(() => import('.'))
  },
  name: 'api-keys',
  icon: 'tabler:key',
  category: 'Settings',
  APIKeyAccess: {}
} satisfies ModuleGroup['items'][number]
